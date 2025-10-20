import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testPdfExtraction() {
  console.log('🧪 Testing PDF extraction with Lundin Mining documents...\n')

  // List documents in the factset-documents/LUN/ bucket
  const { data: files, error: listError } = await supabase.storage
    .from('factset-documents')
    .list('LUN', {
      limit: 100,
      offset: 0,
    })

  if (listError) {
    console.error('❌ Error listing files:', listError)
    return
  }

  console.log(`📁 Found ${files?.length || 0} documents in LUN folder:`)
  files?.forEach((file, idx) => {
    console.log(`  ${idx + 1}. ${file.name} (${Math.round(file.metadata?.size / 1024) || 0} KB)`)
  })

  if (!files || files.length === 0) {
    console.log('⚠️  No documents found. Please check the bucket.')
    return
  }

  // Find the largest PDF (likely the full technical report)
  const sortedFiles = files.sort((a, b) => (b.metadata?.size || 0) - (a.metadata?.size || 0))
  const largestPdf = sortedFiles[0].name
  const { data: urlData } = supabase.storage
    .from('factset-documents')
    .getPublicUrl(`LUN/${largestPdf}`)

  const pdfUrl = urlData.publicUrl
  console.log(`\n📄 Testing extraction on largest document: ${largestPdf}`)
  console.log(`   URL: ${pdfUrl}`)
  console.log(`   Size: ${Math.round((sortedFiles[0].metadata?.size || 0) / 1024 / 1024)} MB\n`)

  // Call the extraction API
  const response = await fetch('http://localhost:3001/api/pdf/extract-highlights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pdfUrl,
      projectId: null,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Extraction failed:', errorText)
    return
  }

  const result = await response.json()

  console.log('✅ Extraction complete!\n')
  console.log(`📊 Results:`)
  console.log(`  - Total pages: ${result.numPages}`)
  console.log(`  - Relevant pages found: ${result.relevantPages?.length || 0}`)
  console.log(`  - Highlights extracted: ${result.highlights?.length || 0}\n`)

  if (result.relevantPages && result.relevantPages.length > 0) {
    console.log(`🔍 Relevant pages: ${result.relevantPages.join(', ')}`)
  }

  if (result.highlights && result.highlights.length > 0) {
    console.log('\n📌 Extracted highlights:')
    result.highlights.forEach((highlight: any, idx: number) => {
      console.log(`\n  ${idx + 1}. ${highlight.dataType?.toUpperCase() || 'UNKNOWN'}`)
      console.log(`     Page: ${highlight.page}`)
      console.log(`     Value: ${highlight.value || 'N/A'}`)
      console.log(`     Quote: "${highlight.quote.substring(0, 100)}..."`)
    })
  }

  console.log('\n✅ Test complete!')
}

testPdfExtraction().catch(console.error)
