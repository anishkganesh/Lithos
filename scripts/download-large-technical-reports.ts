import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const FACTSET_USERNAME = process.env.FACTSET_USERNAME || 'LITHOS-2220379'
const FACTSET_API_KEY = process.env.FACTSET_API_KEY || '3gagnQkTnnEWmNwlRoPzSs9A5M38qbag5WDyLfaI'
const FACTSET_API_BASE = 'https://api.factset.com/content/global-filings/v2'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// List of major mining companies to search for
const MINING_COMPANIES = [
  { ticker: 'IVN', name: 'Ivanhoe Mines' },
  { ticker: 'FM', name: 'First Quantum Minerals' },
  { ticker: 'LUN', name: 'Lundin Mining' },
  { ticker: 'TECK.B', name: 'Teck Resources' },
  { ticker: 'HBM', name: 'Hudbay Minerals' },
  { ticker: 'NG', name: 'NovaGold Resources' },
  { ticker: 'ABX', name: 'Barrick Gold' },
  { ticker: 'NEM', name: 'Newmont Corporation' },
]

interface FactSetDocument {
  document_id: string
  headline: string
  filing_date: string
  form_type: string
  company_ticker: string
  file_url?: string
}

async function searchFactSetDocuments(ticker: string): Promise<FactSetDocument[]> {
  const auth = `Basic ${Buffer.from(`${FACTSET_USERNAME}:${FACTSET_API_KEY}`).toString('base64')}`

  const searchParams = new URLSearchParams({
    ticker,
    category: 'SEDARFilings',
    'meta.form_type': '43-101F1,NI43-101',
    _limit: '10',
    _sort: '-filing_date',
  })

  console.log(`🔍 Searching FactSet for ${ticker}...`)

  try {
    const response = await fetch(`${FACTSET_API_BASE}/search?${searchParams}`, {
      headers: {
        Authorization: auth,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`Failed to search FactSet: ${response.status}`)
      return []
    }

    const data = await response.json()
    const documents = data.data || []

    console.log(`  Found ${documents.length} documents for ${ticker}`)

    // Filter for large technical reports (typically 43-101 technical reports)
    const technicalReports = documents.filter((doc: any) => {
      const headline = doc.headline?.toLowerCase() || ''
      return (
        headline.includes('technical report') ||
        headline.includes('43-101') ||
        headline.includes('ni 43-101') ||
        headline.includes('feasibility') ||
        headline.includes('pea') ||
        headline.includes('preliminary economic assessment')
      )
    })

    console.log(`  ✅ ${technicalReports.length} technical reports found`)

    return technicalReports.map((doc: any) => ({
      document_id: doc.id,
      headline: doc.headline,
      filing_date: doc.filing_date,
      form_type: doc.meta?.form_type || 'NI 43-101',
      company_ticker: ticker,
      file_url: doc.file_url,
    }))
  } catch (error) {
    console.error(`Error searching FactSet for ${ticker}:`, error)
    return []
  }
}

async function downloadDocument(doc: FactSetDocument, company: string): Promise<Buffer | null> {
  const auth = `Basic ${Buffer.from(`${FACTSET_USERNAME}:${FACTSET_API_KEY}`).toString('base64')}`

  // Get download URL from document ID
  const downloadUrl = `${FACTSET_API_BASE}/download/${doc.document_id}`

  console.log(`  📥 Downloading: ${doc.headline.substring(0, 60)}...`)

  try {
    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: auth,
      },
    })

    if (!response.ok) {
      console.error(`    Failed to download: ${response.status}`)
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    console.log(`    ✅ Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)

    return buffer
  } catch (error) {
    console.error(`    Error downloading document:`, error)
    return null
  }
}

async function uploadToSupabase(
  buffer: Buffer,
  company: string,
  doc: FactSetDocument
): Promise<string | null> {
  const fileName = `${company}_${doc.document_id}.pdf`
  const filePath = `${company}/${fileName}`

  console.log(`  ☁️  Uploading to Supabase: ${filePath}`)

  try {
    const { data, error } = await supabase.storage
      .from('factset-documents')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (error) {
      console.error(`    Failed to upload:`, error)
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('factset-documents').getPublicUrl(filePath)

    console.log(`    ✅ Uploaded successfully`)

    return publicUrl
  } catch (error) {
    console.error(`    Error uploading to Supabase:`, error)
    return null
  }
}

async function saveProjectToDatabase(
  company: { ticker: string; name: string },
  doc: FactSetDocument,
  pdfUrl: string
) {
  console.log(`  💾 Saving to projects table...`)

  // Extract project name from headline
  const projectName = doc.headline.split('-')[0].trim()

  const projectData = {
    name: projectName,
    company: company.name,
    ticker: company.ticker,
    urls: [pdfUrl],
    description: doc.headline,
    stage: 'Feasibility',
    status: 'Active',
    technical_report_url: pdfUrl,
    report_date: doc.filing_date,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('projects').insert([projectData]).select()

  if (error) {
    console.error(`    Failed to save project:`, error)
    return null
  }

  console.log(`    ✅ Project saved with ID: ${data[0].id}`)
  return data[0]
}

async function main() {
  console.log('🚀 Starting FactSet Technical Report Download...\n')

  for (const company of MINING_COMPANIES.slice(0, 3)) {
    // Process first 3 companies
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📊 Processing ${company.name} (${company.ticker})`)
    console.log('='.repeat(60))

    const documents = await searchFactSetDocuments(company.ticker)

    if (documents.length === 0) {
      console.log(`  ⚠️  No technical reports found`)
      continue
    }

    // Download and upload first 2 reports per company
    for (const doc of documents.slice(0, 2)) {
      console.log(`\n  📄 ${doc.headline}`)
      console.log(`     Filing Date: ${doc.filing_date}`)

      const buffer = await downloadDocument(doc, company.ticker)

      if (!buffer) {
        console.log(`    ⚠️  Skipping due to download error`)
        continue
      }

      const pdfUrl = await uploadToSupabase(buffer, company.ticker, doc)

      if (!pdfUrl) {
        console.log(`    ⚠️  Skipping due to upload error`)
        continue
      }

      await saveProjectToDatabase(company, doc, pdfUrl)

      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log(`\n\n✅ Download complete!`)
  console.log(`Check your Supabase projects table for new entries.`)
}

main()
