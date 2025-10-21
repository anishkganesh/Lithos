import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import {
  MINING_DATA_PATTERNS,
  findPagesWithPattern,
  findKeyPages,
  extractContext,
} from '@/lib/pdf-extraction-utils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ExtractedData {
  commodities?: { text: string; page: number; value?: string[] }
  location?: { text: string; page: number; value?: string }
  npv?: { value: number; text: string; page: number }
  irr?: { value: number; text: string; page: number }
  capex?: { value: number; text: string; page: number }
  opex?: { value: number; text: string; page: number }
  resources?: { text: string; page: number }
  reserves?: { text: string; page: number }
  production?: { text: string; page: number }
}

// Helper function to find text coordinates and convert to viewer coordinates
// PDF.js coordinates: origin at bottom-left, y-axis goes up
// react-pdf-viewer coordinates: origin at top-left, y-axis goes down, uses percentages
function findTextCoordinatesInPage(
  searchText: string,
  page: any,
  pageHeight: number,
  pageWidth: number
): { left: number; top: number; width: number; height: number } | null {
  if (!page || !page.textItems) {
    console.log('⚠️ No page or textItems provided')
    return null
  }

  const textItems = page.textItems

  // Build full page text to find the search text
  const fullText = textItems.map((item: any) => item.str || '').join(' ')
  const searchLower = searchText.toLowerCase().trim()
  const fullTextLower = fullText.toLowerCase()

  // Try to find the exact search text in the page
  const index = fullTextLower.indexOf(searchLower)
  if (index === -1) {
    // Fallback: try to find key words
    const searchWords = searchLower.split(/\s+/).filter((w: string) => w.length > 3)
    const foundWords = searchWords.filter((word: string) => fullTextLower.includes(word))

    if (foundWords.length === 0) {
      console.log(`⚠️ Could not find any text matching "${searchText.substring(0, 50)}..."`)
      return null
    }

    // Use first significant word found
    const wordIndex = fullTextLower.indexOf(foundWords[0])
    if (wordIndex === -1) return null

    console.log(`📝 Found word "${foundWords[0]}" in page text`)
    return findCoordinatesForTextRange(textItems, pageHeight, pageWidth, wordIndex, wordIndex + foundWords[0].length, fullText)
  }

  console.log(`📝 Found exact text at index ${index}`)
  return findCoordinatesForTextRange(textItems, pageHeight, pageWidth, index, index + searchLower.length, fullText)
}

function findCoordinatesForTextRange(
  textItems: any[],
  pageHeight: number,
  pageWidth: number,
  startIndex: number,
  endIndex: number,
  fullText: string
): { left: number; top: number; width: number; height: number } | null {
  // Find which text items contain the target range
  let currentIndex = 0
  const matchedItems: any[] = []

  for (const item of textItems) {
    const itemText = item.str || ''
    const itemEnd = currentIndex + itemText.length + 1 // +1 for space

    // Check if this item overlaps with our search range
    if (itemEnd > startIndex && currentIndex < endIndex) {
      matchedItems.push(item)
    }

    currentIndex = itemEnd
    if (currentIndex > endIndex) break
  }

  if (matchedItems.length === 0) {
    console.log('⚠️ No matching text items found in range')
    return null
  }

  console.log(`📍 Found ${matchedItems.length} text items in range`)

  // Calculate bounding box from text items
  // transform array: [scaleX, skewX, skewY, scaleY, translateX, translateY]
  const bounds = matchedItems.map((item: any) => {
    const transform = item.transform || [1, 0, 0, 1, 0, 0]
    const x = transform[4]  // translateX (left position)
    const y = transform[5]  // translateY (bottom position)

    // Calculate width and height from transform matrix and text
    const scaleX = transform[0]
    const scaleY = transform[3]
    const fontSize = Math.abs(scaleY)

    // Estimate width from text length if not provided
    const w = item.width || (item.str?.length || 0) * fontSize * 0.5
    const h = fontSize

    return { x, y, w, h }
  })

  // Get bounding box
  const minX = Math.min(...bounds.map(b => b.x))
  const maxX = Math.max(...bounds.map(b => b.x + b.w))
  const minY = Math.min(...bounds.map(b => b.y - b.h)) // Bottom minus height
  const maxY = Math.max(...bounds.map(b => b.y))       // Top

  const pdfWidth = maxX - minX
  const pdfHeight = maxY - minY

  // Add padding for better visibility (5% on each side)
  const padding = 0.05
  const paddedMinX = Math.max(0, minX - pdfWidth * padding)
  const paddedMaxX = Math.min(pageWidth, maxX + pdfWidth * padding)
  const paddedMinY = Math.max(0, minY - pdfHeight * padding)
  const paddedMaxY = Math.min(pageHeight, maxY + pdfHeight * padding)

  // Convert PDF coordinates (bottom-left origin) to viewer coordinates (top-left origin, percentages)
  const viewerTop = ((pageHeight - paddedMaxY) / pageHeight) * 100
  const viewerLeft = (paddedMinX / pageWidth) * 100
  const viewerWidth = ((paddedMaxX - paddedMinX) / pageWidth) * 100
  const viewerHeight = ((paddedMaxY - paddedMinY) / pageHeight) * 100

  const result = {
    left: Math.max(0, Math.min(100, viewerLeft)),
    top: Math.max(0, Math.min(100, viewerTop)),
    width: Math.max(1, Math.min(100 - viewerLeft, viewerWidth)),
    height: Math.max(1, Math.min(100 - viewerTop, viewerHeight)),
  }

  console.log(`📐 Calculated coordinates:`, result)
  return result
}

export async function POST(req: NextRequest) {
  try {
    const { pdfUrl, projectId } = await req.json()

    if (!pdfUrl) {
      return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 })
    }

    console.log('📄 Extracting key data from PDF:', pdfUrl)

    // Download PDF content
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      throw new Error('Failed to fetch PDF')
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Extract text page-by-page from PDF
    console.log('📖 Extracting text from PDF...')
    const pdf = (await import('pdf-parse')).default

    // Custom page rendering to preserve page numbers and coordinates
    let currentPage = 0
    const pages: {
      pageNumber: number
      text: string
      textItems?: any[]
      viewport?: { height: number; width: number }
    }[] = []

    const pdfData = await pdf(Buffer.from(pdfBuffer), {
      pagerender: (pageData: any) => {
        currentPage++
        return pageData.getTextContent().then((textContent: any) => {
          const pageText = textContent.items.map((item: any) => item.str).join(' ')
          const viewport = pageData.getViewport({ scale: 1.0 })

          pages.push({
            pageNumber: currentPage,
            text: pageText,
            textItems: textContent.items,
            viewport: { height: viewport.height, width: viewport.width },
          })
          return pageText
        })
      },
    })

    const numPages = pdfData.numpages
    console.log(`✅ Extracted ${numPages} pages`)

    // Step 1: Find pages with specific patterns using regex
    console.log('🔍 Searching for key data patterns...')
    const npvPages = findPagesWithPattern(pages, MINING_DATA_PATTERNS.npv)
    const irrPages = findPagesWithPattern(pages, MINING_DATA_PATTERNS.irr)
    const capexPages = findPagesWithPattern(pages, MINING_DATA_PATTERNS.capex)
    const opexPages = findPagesWithPattern(pages, MINING_DATA_PATTERNS.opex)
    const resourcePages = findPagesWithPattern(pages, MINING_DATA_PATTERNS.resources)
    const reservePages = findPagesWithPattern(pages, MINING_DATA_PATTERNS.reserves)
    const productionPages = findPagesWithPattern(pages, MINING_DATA_PATTERNS.production)
    const commodityPages = findPagesWithPattern(pages, MINING_DATA_PATTERNS.commodities)

    // Step 2: Find key sections
    const keyPages = findKeyPages(pages)

    console.log(`📊 Found patterns:`)
    console.log(`  - NPV: ${npvPages.length} pages`)
    console.log(`  - IRR: ${irrPages.length} pages`)
    console.log(`  - CAPEX: ${capexPages.length} pages`)
    console.log(`  - Resources: ${resourcePages.length} pages`)
    console.log(`  - Reserves: ${reservePages.length} pages`)
    console.log(`  - Executive Summary: ${keyPages.executiveSummary.length} pages`)

    // Step 3: Prepare context for AI extraction (only relevant pages)
    const relevantPages = new Set<number>()

    ;[
      ...npvPages,
      ...irrPages,
      ...capexPages,
      ...opexPages,
      ...resourcePages,
      ...reservePages,
      ...productionPages,
      ...keyPages.executiveSummary,
      ...keyPages.financialMetrics,
    ].forEach(match => relevantPages.add(match.pageNumber))

    // Limit to top 20 most relevant pages
    const topPages = Array.from(relevantPages)
      .sort((a, b) => a - b)
      .slice(0, 20)
      .map(pageNum => pages.find(p => p.pageNumber === pageNum)!)
      .filter(Boolean)

    const contextText = topPages
      .map(p => `[Page ${p.pageNumber}]\n${p.text.substring(0, 2000)}`)
      .join('\n\n---\n\n')

    console.log(`🤖 Sending ${topPages.length} relevant pages to AI for precise extraction...`)

    // Step 4: Use AI for precise extraction from relevant pages only
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting key financial and technical data from mining technical reports (NI 43-101, feasibility studies).

Extract the following data points from the provided pages and return in JSON format:
- npv: {value: number in millions, text: exact quote, page: page number}
- irr: {value: number as percentage, text: exact quote, page: page number}
- capex: {value: number in millions, text: exact quote, page: page number}
- opex: {value: number, text: exact quote, page: page number}
- resources: {text: summary quote, page: page number}
- reserves: {text: summary quote, page: page number}
- production: {text: summary quote, page: page number}
- commodities: {text: quote, page: page number, value: array of metals}
- location: {text: quote, page: page number, value: location string}

For each value:
1. Extract the EXACT text snippet containing it (10-50 words)
2. Note the specific [Page X] number where it was found
3. Extract the numeric value where applicable

Return null for values not found. Be precise with page numbers.`,
        },
        {
          role: 'user',
          content: `Extract key mining project data from these pages:\n\n${contextText.substring(0, 100000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const extractedDataStr = completion.choices[0]?.message?.content
    if (!extractedDataStr) {
      throw new Error('No response from OpenAI')
    }

    const extractedData: ExtractedData = JSON.parse(extractedDataStr)
    console.log('✅ Extracted data:', Object.keys(extractedData))

    // Step 5: Convert extracted data to highlights format with exact pages
    const highlights: any[] = []

    // Helper to create highlight with proper coordinate conversion
    const createHighlight = (
      dataType: string,
      text: string,
      pageNum: number,
      value?: any
    ) => {
      const page = pages.find(p => p.pageNumber === pageNum)
      let coords = null

      if (page && page.viewport && page.textItems) {
        coords = findTextCoordinatesInPage(
          text,
          page,
          page.viewport.height,
          page.viewport.width
        )
        if (coords) {
          console.log(`✅ Found coordinates for ${dataType} on page ${pageNum}:`, coords)
        } else {
          console.log(`⚠️  Could not find text for ${dataType} on page ${pageNum}`)
        }
      }

      return {
        id: `auto-${dataType}-${Date.now()}-${Math.random()}`,
        content: text,
        quote: text,
        highlightAreas: coords ? [{ pageIndex: pageNum - 1, ...coords }] : [],
        dataType,
        value,
        page: pageNum,
      }
    }

    if (extractedData.npv && extractedData.npv.text) {
      highlights.push(
        createHighlight('npv', extractedData.npv.text, extractedData.npv.page, extractedData.npv.value)
      )
    }

    if (extractedData.irr && extractedData.irr.text) {
      highlights.push(
        createHighlight('irr', extractedData.irr.text, extractedData.irr.page, extractedData.irr.value)
      )
    }

    if (extractedData.capex && extractedData.capex.text) {
      highlights.push(
        createHighlight('capex', extractedData.capex.text, extractedData.capex.page, extractedData.capex.value)
      )
    }

    if (extractedData.resources && extractedData.resources.text) {
      highlights.push(
        createHighlight('resources', extractedData.resources.text, extractedData.resources.page)
      )
    }

    if (extractedData.reserves && extractedData.reserves.text) {
      highlights.push(
        createHighlight('reserves', extractedData.reserves.text, extractedData.reserves.page)
      )
    }

    console.log(`💾 Saving ${highlights.length} highlights to database...`)

    // Save to database - check if exists first, then update or insert
    const { data: existing } = await supabase
      .from('pdf_highlights')
      .select('id')
      .eq('document_url', pdfUrl)
      .single()

    let savedHighlights
    let saveError

    const highlightData = {
      document_url: pdfUrl,
      project_id: projectId,
      highlight_data: {
        highlights,
        extractedData,
        extractedAt: new Date().toISOString(),
        numPages,
        relevantPages: topPages.map(p => p.pageNumber),
      },
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      // Update existing record
      const result = await supabase
        .from('pdf_highlights')
        .update(highlightData)
        .eq('document_url', pdfUrl)
        .select()
      savedHighlights = result.data
      saveError = result.error
    } else {
      // Insert new record
      const result = await supabase
        .from('pdf_highlights')
        .insert(highlightData)
        .select()
      savedHighlights = result.data
      saveError = result.error
    }

    if (saveError) {
      console.error('Error saving highlights:', saveError)
    }

    console.log('✅ Extraction complete!')

    // Step 6: Update projects table with extracted financial data if projectId is provided
    let projectUpdated = false
    if (projectId && extractedData) {
      console.log('💾 Updating project with extracted financial data...')
      console.log('📊 Project ID:', projectId)
      console.log('📊 Extracted data summary:', {
        hasNPV: !!extractedData.npv?.value,
        npvValue: extractedData.npv?.value,
        hasIRR: !!extractedData.irr?.value,
        irrValue: extractedData.irr?.value,
        hasCAPEX: !!extractedData.capex?.value,
        capexValue: extractedData.capex?.value,
        hasLocation: !!extractedData.location?.value,
        hasCommodities: !!extractedData.commodities?.value,
      })

      const projectUpdateData: any = {
        updated_at: new Date().toISOString(),
        financial_metrics_updated_at: new Date().toISOString(),
      }

      // Add NPV if extracted (use simple column name that frontend expects)
      if (extractedData.npv?.value) {
        projectUpdateData.npv = extractedData.npv.value
        console.log('  ✓ Adding NPV:', extractedData.npv.value)
      }

      // Add IRR if extracted
      if (extractedData.irr?.value) {
        projectUpdateData.irr = extractedData.irr.value
        console.log('  ✓ Adding IRR:', extractedData.irr.value)
      }

      // Add CAPEX if extracted
      if (extractedData.capex?.value) {
        projectUpdateData.capex = extractedData.capex.value
        console.log('  ✓ Adding CAPEX:', extractedData.capex.value)
      }

      // Add location if extracted
      if (extractedData.location?.value) {
        projectUpdateData.location = extractedData.location.value
        console.log('  ✓ Adding location:', extractedData.location.value)
      }

      // Add commodities if extracted
      if (extractedData.commodities?.value && Array.isArray(extractedData.commodities.value)) {
        projectUpdateData.commodities = extractedData.commodities.value
        console.log('  ✓ Adding commodities:', extractedData.commodities.value)
      }

      console.log('📝 Updating with data:', projectUpdateData)

      // Update project in database
      const { data: updatedProject, error: projectError } = await supabase
        .from('projects')
        .update(projectUpdateData)
        .eq('id', projectId)
        .select()

      if (projectError) {
        console.error('❌ Error updating project:', projectError)
      } else {
        console.log('✅ Project updated successfully!')
        console.log('✅ Updated project data:', updatedProject)
        projectUpdated = true
      }
    } else {
      console.log('⚠️ Skipping project update - projectId:', projectId, 'extractedData:', !!extractedData)
    }

    return NextResponse.json({
      success: true,
      highlights,
      extractedData,
      numPages,
      relevantPages: topPages.map(p => p.pageNumber),
      saved: !!savedHighlights,
      projectUpdated,
    })
  } catch (error: any) {
    console.error('❌ Error extracting highlights:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract highlights' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pdfUrl = searchParams.get('pdfUrl')

    if (!pdfUrl) {
      return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 })
    }

    // Fetch existing highlights
    const { data: highlights, error } = await supabase
      .from('pdf_highlights')
      .select('*')
      .eq('document_url', pdfUrl)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({
      highlights: highlights?.highlight_data || null,
    })
  } catch (error: any) {
    console.error('Error fetching highlights:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch highlights' },
      { status: 500 }
    )
  }
}
