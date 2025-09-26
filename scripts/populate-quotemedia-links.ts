#!/usr/bin/env npx tsx
/**
 * Populate quotemedia_links table with validated technical document links
 * Only stores documents that likely contain project financial data
 */

import { config } from 'dotenv';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';
import { createClient } from '@supabase/supabase-js';
import {
  validateFinancialMetrics,
  extractProjectNames,
  extractCommodities,
  calculateDocumentQuality
} from '../lib/quotemedia/financial-metrics-validator';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Use anon key as per lib/supabase-service.ts
);

// High-priority mining companies with known technical reports
const TARGET_COMPANIES = [
  // GOLD
  { symbol: 'NEM', name: 'Newmont Corporation', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'GOLD', name: 'Barrick Gold', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'AEM', name: 'Agnico Eagle', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'KGC', name: 'Kinross Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'AGI', name: 'Alamos Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'IAG', name: 'IAMGOLD', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'NGD', name: 'New Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'EGO', name: 'Eldorado Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'BTG', name: 'B2Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'OR', name: 'Osisko Gold Royalties', commodity: 'gold', exchange: 'NYSE/TSX' },

  // COPPER
  { symbol: 'FCX', name: 'Freeport-McMoRan', commodity: 'copper', exchange: 'NYSE' },
  { symbol: 'SCCO', name: 'Southern Copper', commodity: 'copper', exchange: 'NYSE' },
  { symbol: 'TECK', name: 'Teck Resources', commodity: 'copper', exchange: 'NYSE/TSX' },
  { symbol: 'ERO', name: 'Ero Copper', commodity: 'copper', exchange: 'NYSE/TSX' },
  { symbol: 'CS', name: 'Capstone Copper', commodity: 'copper', exchange: 'TSX' },
  { symbol: 'HBM', name: 'Hudbay Minerals', commodity: 'copper', exchange: 'NYSE/TSX' },

  // LITHIUM
  { symbol: 'LAC', name: 'Lithium Americas', commodity: 'lithium', exchange: 'NYSE/TSX' },
  { symbol: 'LTHM', name: 'Livent', commodity: 'lithium', exchange: 'NYSE' },
  { symbol: 'ALB', name: 'Albemarle', commodity: 'lithium', exchange: 'NYSE' },
  { symbol: 'SQM', name: 'Sociedad Quimica y Minera', commodity: 'lithium', exchange: 'NYSE' },
  { symbol: 'PLL', name: 'Piedmont Lithium', commodity: 'lithium', exchange: 'NASDAQ' },
  { symbol: 'SGML', name: 'Sigma Lithium', commodity: 'lithium', exchange: 'NASDAQ' },

  // SILVER
  { symbol: 'PAAS', name: 'Pan American Silver', commodity: 'silver', exchange: 'NASDAQ/TSX' },
  { symbol: 'CDE', name: 'Coeur Mining', commodity: 'silver', exchange: 'NYSE' },
  { symbol: 'HL', name: 'Hecla Mining', commodity: 'silver', exchange: 'NYSE' },
  { symbol: 'FSM', name: 'Fortuna Silver', commodity: 'silver', exchange: 'NYSE/TSX' },

  // URANIUM
  { symbol: 'CCJ', name: 'Cameco', commodity: 'uranium', exchange: 'NYSE/TSX' },
  { symbol: 'DNN', name: 'Denison Mines', commodity: 'uranium', exchange: 'NYSE/TSX' },
  { symbol: 'NXE', name: 'NexGen Energy', commodity: 'uranium', exchange: 'NYSE/TSX' },
  { symbol: 'UEC', name: 'Uranium Energy', commodity: 'uranium', exchange: 'NYSE' },
  { symbol: 'UUUU', name: 'Energy Fuels', commodity: 'uranium', exchange: 'NYSE/TSX' },

  // RARE EARTH
  { symbol: 'MP', name: 'MP Materials', commodity: 'rare_earth', exchange: 'NYSE' },

  // NICKEL
  { symbol: 'VALE', name: 'Vale', commodity: 'nickel', exchange: 'NYSE' },

  // MULTI-COMMODITY
  { symbol: 'BHP', name: 'BHP Group', commodity: 'iron_ore', exchange: 'NYSE' },
  { symbol: 'RIO', name: 'Rio Tinto', commodity: 'iron_ore', exchange: 'NYSE' }
];

async function populateQuoteMediaLinks() {
  console.log('🚀 Populating QuoteMedia Links Database');
  console.log('========================================\n');

  const password = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';
  const client = new QuoteMediaClient(password);

  let totalProcessed = 0;
  let highQualityDocs = 0;
  let storedLinks = 0;

  // Suppress logs
  const originalLog = console.log;
  const suppressLogs = () => { console.log = () => {}; };
  const restoreLogs = () => { console.log = originalLog; };

  console.log('📊 Processing companies and validating documents...\n');

  for (const company of TARGET_COMPANIES) {
    process.stdout.write(`${company.symbol} (${company.commodity}): `);

    try {
      suppressLogs();
      // Fetch recent filings
      const documents = await client.getCompanyFilings({
        symbol: company.symbol,
        limit: 25, // Check last 25 documents
      });
      restoreLogs();

      let foundQualityDoc = false;

      for (const doc of documents) {
        totalProcessed++;

        // Calculate document quality
        const qualityScore = calculateDocumentQuality(doc);

        // Skip low quality documents
        if (qualityScore < 40) continue;
        if (!doc.pdfLink) continue; // Must have PDF link
        if (doc.pages && doc.pages < 50) continue; // Skip small documents

        // Validate financial metrics
        const validation = validateFinancialMetrics({
          description: doc.formDescription || '',
          formType: doc.formType,
          pages: doc.pages,
          fileSize: doc.fileSize
        });

        // Extract additional information
        const projectNames = extractProjectNames(doc.formDescription || '');
        const commodities = extractCommodities(doc.formDescription || '');

        // Determine if this is a high-quality technical document
        // Lower thresholds to capture more documents
        const isHighQuality =
          qualityScore >= 40 && // Lowered from 60
          (validation.confidence >= 30 || validation.foundMetrics.length >= 2 || doc.pages >= 100);

        if (isHighQuality) {
          foundQualityDoc = true;
          highQualityDocs++;

          // Determine country
          const country = company.exchange.includes('TSX') ? 'CA' : 'US';

          // Prepare record for database
          const quoteMediaLink = {
            symbol: company.symbol,
            company_name: company.name,
            cik: doc.cik || null,
            issuer_number: doc.issuerNumber || null,
            sic_code: null, // Could be added based on commodity

            filing_id: doc.filingId || `${company.symbol}-${doc.dateFiled}-${doc.formType}`,
            accession_number: doc.accessionNumber || null,
            form_type: doc.formType,
            form_description: doc.formDescription,

            filing_date: doc.dateFiled,
            period_date: doc.period || null,
            file_size: doc.fileSize || null,
            page_count: doc.pages || null,

            pdf_link: doc.pdfLink!,
            html_link: doc.htmlLink || null,
            excel_link: doc.xlsLink || null,
            xbrl_link: doc.xbrlLink || null,

            primary_commodity: company.commodity,
            commodities: commodities.length > 0 ? commodities : [company.commodity],
            project_names: projectNames,

            // Financial metrics flags
            has_capex: validation.foundMetrics.includes('capex'),
            has_npv: validation.foundMetrics.includes('npv'),
            has_irr: validation.foundMetrics.includes('irr'),
            has_mine_life: validation.foundMetrics.includes('mine_life'),
            has_production_rate: validation.foundMetrics.includes('production'),
            has_resource_data: validation.foundMetrics.includes('resource_tonnage'),
            has_opex: validation.foundMetrics.includes('opex'),
            has_aisc: validation.foundMetrics.includes('aisc'),

            financial_metrics_count: validation.foundMetrics.length,
            document_quality_score: qualityScore,
            validation_confidence: validation.confidence,

            is_technical_report: validation.hasRequiredMetrics,
            report_type: determineReportType(doc.formDescription || '', doc.formType),
            project_stage: validation.estimatedStage || null,

            source: 'quotemedia',
            exchange: company.exchange,
            country: country,

            processing_status: 'validated',
            validated_at: new Date().toISOString(),

            metadata: {
              found_metrics: validation.foundMetrics,
              missing_metrics: validation.missingMetrics,
              original_form_type: doc.formType
            }
          };

          // Insert into database
          const { error } = await supabase
            .from('quotemedia_links')
            .upsert(quoteMediaLink, {
              onConflict: 'filing_id'
            });

          if (!error) {
            storedLinks++;
            process.stdout.write('✅');
          } else {
            console.error('\nDatabase error for', company.symbol, ':', error.message);
            process.stdout.write('⚠️');
          }

          break; // Take best document per company
        }
      }

      if (!foundQualityDoc) {
        process.stdout.write('❌');
      }

    } catch (error) {
      process.stdout.write('❌');
    }

    process.stdout.write('\n');
  }

  // Display summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 POPULATION SUMMARY:');
  console.log('======================\n');
  console.log(`Companies Processed: ${TARGET_COMPANIES.length}`);
  console.log(`Documents Analyzed: ${totalProcessed}`);
  console.log(`High-Quality Documents Found: ${highQualityDocs}`);
  console.log(`Links Stored in Database: ${storedLinks}`);

  // Query and display stored links
  const { data: storedDocs, count } = await supabase
    .from('quotemedia_links')
    .select('*', { count: 'exact' })
    .order('document_quality_score', { ascending: false })
    .limit(10);

  if (storedDocs && storedDocs.length > 0) {
    console.log(`\n📈 TOP QUALITY DOCUMENTS IN DATABASE (Total: ${count}):\n`);

    for (const doc of storedDocs.slice(0, 5)) {
      console.log(`${doc.symbol} - ${doc.company_name}`);
      console.log(`  📄 ${doc.form_type}: ${doc.form_description}`);
      console.log(`  📅 Filed: ${doc.filing_date}`);
      console.log(`  📊 Quality Score: ${doc.document_quality_score}/100`);
      console.log(`  ✅ Financial Metrics: ${doc.financial_metrics_count} found`);
      console.log(`  🎯 Confidence: ${doc.validation_confidence}%`);

      const metrics = [];
      if (doc.has_capex) metrics.push('CAPEX');
      if (doc.has_npv) metrics.push('NPV');
      if (doc.has_irr) metrics.push('IRR');
      if (doc.has_mine_life) metrics.push('Mine Life');
      if (doc.has_production_rate) metrics.push('Production');
      if (doc.has_opex) metrics.push('OPEX');
      if (doc.has_aisc) metrics.push('AISC');

      console.log(`  💰 Contains: ${metrics.join(', ')}`);
      console.log(`  🔗 PDF: ${doc.pdf_link.substring(0, 80)}...`);
      console.log('');
    }

    // Summary by commodity
    const { data: commoditySummary } = await supabase
      .from('quotemedia_links')
      .select('primary_commodity')
      .not('primary_commodity', 'is', null);

    if (commoditySummary) {
      const commodityCounts = commoditySummary.reduce((acc, doc) => {
        acc[doc.primary_commodity] = (acc[doc.primary_commodity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📦 Documents by Commodity:');
      for (const [commodity, docCount] of Object.entries(commodityCounts)) {
        console.log(`  ${commodity}: ${docCount} documents`);
      }
    }
  }

  console.log('\n✅ Database population complete!');
  console.log('📝 Next steps:');
  console.log('  1. Download PDFs for high-confidence documents');
  console.log('  2. Extract specific financial values');
  console.log('  3. Populate projects table with extracted data');
}

function determineReportType(description: string, formType: string): string {
  const desc = description.toLowerCase();

  if (desc.includes('43-101') || desc.includes('ni 43-101')) return 'NI 43-101';
  if (desc.includes('technical report summary')) return 'S-K 1300';
  if (desc.includes('preliminary economic assessment') || desc.includes('pea')) return 'PEA';
  if (desc.includes('pre-feasibility') || desc.includes('prefeasibility')) return 'Pre-Feasibility Study';
  if (desc.includes('feasibility study') && !desc.includes('pre-')) return 'Feasibility Study';
  if (desc.includes('resource estimate')) return 'Resource Estimate';
  if (desc.includes('reserve estimate')) return 'Reserve Estimate';

  if (formType === '10-K') return 'Annual Report';
  if (formType === '40-F') return 'Annual Report (Foreign)';
  if (formType === '20-F') return 'Annual Report (Foreign)';
  if (formType === '10-Q') return 'Quarterly Report';
  if (formType === '8-K') return 'Current Report';
  if (formType === '6-K') return 'Foreign Report';

  return 'Technical Document';
}

populateQuoteMediaLinks().catch(console.error);