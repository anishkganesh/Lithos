#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

// Hardcode credentials for testing
const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.4Uj_dNP0Wqo5fzA7XyUJwkZJ5RQjKXlZCqQVJkP3Qpo'
);

async function quickInsert() {
  const testDoc = {
    symbol: 'FCX',
    company_name: 'Freeport-McMoRan',
    filing_id: 'FCX-2024-TEST-' + Date.now(),
    form_type: '10-K',
    form_description: 'Annual Report with Technical Report Summary',
    filing_date: '2024-01-15',
    pdf_link: 'https://quotemedia.com/test.pdf',
    primary_commodity: 'copper',
    financial_metrics_count: 8,
    document_quality_score: 85,
    validation_confidence: 90,
    has_capex: true,
    has_npv: true,
    has_irr: true,
    page_count: 250,
    is_technical_report: true
  };

  console.log('Inserting test document...');
  const { data, error } = await supabase
    .from('quotemedia_links')
    .insert(testDoc)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Inserted:', data);
  }
}

quickInsert().catch(console.error);