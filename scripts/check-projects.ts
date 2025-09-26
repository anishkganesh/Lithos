#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkProjects() {
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log('Total projects in DB:', count);

  const { data: recentProjects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentProjects && recentProjects.length > 0) {
    console.log('\nRecent projects:');
    for (const project of recentProjects) {
      console.log(`- ${project.project_name} (${project.company_name}): NPV $${project.post_tax_npv_usd_m}M, IRR ${project.irr_percent}%`);
    }
  }
}

checkProjects();