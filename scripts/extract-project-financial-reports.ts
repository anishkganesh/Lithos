#!/usr/bin/env npx tsx
/**
 * Extract technical reports with project financial data
 * Uses SIC codes and commodity filters to find the right documents
 */

import { config } from 'dotenv';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';
import { createClient } from '@supabase/supabase-js';
import {
  COMMODITY_SEARCH_TERMS,
  isLikelyTechnicalReport,
  getAllMiningSicCodes
} from '../lib/quotemedia/technical-report-filter';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mining companies by commodity with SIC codes
const COMMODITY_COMPANIES: Record<string, Array<{symbol: string, name: string, sic?: string}>> = {
  gold: [
    { symbol: 'NEM', name: 'Newmont', sic: '1041' },
    { symbol: 'GOLD', name: 'Barrick Gold', sic: '1041' },
    { symbol: 'AEM', name: 'Agnico Eagle', sic: '1041' },
    { symbol: 'KGC', name: 'Kinross Gold', sic: '1041' },
    { symbol: 'AGI', name: 'Alamos Gold', sic: '1041' },
    { symbol: 'AUY', name: 'Yamana Gold', sic: '1041' },
    { symbol: 'EGO', name: 'Eldorado Gold', sic: '1041' },
    { symbol: 'IAG', name: 'IAMGOLD', sic: '1041' },
    { symbol: 'SSRM', name: 'SSR Mining', sic: '1041' },
    { symbol: 'BTG', name: 'B2Gold', sic: '1041' },
    { symbol: 'NGD', name: 'New Gold', sic: '1041' },
    { symbol: 'OR', name: 'Osisko Gold', sic: '1041' }
  ],

  silver: [
    { symbol: 'PAAS', name: 'Pan American Silver', sic: '1044' },
    { symbol: 'CDE', name: 'Coeur Mining', sic: '1044' },
    { symbol: 'HL', name: 'Hecla Mining', sic: '1044' },
    { symbol: 'FSM', name: 'Fortuna Silver', sic: '1044' },
    { symbol: 'SILV', name: 'SilverCrest', sic: '1044' },
    { symbol: 'MAG', name: 'MAG Silver', sic: '1044' },
    { symbol: 'EXK', name: 'Endeavour Silver', sic: '1044' },
    { symbol: 'GPL', name: 'Great Panther', sic: '1044' }
  ],

  copper: [
    { symbol: 'FCX', name: 'Freeport-McMoRan', sic: '1021' },
    { symbol: 'SCCO', name: 'Southern Copper', sic: '1021' },
    { symbol: 'TECK', name: 'Teck Resources', sic: '1021' },
    { symbol: 'ERO', name: 'Ero Copper', sic: '1021' },
    { symbol: 'CS', name: 'Capstone Copper', sic: '1021' },
    { symbol: 'HBM', name: 'Hudbay Minerals', sic: '1021' },
    { symbol: 'CPPMF', name: 'Copper Mountain', sic: '1021' },
    { symbol: 'TGB', name: 'Taseko Mines', sic: '1021' }
  ],

  lithium: [
    { symbol: 'LAC', name: 'Lithium Americas', sic: '1479' },
    { symbol: 'LTHM', name: 'Livent', sic: '1479' },
    { symbol: 'ALB', name: 'Albemarle', sic: '1479' },
    { symbol: 'SQM', name: 'Sociedad Quimica', sic: '1479' },
    { symbol: 'PLL', name: 'Piedmont Lithium', sic: '1479' },
    { symbol: 'SGML', name: 'Sigma Lithium', sic: '1479' },
    { symbol: 'LIT', name: 'Global X Lithium', sic: '1479' },
    { symbol: 'LITM', name: 'Snow Lake Resources', sic: '1479' }
  ],

  uranium: [
    { symbol: 'CCJ', name: 'Cameco', sic: '1094' },
    { symbol: 'DNN', name: 'Denison Mines', sic: '1094' },
    { symbol: 'UEC', name: 'Uranium Energy', sic: '1094' },
    { symbol: 'NXE', name: 'NexGen Energy', sic: '1094' },
    { symbol: 'UUUU', name: 'Energy Fuels', sic: '1094' },
    { symbol: 'URG', name: 'Ur-Energy', sic: '1094' },
    { symbol: 'PALAF', name: 'Paladin Energy', sic: '1094' },
    { symbol: 'FCUUF', name: 'Fission Uranium', sic: '1094' }
  ],

  nickel: [
    { symbol: 'VALE', name: 'Vale', sic: '1061' },
    { symbol: 'NILSY', name: 'Norilsk Nickel', sic: '1061' },
    { symbol: 'SSNLF', name: 'Sherritt International', sic: '1061' },
    { symbol: 'TCK', name: 'Talon Metals', sic: '1061' }
  ],

  zinc: [
    { symbol: 'TECK', name: 'Teck Resources', sic: '1031' },
    { symbol: 'HBM', name: 'Hudbay Minerals', sic: '1031' },
    { symbol: 'VEDL', name: 'Vedanta', sic: '1031' },
    { symbol: 'LUN', name: 'Lundin Mining', sic: '1031' }
  ],

  iron_ore: [
    { symbol: 'VALE', name: 'Vale', sic: '1011' },
    { symbol: 'RIO', name: 'Rio Tinto', sic: '1011' },
    { symbol: 'BHP', name: 'BHP Group', sic: '1011' },
    { symbol: 'CLF', name: 'Cleveland-Cliffs', sic: '1011' }
  ],

  rare_earth: [
    { symbol: 'MP', name: 'MP Materials', sic: '1099' },
    { symbol: 'LYSCF', name: 'Lynas Rare Earths', sic: '1099' },
    { symbol: 'UUUU', name: 'Energy Fuels', sic: '1099' },
    { symbol: 'REEMF', name: 'Rare Element Resources', sic: '1099' }
  ],

  cobalt: [
    { symbol: 'FTSSF', name: 'First Cobalt', sic: '1061' },
    { symbol: 'GLNCY', name: 'Glencore', sic: '1061' },
    { symbol: 'JJN', name: 'Jervois Global', sic: '1061' }
  ],

  graphite: [
    { symbol: 'NMGRF', name: 'Nouveau Monde Graphite', sic: '1499' },
    { symbol: 'SYTRF', name: 'Syrah Resources', sic: '1499' },
    { symbol: 'NGC', name: 'Northern Graphite', sic: '1499' }
  ],

  potash: [
    { symbol: 'MOS', name: 'Mosaic Company', sic: '1474' },
    { symbol: 'NTR', name: 'Nutrien', sic: '1474' },
    { symbol: 'IPI', name: 'Intrepid Potash', sic: '1474' }
  ],

  phosphate: [
    { symbol: 'MOS', name: 'Mosaic Company', sic: '1475' },
    { symbol: 'CF', name: 'CF Industries', sic: '1475' },
    { symbol: 'OCP', name: 'OCP Group', sic: '1475' }
  ]
};

interface ExtractedReport {
  symbol: string;
  company_name: string;
  commodity: string;
  form_type: string;
  description: string;
  date_filed: string;
  file_size: string;
  pages: number;
  pdf_link: string;
  html_link: string;
  confidence: number;
  indicators: string[];
  likely_contains_financials: boolean;
}

async function extractProjectFinancialReports() {
  console.log('🎯 EXTRACTING TECHNICAL REPORTS WITH PROJECT FINANCIAL DATA');
  console.log('===========================================================\n');

  const password = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';
  const client = new QuoteMediaClient(password);

  const extractedReports: ExtractedReport[] = [];
  const processedSymbols = new Set<string>();

  // Suppress logs during fetching
  const originalLog = console.log;
  const suppressLogs = () => { console.log = () => {}; };
  const restoreLogs = () => { console.log = originalLog; };

  console.log('📊 Scanning companies by commodity for technical reports...\n');

  for (const [commodity, companies] of Object.entries(COMMODITY_COMPANIES)) {
    console.log(`\n🏷️ ${commodity.toUpperCase().replace('_', ' ')} Companies:`);
    console.log('─'.repeat(50));

    for (const company of companies) {
      // Avoid duplicates
      if (processedSymbols.has(company.symbol)) continue;
      processedSymbols.add(company.symbol);

      process.stdout.write(`  Analyzing ${company.symbol} (${company.name})...`);

      try {
        suppressLogs();
        // Get more documents to find technical reports
        const documents = await client.getCompanyFilings({
          symbol: company.symbol,
          limit: 30, // Check last 30 documents
        });
        restoreLogs();

        let foundReport = false;

        for (const doc of documents) {
          // Apply advanced filter
          const analysis = isLikelyTechnicalReport(doc);

          if (analysis.isMatch) {
            foundReport = true;

            const report: ExtractedReport = {
              symbol: company.symbol,
              company_name: company.name,
              commodity: analysis.commodity || commodity,
              form_type: doc.formType,
              description: doc.formDescription || '',
              date_filed: doc.dateFiled,
              file_size: doc.fileSize || '',
              pages: doc.pages || 0,
              pdf_link: doc.pdfLink || '',
              html_link: doc.htmlLink || '',
              confidence: analysis.confidence,
              indicators: analysis.indicators,
              likely_contains_financials: analysis.indicators.some(i => i.startsWith('financial_'))
            };

            extractedReports.push(report);

            // Store in database
            await supabase
              .from('edgar_technical_documents')
              .upsert({
                filing_id: doc.filingId || `${company.symbol}-${doc.dateFiled}-${doc.formType}`,
                symbol: company.symbol,
                company_name: company.name,
                form_type: doc.formType,
                form_description: doc.formDescription,
                date_filed: doc.dateFiled,
                pdf_link: doc.pdfLink,
                html_link: doc.htmlLink,
                file_size: doc.fileSize,
                page_count: doc.pages,
                is_technical_report: true,
                report_type: determineReportType(doc.formDescription || ''),
                commodity_types: [commodity],
                processing_status: 'identified',
                metadata: {
                  commodity,
                  confidence: analysis.confidence,
                  indicators: analysis.indicators,
                  sic_code: company.sic,
                  likely_financial_data: analysis.indicators.some(i => i.startsWith('financial_'))
                }
              }, {
                onConflict: 'filing_id'
              });

            process.stdout.write(` ✅ [${analysis.confidence}% confidence]\n`);
            break; // Found one, move to next company
          }
        }

        if (!foundReport) {
          process.stdout.write(' ❌\n');
        }

      } catch (error) {
        process.stdout.write(' ⚠️\n');
      }
    }
  }

  // Display results
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📈 TECHNICAL REPORTS WITH FINANCIAL DATA FOUND:');
  console.log('===============================================\n');

  // Group by confidence level
  const highConfidence = extractedReports.filter(r => r.confidence >= 80);
  const mediumConfidence = extractedReports.filter(r => r.confidence >= 60 && r.confidence < 80);
  const lowConfidence = extractedReports.filter(r => r.confidence < 60);

  if (highConfidence.length > 0) {
    console.log('🏆 HIGH CONFIDENCE REPORTS (80%+ match):');
    console.log('─'.repeat(50));
    for (const report of highConfidence.slice(0, 10)) {
      console.log(`\n📄 ${report.company_name} (${report.symbol}) - ${report.commodity}`);
      console.log(`   Form: ${report.form_type} | Date: ${report.date_filed}`);
      console.log(`   Description: ${report.description}`);
      console.log(`   Size: ${report.file_size} | Pages: ${report.pages}`);
      console.log(`   Confidence: ${report.confidence}%`);
      console.log(`   Indicators: ${report.indicators.join(', ')}`);
      console.log(`   Contains Financials: ${report.likely_contains_financials ? '✅' : '❓'}`);
      console.log(`   \n   📥 PDF Link:`);
      console.log(`   ${report.pdf_link}`);
    }
  }

  if (mediumConfidence.length > 0) {
    console.log('\n\n⭐ MEDIUM CONFIDENCE REPORTS (60-79% match):');
    console.log('─'.repeat(50));
    for (const report of mediumConfidence.slice(0, 5)) {
      console.log(`\n📄 ${report.company_name} (${report.symbol}) - ${report.commodity}`);
      console.log(`   Form: ${report.form_type} | Confidence: ${report.confidence}%`);
      console.log(`   Pages: ${report.pages} | ${report.file_size}`);
    }
  }

  // Summary statistics
  console.log('\n\n📊 EXTRACTION SUMMARY:');
  console.log('─'.repeat(50));
  console.log(`Total Reports Found: ${extractedReports.length}`);
  console.log(`High Confidence: ${highConfidence.length}`);
  console.log(`Medium Confidence: ${mediumConfidence.length}`);
  console.log(`Low Confidence: ${lowConfidence.length}`);

  // Commodity breakdown
  const byCommodity = extractedReports.reduce((acc, r) => {
    acc[r.commodity] = (acc[r.commodity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📦 By Commodity:');
  for (const [commodity, count] of Object.entries(byCommodity)) {
    console.log(`   ${commodity}: ${count} reports`);
  }

  console.log('\n💡 These reports likely contain:');
  console.log('   • CAPEX & Sustaining CAPEX');
  console.log('   • NPV (Pre-tax and Post-tax)');
  console.log('   • IRR percentages');
  console.log('   • Payback periods');
  console.log('   • Mine life years');
  console.log('   • Annual production rates');
  console.log('   • Resource/Reserve tonnages and grades');
  console.log('   • OPEX per tonne');
  console.log('   • AISC (All-in Sustaining Costs)');

  console.log('\n✅ Reports stored in edgar_technical_documents table');
  console.log('📝 Next step: Download PDFs and extract financial values');
}

function determineReportType(description: string): string {
  const desc = description.toLowerCase();

  if (desc.includes('43-101')) return 'NI 43-101';
  if (desc.includes('preliminary economic assessment') || desc.includes('pea')) return 'PEA';
  if (desc.includes('pre-feasibility')) return 'Pre-Feasibility Study';
  if (desc.includes('feasibility study')) return 'Feasibility Study';
  if (desc.includes('resource estimate')) return 'Resource Estimate';
  if (desc.includes('reserve estimate')) return 'Reserve Estimate';
  if (desc.includes('technical report summary') || desc.includes('trs')) return 'S-K 1300 TRS';
  if (desc.includes('annual report') || desc.includes('10-k') || desc.includes('40-f')) return 'Annual Report';

  return 'Technical Report';
}

extractProjectFinancialReports().catch(console.error);