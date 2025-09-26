#!/usr/bin/env npx tsx
/**
 * Count EX-96.1 documents in database
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc'
);

async function count() {
  const { count: total } = await supabase
    .from('edgar_technical_documents')
    .select('*', { count: 'exact', head: true })
    .eq('exhibit_number', 'EX-96.1');

  console.log(`Total EX-96.1 documents: ${total || 0}`);

  // Also show some recent ones
  const { data } = await supabase
    .from('edgar_technical_documents')
    .select('company_name, filing_date')
    .eq('exhibit_number', 'EX-96.1')
    .order('filing_date', { ascending: false })
    .limit(5);

  console.log('\nRecent EX-96.1 filings:');
  data?.forEach(d => console.log(`  ${d.company_name} - ${d.filing_date}`));
}

count().catch(console.error);