import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('Checking database schema...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  try {
    // Try querying tables directly
    console.log('\nTrying to fetch from known tables...')

      // Try projects table
      console.log('\n1. Checking projects table...')
      const { data: projectsSample, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .limit(1)

      if (projectsError) {
        console.log('Projects table error:', projectsError.message)
      } else if (projectsSample && projectsSample.length > 0) {
        console.log('Projects table exists with columns:')
        console.log(Object.keys(projectsSample[0]).join(', '))
        console.log('\nSample row:')
        console.log(JSON.stringify(projectsSample[0], null, 2))
      } else {
        console.log('Projects table exists but is empty')

        // Try to get column info another way
        const { error: insertError } = await supabase
          .from('projects')
          .insert({})
          .select()

        if (insertError) {
          console.log('\nColumn requirements from insert error:')
          console.log(insertError.message)
        }
      }

      // Try mining_projects table
      console.log('\n2. Checking mining_projects table...')
      const { data: miningSample, error: miningError } = await supabase
        .from('mining_projects')
        .select('*')
        .limit(1)

      if (miningError) {
        console.log('Mining_projects table error:', miningError.message)
      } else if (miningSample && miningSample.length > 0) {
        console.log('Mining_projects table exists with columns:')
        console.log(Object.keys(miningSample[0]).join(', '))
      } else {
        console.log('Mining_projects table exists but is empty')
      }

      // Try project_data table
      console.log('\n3. Checking project_data table...')
      const { data: projectDataSample, error: projectDataError } = await supabase
        .from('project_data')
        .select('*')
        .limit(1)

      if (projectDataError) {
        console.log('Project_data table error:', projectDataError.message)
      } else if (projectDataSample && projectDataSample.length > 0) {
        console.log('Project_data table exists with columns:')
        console.log(Object.keys(projectDataSample[0]).join(', '))
      } else {
        console.log('Project_data table exists but is empty')
      }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

checkSchema()