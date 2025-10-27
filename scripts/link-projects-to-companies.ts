import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface Project {
  id: string
  name: string
  description?: string
  company_id?: string | null
}

interface Company {
  id: string
  name: string
  ticker?: string
}

// Normalize company names for matching
function normalizeCompanyName(name: string): string {
  if (!name) return ''

  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\s+(limited|ltd\.?|corp\.?|corporation|inc\.?|incorporated|plc|llc|sa|nv|ag|ab|se|gmbh)$/gi, '')
    // Remove special characters except spaces
    .replace(/[^a-z0-9\s]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract company name from project description or name
function extractCompanyNameFromProject(project: Project): string[] {
  const potentialNames: string[] = []

  // Common patterns in mining projects:
  // "Project owned by Company Name"
  // "Company Name's Project"
  // "Project operated by Company Name"

  const text = `${project.name} ${project.description || ''}`.toLowerCase()

  // Pattern 1: "owned by XYZ" or "operated by XYZ"
  const ownedByMatch = text.match(/(?:owned|operated|developed)\s+by\s+([\w\s&]+?)(?:\.|,|;|\s+in\s+|\s+located|\s+is\s+|$)/i)
  if (ownedByMatch) {
    potentialNames.push(ownedByMatch[1].trim())
  }

  // Pattern 2: "XYZ's" possessive
  const possessiveMatch = text.match(/([\w\s&]+?)'s\s+/i)
  if (possessiveMatch) {
    potentialNames.push(possessiveMatch[1].trim())
  }

  // Pattern 3: Company name at start of project name (before " - " or " Mine" or " Project")
  const prefixMatch = project.name.match(/^([\w\s&]+?)(?:\s+-\s+|\s+mine|\s+project)/i)
  if (prefixMatch) {
    potentialNames.push(prefixMatch[1].trim())
  }

  return potentialNames
}

// Calculate similarity score between two strings (Levenshtein-ish)
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeCompanyName(str1)
  const normalized2 = normalizeCompanyName(str2)

  // Exact match
  if (normalized1 === normalized2) return 1.0

  // Check if one contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const shorterLength = Math.min(normalized1.length, normalized2.length)
    const longerLength = Math.max(normalized1.length, normalized2.length)
    return shorterLength / longerLength
  }

  // Word overlap
  const words1 = normalized1.split(' ')
  const words2 = normalized2.split(' ')
  const commonWords = words1.filter(word => words2.includes(word) && word.length > 2)
  const totalWords = Math.max(words1.length, words2.length)

  if (commonWords.length > 0) {
    return commonWords.length / totalWords
  }

  return 0
}

// Find best matching company for a project
function findBestMatchingCompany(project: Project, companies: Company[]): { company: Company, score: number } | null {
  let bestMatch: { company: Company, score: number } | null = null

  // Extract potential company names from project
  const potentialNames = extractCompanyNameFromProject(project)
  potentialNames.push(project.name) // Also try the project name itself

  for (const potentialName of potentialNames) {
    for (const company of companies) {
      // Try matching against company name
      let score = calculateSimilarity(potentialName, company.name)

      // Also try ticker if available
      if (company.ticker && potentialName.toLowerCase().includes(company.ticker.toLowerCase())) {
        score = Math.max(score, 0.8)
      }

      // Update best match if this is better
      if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { company, score }
      }
    }
  }

  return bestMatch
}

async function main() {
  console.log('🔗 Starting project-company linking process...\n')

  // Fetch all companies
  console.log('📊 Fetching companies...')
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, ticker')

  if (companiesError) {
    console.error('❌ Error fetching companies:', companiesError)
    return
  }

  console.log(`✅ Found ${companies.length} companies\n`)

  // Fetch all projects that don't have a company_id
  console.log('📊 Fetching projects without company links...')
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, description, company_id')
    .is('company_id', null)

  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError)
    return
  }

  console.log(`✅ Found ${projects.length} unlinked projects\n`)

  let linkedCount = 0
  let unlinkedCount = 0

  console.log('🔍 Matching projects to companies...\n')

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i]
    const progress = `[${i + 1}/${projects.length}]`

    console.log(`${progress} Processing: ${project.name}`)

    const match = findBestMatchingCompany(project, companies as Company[])

    if (match) {
      console.log(`  ✅ Matched to: ${match.company.name} (confidence: ${(match.score * 100).toFixed(0)}%)`)

      // Update project with company_id
      const { error: updateError } = await supabase
        .from('projects')
        .update({ company_id: match.company.id })
        .eq('id', project.id)

      if (updateError) {
        console.log(`  ❌ Error updating project: ${updateError.message}`)
      } else {
        linkedCount++
      }
    } else {
      console.log(`  ℹ️  No good match found`)
      unlinkedCount++
    }

    // Progress update every 10 projects
    if ((i + 1) % 10 === 0) {
      console.log(`\n📈 Progress: ${i + 1}/${projects.length} projects processed`)
      console.log(`   ✅ Linked: ${linkedCount}`)
      console.log(`   ℹ️  Unlinked: ${unlinkedCount}\n`)
    }
  }

  console.log('\n🎉 Linking process complete!')
  console.log(`\n📊 Final Statistics:`)
  console.log(`   Total projects processed: ${projects.length}`)
  console.log(`   ✅ Successfully linked: ${linkedCount}`)
  console.log(`   ℹ️  Unlinked (no match found): ${unlinkedCount}`)
  console.log(`   📈 Success rate: ${((linkedCount / projects.length) * 100).toFixed(1)}%`)
}

main().catch(console.error)
