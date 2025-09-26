#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testTable() {
  // Test if table exists and insert a test record
  const testRecord = {
    symbol: 'TEST',
    company_name: 'Test Company',
    filing_id: 'TEST-2024-01-01',
    form_type: 'TEST',
    filing_date: '2024-01-01',
    pdf_link: 'https://test.com/test.pdf',
    financial_metrics_count: 5,
    document_quality_score: 80,
    validation_confidence: 75
  };

  console.log('Testing quotemedia_links table...');
  
  // First check if table exists
  const { data: existingData, error: selectError } = await supabase
    .from('quotemedia_links')
    .select('*')
    .limit(1);

  if (selectError) {
    console.error('Table select error:', selectError);
    return;
  }

  console.log('Table exists! Current record count:', existingData?.length || 0);

  // Try insert
  const { data, error } = await supabase
    .from('quotemedia_links')
    .insert(testRecord)
    .select();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Test insert successful:', data);
    
    // Clean up test record
    const { error: deleteError } = await supabase
      .from('quotemedia_links')
      .delete()
      .eq('filing_id', 'TEST-2024-01-01');
    
    if (deleteError) {
      console.error('Cleanup error:', deleteError);
    } else {
      console.log('Test record cleaned up');
    }
  }
}

testTable().catch(console.error);