#!/usr/bin/env npx tsx

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function showParsedProjects() {
  console.log('🔍 PROJECTS POPULATED FROM EX-96.1 TECHNICAL REPORTS');
  console.log('='.repeat(70));

  try {
    // Get all projects from EDGAR_EX96 source
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('data_source', 'EDGAR_EX96')
      .order('last_scraped_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching projects:', error);
      return;
    }

    if (!projects || projects.length === 0) {
      console.log('\n⚠️ No projects found from EX-96.1 parsing yet.');
      console.log('Parser may still be running. Checking recent projects...\n');

      // Show recent projects regardless of source
      const { data: recent, error: recentError } = await supabase
        .from('projects')
        .select('*')
        .order('last_scraped_at', { ascending: false })
        .limit(10);

      if (recent && recent.length > 0) {
        console.log('Recent projects in database:');
        recent.forEach(p => {
          console.log(`  - ${p.project_name} (${p.company_name}) - Source: ${p.data_source}`);
        });
      }
      return;
    }

    console.log(`\n✅ Found ${projects.length} projects from EX-96.1 documents\n`);

    // Display projects with key financial metrics
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.project_name || 'Unnamed Project'}`);
      console.log(`   Company: ${project.company_name}`);
      console.log(`   Location: ${project.jurisdiction || 'N/A'}, ${project.country || 'N/A'}`);
      console.log(`   Commodity: ${project.primary_commodity || 'N/A'}`);
      console.log(`   Stage: ${project.stage || 'N/A'}`);

      console.log('\n   📊 Financial Metrics:');
      if (project.capex_usd_m) console.log(`   - CAPEX: $${project.capex_usd_m}M`);
      if (project.post_tax_npv_usd_m) console.log(`   - NPV (Post-tax): $${project.post_tax_npv_usd_m}M`);
      if (project.irr_percent) console.log(`   - IRR: ${project.irr_percent}%`);
      if (project.payback_years) console.log(`   - Payback: ${project.payback_years} years`);
      if (project.mine_life_years) console.log(`   - Mine Life: ${project.mine_life_years} years`);

      if (project.annual_production_tonnes) {
        console.log(`   - Annual Production: ${project.annual_production_tonnes.toLocaleString()} tonnes`);
      }
      if (project.resource_grade && project.resource_grade_unit) {
        console.log(`   - Grade: ${project.resource_grade} ${project.resource_grade_unit}`);
      }

      if (project.technical_report_url) {
        console.log(`\n   📄 Technical Report: ${project.technical_report_date || 'N/A'}`);
        console.log(`   🔗 ${project.technical_report_url.substring(0, 80)}...`);
      }

      console.log(`\n   Status: ${project.processing_status || 'N/A'}`);
      console.log(`   Confidence: ${project.extraction_confidence || 0}%`);
      console.log(`   Last Updated: ${new Date(project.last_scraped_at).toLocaleString()}`);

      console.log('\n' + '-'.repeat(70));
    });

    // Summary statistics
    console.log('\n📈 SUMMARY STATISTICS');
    console.log('='.repeat(70));

    const commodities = new Map<string, number>();
    const countries = new Map<string, number>();
    let totalCapex = 0;
    let totalNPV = 0;
    let avgIRR = 0;
    let irrCount = 0;

    projects.forEach(p => {
      if (p.primary_commodity) {
        commodities.set(p.primary_commodity, (commodities.get(p.primary_commodity) || 0) + 1);
      }
      if (p.country) {
        countries.set(p.country, (countries.get(p.country) || 0) + 1);
      }
      if (p.capex_usd_m) totalCapex += p.capex_usd_m;
      if (p.post_tax_npv_usd_m) totalNPV += p.post_tax_npv_usd_m;
      if (p.irr_percent) {
        avgIRR += p.irr_percent;
        irrCount++;
      }
    });

    console.log('\nBy Commodity:');
    commodities.forEach((count, commodity) => {
      console.log(`  - ${commodity}: ${count} projects`);
    });

    console.log('\nBy Country:');
    countries.forEach((count, country) => {
      console.log(`  - ${country}: ${count} projects`);
    });

    console.log('\nFinancial Overview:');
    console.log(`  - Total CAPEX: $${totalCapex.toFixed(1)}M`);
    console.log(`  - Total NPV: $${totalNPV.toFixed(1)}M`);
    if (irrCount > 0) {
      console.log(`  - Average IRR: ${(avgIRR / irrCount).toFixed(1)}%`);
    }

    // Check for documents still being processed
    console.log('\n📄 PROCESSING STATUS');
    console.log('='.repeat(70));

    const { data: techDocs, error: techError } = await supabase
      .from('edgar_technical_documents')
      .select('company_name, filing_date, processing_status')
      .eq('exhibit_number', 'EX-96.1')
      .order('filing_date', { ascending: false });

    if (techDocs && !techError) {
      const unprocessed = techDocs.filter(d => d.processing_status !== 'processed');
      console.log(`Total EX-96.1 documents: ${techDocs.length}`);
      console.log(`Successfully parsed: ${projects.length}`);
      console.log(`Pending/Failed: ${unprocessed.length}`);

      if (unprocessed.length > 0) {
        console.log('\nDocuments still to process:');
        unprocessed.slice(0, 5).forEach(d => {
          console.log(`  - ${d.company_name} (${d.filing_date})`);
        });
        if (unprocessed.length > 5) {
          console.log(`  ... and ${unprocessed.length - 5} more`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Report complete!');
}

// Execute
showParsedProjects().catch(console.error);