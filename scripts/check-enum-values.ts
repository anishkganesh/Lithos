#!/usr/bin/env npx tsx
/**
 * Check valid enum values in the database
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc'
);

async function checkEnums() {
  console.log('Testing stage enum values...\n');

  const testStages = [
    'exploration',
    'Exploration',
    'development',
    'Development',
    'feasibility',
    'Feasibility',
    'prefeasibility',
    'Prefeasibility',
    'production',
    'Production',
    'construction',
    'Construction',
    'permitting',
    'Permitting',
    'closed',
    'Closed',
    'care_maintenance',
    'Care Maintenance'
  ];

  for (const stage of testStages) {
    const testProject = {
      project_name: `Test_${stage}_${Date.now()}`,
      company_name: 'Test Company',
      primary_commodity: 'Gold',
      stage: stage,
      data_source: 'TEST'
    };

    const { error } = await supabase
      .from('projects')
      .insert(testProject);

    if (error) {
      console.log(`  ❌ "${stage}" - ${error.message.substring(0, 50)}...`);
    } else {
      console.log(`  ✅ "${stage}" - Valid`);
      // Clean up test data
      await supabase
        .from('projects')
        .delete()
        .eq('project_name', testProject.project_name);
    }
  }

  // Also check what's already in the database
  console.log('\n\nExisting stage values in database:');
  const { data: stageData } = await supabase
    .from('projects')
    .select('stage')
    .not('stage', 'is', null)
    .limit(50);

  const uniqueStages = [...new Set(stageData?.map(p => p.stage) || [])];
  uniqueStages.sort().forEach(s => console.log(`  - ${s}`));
}

checkEnums().catch(console.error);