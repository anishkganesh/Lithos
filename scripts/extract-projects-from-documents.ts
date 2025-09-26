#!/usr/bin/env npx tsx
/**
 * Extract Mining Projects from Technical Documents
 * Focuses on NI 43-101 and S-K 1300 reports with 40% metrics threshold
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';
import {
  validateDocumentMetrics,
  extractFinancialMetrics,
  calculateExtractionConfidence
} from '../lib/mining-metrics-extractor';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const client = new QuoteMediaClient(process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48');

/**
 * Fetch document content (prefer HTML for easier extraction)
 */
async function fetchDocumentContent(doc: any): Promise<string | null> {
  try {
    // Prefer HTML link for easier text extraction
    const url = doc.html_link || doc.htmlLink || doc.pdf_link || doc.pdfLink;
    if (!url) return null;

    // For QuoteMedia links, we need to fetch through their API
    // For now, simulate with description and metadata
    // In production, you'd fetch and parse the actual document
    
    // Use form description and any available metadata
    let content = doc.form_description || doc.formDescription || '';
    
    // Add simulated content for testing (in production, fetch real document)
    if (doc.formType === '10-K' || doc.formType === '40-F') {
      content += ' Annual Report with Technical Report Summary. ';
    }
    
    return content;
  } catch (error) {
    console.error('Error fetching document:', error);
    return null;
  }
}

/**
 * Extract project name from document
 */
function extractProjectName(text: string, companyName: string): string {
  // Look for project name patterns
  const patterns = [
    /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Project|Mine|Property|Deposit)/gi,
    /(?:Project|Mine|Property):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Fallback to company name + " Project"
  return `${companyName} Project`;
}

/**
 * Determine country and jurisdiction from document
 */
function extractLocation(text: string, exchange: string): { country: string; jurisdiction: string } {
  // Common country patterns
  const countryPatterns = [
    { pattern: /\b(Canada|Canadian|Ontario|Quebec|British Columbia|BC|Alberta|Saskatchewan|Manitoba|Yukon|NWT|Nunavut)\b/gi, country: 'Canada' },
    { pattern: /\b(USA|United States|America|Nevada|Arizona|Alaska|Wyoming|Montana|Idaho|Utah|Colorado)\b/gi, country: 'USA' },
    { pattern: /\b(Australia|Australian|Western Australia|WA|Queensland|QLD|New South Wales|NSW|Victoria|VIC)\b/gi, country: 'Australia' },
    { pattern: /\b(Mexico|Mexican|Sonora|Chihuahua|Zacatecas|Durango)\b/gi, country: 'Mexico' },
    { pattern: /\b(Peru|Peruvian|Chile|Chilean|Argentina|Argentinian|Brazil|Brazilian)\b/gi, country: 'South America' },
    { pattern: /\b(DRC|Congo|Zambia|Zimbabwe|South Africa|Ghana|Mali|Burkina Faso|Tanzania)\b/gi, country: 'Africa' },
  ];

  let country = 'Unknown';
  let jurisdiction = 'Unknown';

  for (const { pattern, country: countryName } of countryPatterns) {
    const match = pattern.exec(text);
    if (match) {
      country = countryName;
      jurisdiction = match[1];
      break;
    }
  }

  // Fallback based on exchange
  if (country === 'Unknown') {
    if (exchange?.includes('TSX')) {
      country = 'Canada';
      jurisdiction = 'Canada';
    } else if (exchange?.includes('ASX')) {
      country = 'Australia';
      jurisdiction = 'Australia';
    } else {
      country = 'USA';
      jurisdiction = 'USA';
    }
  }

  return { country, jurisdiction };
}

/**
 * Process a single document and extract project data
 */
async function processDocument(doc: any, company: any): Promise<any | null> {
  try {
    // Fetch document content
    const content = await fetchDocumentContent(doc);
    if (!content) return null;

    // Validate document has minimum 40% of required metrics
    const validation = validateDocumentMetrics(content);
    if (!validation.isValid) {
      console.log(`  ❌ Document only has ${validation.percentage}% of required metrics (need 40%+)`);
      return null;
    }

    console.log(`  ✅ Document has ${validation.percentage}% of required metrics`);

    // Extract financial metrics
    const metrics = extractFinancialMetrics(content);
    
    // Calculate confidence
    const confidence = calculateExtractionConfidence(metrics);
    if (confidence < 50) {
      console.log(`  ⚠️ Low extraction confidence: ${confidence}%`);
      return null;
    }

    // Extract project details
    const projectName = extractProjectName(content, company.company_name || company.name);
    const { country, jurisdiction } = extractLocation(content, company.exchange);

    // Build project record
    const project = {
      project_name: projectName,
      company_name: company.company_name || company.name,
      company_id: company.company_id || null,
      country,
      jurisdiction,
      primary_commodity: company.primary_commodity || company.commodity,
      stage: metrics.stage || 'unknown',
      
      // Financial metrics
      capex_usd_m: metrics.capex_usd_m || null,
      sustaining_capex_usd_m: metrics.sustaining_capex_usd_m || null,
      post_tax_npv_usd_m: metrics.post_tax_npv_usd_m || null,
      pre_tax_npv_usd_m: metrics.pre_tax_npv_usd_m || null,
      irr_percent: metrics.irr_percent || null,
      payback_years: metrics.payback_years || null,
      
      // Production metrics
      mine_life_years: metrics.mine_life_years || null,
      annual_production_tonnes: metrics.annual_production_tonnes || null,
      
      // Resource metrics
      total_resource_tonnes: metrics.total_resource_tonnes || null,
      resource_grade: metrics.resource_grade || null,
      resource_grade_unit: metrics.resource_grade_unit || null,
      
      // Operating costs
      opex_usd_per_tonne: metrics.opex_usd_per_tonne || null,
      aisc_usd_per_tonne: metrics.aisc_usd_per_tonne || null,
      
      // Source information
      technical_report_url: doc.pdf_link || doc.html_link || null,
      technical_report_date: doc.filing_date || new Date().toISOString().split('T')[0],
      data_source: `QuoteMedia - ${doc.form_type}`,
      extraction_confidence: confidence,
      processing_status: 'extracted',
      
      // Timestamps
      discovery_date: new Date().toISOString(),
      last_scraped_at: new Date().toISOString(),
      
      // Description
      project_description: `${projectName} is a ${metrics.stage || 'development'}-stage ${company.primary_commodity || company.commodity} project. ` +
                          `Technical data extracted from ${doc.form_type} filing dated ${doc.filing_date}.`
    };

    return project;
  } catch (error) {
    console.error('Error processing document:', error);
    return null;
  }
}

/**
 * Main extraction function
 */
async function extractProjectsFromDocuments() {
  console.log('🚀 EXTRACTING MINING PROJECTS FROM TECHNICAL DOCUMENTS');
  console.log('='.repeat(60));
  console.log('Focus: NI 43-101 and S-K 1300 reports');
  console.log('Threshold: 40% of key financial metrics required');
  console.log('Target: Recent high-quality technical reports\n');

  // First, get high-quality documents from quotemedia_links table
  const { data: documents, error } = await supabase
    .from('quotemedia_links')
    .select('*')
    .or('form_type.eq.10-K,form_type.eq.40-F,form_type.eq.20-F,form_type.eq.8-K,form_type.eq.6-K')
    .gte('page_count', 100)
    .gte('document_quality_score', 50)
    .order('filing_date', { ascending: false })
    .limit(100);

  if (error || !documents) {
    console.error('Error fetching documents:', error);
    return;
  }

  console.log(`Found ${documents.length} high-quality documents to process\n`);

  let projectsExtracted = 0;
  let documentsProcessed = 0;

  for (const doc of documents) {
    documentsProcessed++;
    console.log(`\n[${documentsProcessed}/${documents.length}] Processing: ${doc.company_name} - ${doc.form_type}`);
    console.log(`  📅 Filed: ${doc.filing_date}`);
    console.log(`  📄 Pages: ${doc.page_count}`);
    console.log(`  💎 Commodity: ${doc.primary_commodity}`);

    // Check if this is likely a technical report
    const isTechnicalReport = 
      doc.form_description?.toLowerCase().includes('technical report') ||
      doc.form_description?.toLowerCase().includes('43-101') ||
      doc.form_description?.toLowerCase().includes('s-k 1300') ||
      doc.form_description?.toLowerCase().includes('feasibility') ||
      doc.form_description?.toLowerCase().includes('economic assessment') ||
      doc.financial_metrics_count > 5;

    if (!isTechnicalReport) {
      console.log('  ⏭️ Skipping: Not a technical report');
      continue;
    }

    // Process the document
    const project = await processDocument(doc, doc);
    
    if (project) {
      // Check if project already exists
      const { data: existing } = await supabase
        .from('projects')
        .select('project_id')
        .eq('project_name', project.project_name)
        .eq('company_name', project.company_name)
        .single();

      if (existing) {
        console.log('  ⚠️ Project already exists, updating...');
        const { error: updateError } = await supabase
          .from('projects')
          .update(project)
          .eq('project_id', existing.project_id);
        
        if (updateError) {
          console.error('  ❌ Update error:', updateError);
        } else {
          console.log('  ✅ Project updated successfully');
          projectsExtracted++;
        }
      } else {
        // Insert new project
        const { error: insertError } = await supabase
          .from('projects')
          .insert(project);
        
        if (insertError) {
          console.error('  ❌ Insert error:', insertError);
        } else {
          console.log('  ✅ New project added successfully');
          projectsExtracted++;
        }
      }
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 EXTRACTION COMPLETE!');
  console.log(`Documents Processed: ${documentsProcessed}`);
  console.log(`Projects Extracted: ${projectsExtracted}`);
  console.log(`Success Rate: ${Math.round((projectsExtracted / documentsProcessed) * 100)}%`);

  // Get total projects in database
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal Projects in Database: ${count}`);
}

// Run extraction
extractProjectsFromDocuments().catch(console.error);