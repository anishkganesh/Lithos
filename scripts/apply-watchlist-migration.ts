import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('Applying watchlist migration...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/006_create_user_project_watchlist.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('\nMigration SQL:')
    console.log(migrationSQL)

    // Note: We can't directly execute DDL statements through the Supabase client
    // The migration needs to be applied through the Supabase dashboard or CLI
    console.log('\nNote: DDL statements cannot be executed through the client.')
    console.log('The migration should be applied through the Supabase dashboard.')

    // Test if watchlist columns exist
    console.log('\nTesting watchlist columns...')

    // First, let's just try to select with service role key
    const { data: testSelect, error: selectError } = await supabase
      .from('projects')
      .select('id, project_name, watchlist, watchlisted_at')
      .limit(1)

    if (selectError) {
      console.error('Error selecting with watchlist columns:', selectError)
    } else {
      console.log('Watchlist columns are accessible!')
      console.log('Sample data:', testSelect)
    }

    // Try to insert a test project with service role key
    console.log('\nInserting test project...')
    const { data: insertData, error: insertError } = await supabase
      .from('projects')
      .insert({
        project_name: 'Test Watchlist Project',
        company_name: 'Test Mining Corp',
        stage: 'Exploration',
        jurisdiction: 'Canada',
        watchlist: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting test project:', insertError)
    } else {
      console.log('Test project created:', insertData)

      // Now test updating watchlist
      console.log('\nTesting watchlist update...')
      const { data: updateData, error: updateError } = await supabase
        .from('projects')
        .update({
          watchlist: true,
          watchlisted_at: new Date().toISOString()
        })
        .eq('id', insertData.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating watchlist:', updateError)
      } else {
        console.log('Watchlist updated successfully:', updateData)
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

applyMigration()