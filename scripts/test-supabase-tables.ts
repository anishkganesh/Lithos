#!/usr/bin/env npx tsx

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testConnection() {
  console.log('🔌 Testing Supabase connection...\n');

  // Test projects table
  console.log('📊 Testing projects table:');
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .limit(1);

  if (projectsError) {
    console.log('❌ Projects table error:', projectsError.message);
  } else {
    console.log('✅ Projects table accessible, count:', projects?.length || 0);
  }

  // Test edgar_documents table (might exist)
  console.log('\n📊 Testing edgar_documents table:');
  const { data: edgarDocs, error: edgarError } = await supabase
    .from('edgar_documents')
    .select('*')
    .limit(1);

  if (edgarError) {
    console.log('❌ edgar_documents table error:', edgarError.message);
  } else {
    console.log('✅ edgar_documents table accessible, count:', edgarDocs?.length || 0);
  }

  // Test edgar_technical_documents table
  console.log('\n📊 Testing edgar_technical_documents table:');
  const { data: techDocs, error: techError } = await supabase
    .from('edgar_technical_documents')
    .select('*')
    .limit(1);

  if (techError) {
    console.log('❌ edgar_technical_documents table error:', techError.message);
  } else {
    console.log('✅ edgar_technical_documents table accessible, count:', techDocs?.length || 0);
  }

  // Test quotemedia_links table
  console.log('\n📊 Testing quotemedia_links table:');
  const { data: quotemedia, error: quotemediaError } = await supabase
    .from('quotemedia_links')
    .select('*')
    .limit(1);

  if (quotemediaError) {
    console.log('❌ quotemedia_links table error:', quotemediaError.message);
  } else {
    console.log('✅ quotemedia_links table accessible, count:', quotemedia?.length || 0);
  }

  // Test quotemedia_news table
  console.log('\n📊 Testing quotemedia_news table:');
  const { data: news, error: newsError } = await supabase
    .from('quotemedia_news')
    .select('*')
    .limit(1);

  if (newsError) {
    console.log('❌ quotemedia_news table error:', newsError.message);
  } else {
    console.log('✅ quotemedia_news table accessible, count:', news?.length || 0);
  }
}

testConnection().catch(console.error);