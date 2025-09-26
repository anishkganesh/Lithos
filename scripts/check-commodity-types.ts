#!/usr/bin/env npx tsx
/**
 * Check valid commodity types in the database
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc'
);

async function checkTypes() {
  console.log('Checking existing commodity types in projects table...\n');

  // Get distinct commodity values
  const { data, error } = await supabase
    .from('projects')
    .select('primary_commodity')
    .not('primary_commodity', 'is', null)
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const uniqueCommodities = [...new Set(data?.map(p => p.primary_commodity) || [])];
  console.log('Found commodity types:');
  uniqueCommodities.sort().forEach(c => console.log(`  - ${c}`));

  // Try to query with a known commodity
  console.log('\nTesting insert with different commodity values...');

  const testCommodities = [
    'lithium',
    'Lithium',
    'copper',
    'Copper',
    'gold',
    'Gold',
    'uranium',
    'Uranium',
    'rare_earth',
    'rare earth',
    'Rare Earth',
    'rare_earths',
    'Rare Earths',
    'potash',
    'Potash',
    'other',
    'Other'
  ];

  for (const commodity of testCommodities) {
    const testProject = {
      project_name: `Test_${commodity}_${Date.now()}`,
      company_name: 'Test Company',
      primary_commodity: commodity,
      data_source: 'TEST'
    };

    const { error: insertError } = await supabase
      .from('projects')
      .insert(testProject);

    if (insertError) {
      console.log(`  ❌ "${commodity}" - ${insertError.message.substring(0, 50)}...`);
    } else {
      console.log(`  ✅ "${commodity}" - Valid`);
      // Clean up test data
      await supabase
        .from('projects')
        .delete()
        .eq('project_name', testProject.project_name);
    }
  }
}

checkTypes().catch(console.error);