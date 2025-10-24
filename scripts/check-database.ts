#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Checking database...\n')

  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('*')

  console.log('Companies:', companies?.length || 0)
  if (companies) {
    companies.forEach(c => console.log(`  - ${c.name} (${c.ticker_symbol})`))
  }

  console.log('\nProjects:', projects?.length || 0)
  if (projects) {
    projects.forEach(p => console.log(`  - ${p.name} (${p.urls?.length || 0} docs)`))
  }

  if (projectError) console.error('Project error:', projectError)
  if (companyError) console.error('Company error:', companyError)
}

main().catch(console.error)
