import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

console.log('Testing Supabase watchlist functionality...')
console.log('URL:', supabaseUrl)
console.log('Key exists:', !!supabaseAnonKey)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testWatchlist() {
  try {
    // 1. First, fetch a few projects to test with
    console.log('\n1. Fetching projects...')
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .limit(3)

    if (fetchError) {
      console.error('Error fetching projects:', fetchError)
      return
    }

    console.log(`Found ${projects?.length || 0} projects:`)
    if (projects && projects.length > 0) {
      console.log('First project columns:', Object.keys(projects[0]))
      projects.forEach(p => {
        console.log(`  - ID: ${p.id}, Name: ${p.project_name}, Watchlist: ${p.watchlist}`)
      })
    }

    if (!projects || projects.length === 0) {
      console.log('No projects found. Creating a test project...')

      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert([{
          project_name: 'Test Mining Project',
          company_name: 'Test Company',
          stage: 'Exploration',
          watchlist: false
        }])
        .select()
        .single()

      if (createError) {
        console.error('Error creating test project:', createError)
        return
      }

      console.log('Created test project:', newProject)
      projects?.push(newProject)
    }

    // 2. Test updating watchlist status
    const testProject = projects[0]
    console.log(`\n2. Testing watchlist update for project ID: ${testProject.id}`)
    console.log(`   Current watchlist status: ${testProject.watchlist}`)

    const newWatchlistStatus = !testProject.watchlist
    console.log(`   Updating to: ${newWatchlistStatus}`)

    const { data: updateData, error: updateError } = await supabase
      .from('projects')
      .update({
        watchlist: newWatchlistStatus,
        watchlisted_at: newWatchlistStatus ? new Date().toISOString() : null
      })
      .eq('id', testProject.id)
      .select()

    if (updateError) {
      console.error('Error updating watchlist:', updateError)
      console.error('Full error details:', JSON.stringify(updateError, null, 2))
      return
    }

    console.log('   Update successful!')
    console.log('   Updated data:', updateData)

    // 3. Verify the update
    console.log('\n3. Verifying update...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('projects')
      .select('id, project_name, watchlist, watchlisted_at')
      .eq('id', testProject.id)
      .single()

    if (verifyError) {
      console.error('Error verifying update:', verifyError)
      return
    }

    console.log('   Verified data:')
    console.log(`   - ID: ${verifyData.id}`)
    console.log(`   - Name: ${verifyData.project_name}`)
    console.log(`   - Watchlist: ${verifyData.watchlist}`)
    console.log(`   - Watchlisted at: ${verifyData.watchlisted_at}`)

    // 4. Test fetching only watchlisted projects
    console.log('\n4. Fetching watchlisted projects...')
    const { data: watchlisted, error: watchlistError } = await supabase
      .from('projects')
      .select('id, project_name, watchlist')
      .eq('watchlist', true)

    if (watchlistError) {
      console.error('Error fetching watchlisted projects:', watchlistError)
      return
    }

    console.log(`Found ${watchlisted?.length || 0} watchlisted projects`)

    console.log('\n✅ All tests completed successfully!')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testWatchlist()