#!/usr/bin/env npx tsx
/**
 * Continuous Mining Project Extractor
 * Fetches real document content and extracts project data
 * Validates 40% metrics threshold and focuses on NI 43-101 & S-K 1300
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  validateDocumentMetrics,
  extractFinancialMetrics,
  calculateExtractionConfidence,
  MINING_METRICS
} from '../lib/mining-metrics-extractor';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Fetch HTML content from URL
 */
async function fetchHTMLContent(url: string): Promise<string | null> {
  try {
    // Add timeout and headers
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MiningDataExtractor/1.0)'
      },
      maxContentLength: 50 * 1024 * 1024, // 50MB max
    });

    if (response.data) {
      // Parse HTML and extract text
      const $ = cheerio.load(response.data);
      
      // Remove scripts and styles
      $('script').remove();
      $('style').remove();
      
      // Get text content
      let text = $('body').text() || $.root().text();
      
      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();
      
      return text;
    }
    return null;
  } catch (error) {
    console.error('Error fetching HTML:', error.message);
    return null;
  }
}

/**
 * Enhanced metric extraction with context
 */
function extractMetricsWithContext(text: string): Record<string, any> {
  const metrics = extractFinancialMetrics(text);
  
  // Enhanced extraction for specific patterns
  const enhancedPatterns = [
    // NPV with discount rate context
    {
      key: 'post_tax_npv_usd_m',
      pattern: /(?:after[\s-]?tax|post[\s-]?tax)\s*NPV(?:\s*@?\s*\d+%)?[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)/gi
    },
    // IRR with specific context
    {
      key: 'irr_percent',
      pattern: /(?:after[\s-]?tax|post[\s-]?tax)\s*IRR[^\d]*([\d.]+)\s*%/gi
    },
    // Initial capital with variations
    {
      key: 'capex_usd_m',
      pattern: /(?:initial|upfront|pre[\s-]?production|total)\s*(?:capital|capex|investment)[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)/gi
    },
    // Mine life variations
    {
      key: 'mine_life_years',
      pattern: /(?:mine\s*life|LOM|life\s*of\s*mine|project\s*life)[^\d]*([\d.]+)\s*(?:year|yr)/gi
    },
    // Annual production with units
    {
      key: 'annual_production_tonnes',
      pattern: /(?:annual|average\s*annual|yearly)\s*(?:production|throughput)[^\d]*([\d,]+(?:\.\d+)?)\s*(?:Mtpa|Mt\/year|million\s*tonnes?|kt\/year)/gi,
      multiplier: (unit: string) => {
        if (unit.includes('M') || unit.includes('million')) return 1000000;
        if (unit.includes('k')) return 1000;
        return 1;
      }
    }
  ];

  for (const { key, pattern, multiplier } of enhancedPatterns) {
    if (!metrics[key]) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const match = matches[0];
        let value = parseFloat(match[1].replace(/[,$]/g, ''));
        if (!isNaN(value)) {
          if (multiplier && match[0]) {
            value *= multiplier(match[0]);
          }
          metrics[key] = value;
        }
      }
    }
  }

  // Extract commodity if not present
  if (!metrics.commodity) {
    const commodities = ['gold', 'copper', 'silver', 'lithium', 'uranium', 'nickel', 'zinc', 'iron', 'cobalt', 'graphite'];
    for (const commodity of commodities) {
      if (text.toLowerCase().includes(commodity)) {
        metrics.primary_commodity = commodity;
        break;
      }
    }
  }

  return metrics;
}

/**
 * Extract project information from document
 */
function extractProjectInfo(text: string, doc: any): {
  projectName: string;
  country: string;
  jurisdiction: string;
  stage: string;
} {
  // Project name extraction
  let projectName = 'Unknown Project';
  const projectPatterns = [
    /(?:the\s+)?([A-Z][\w\s]+?)\s+(?:Project|Mine|Property|Deposit|Operation)/gi,
    /Technical\s+Report\s+on\s+(?:the\s+)?([A-Z][\w\s]+?)(?:\s+Project|\s+Mine|\s+Property)?/gi,
    /([A-Z][\w\s]+?)\s+(?:Gold|Copper|Silver|Lithium|Uranium|Nickel|Zinc)\s+(?:Project|Mine)/gi
  ];

  for (const pattern of projectPatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      projectName = match[1].trim();
      break;
    }
  }

  // Location extraction
  let country = 'Unknown';
  let jurisdiction = 'Unknown';
  
  const locationPatterns = [
    { pattern: /(?:located\s+in|situated\s+in)\s+([\w\s]+),\s*([\w\s]+)/gi, type: 'jurisdiction_country' },
    { pattern: /([\w\s]+)\s+(?:Province|State|Territory),\s*([\w\s]+)/gi, type: 'jurisdiction_country' },
    { pattern: /\b(Ontario|Quebec|British Columbia|Alberta|Nevada|Arizona|Alaska|Western Australia|Queensland)\b/gi, type: 'jurisdiction' }
  ];

  for (const { pattern, type } of locationPatterns) {
    const match = pattern.exec(text);
    if (match) {
      if (type === 'jurisdiction_country' && match[1] && match[2]) {
        jurisdiction = match[1].trim();
        country = match[2].trim();
        break;
      } else if (type === 'jurisdiction' && match[1]) {
        jurisdiction = match[1];
        // Map jurisdiction to country
        if (['Ontario', 'Quebec', 'British Columbia', 'Alberta'].includes(jurisdiction)) {
          country = 'Canada';
        } else if (['Nevada', 'Arizona', 'Alaska'].includes(jurisdiction)) {
          country = 'USA';
        } else if (['Western Australia', 'Queensland'].includes(jurisdiction)) {
          country = 'Australia';
        }
        break;
      }
    }
  }

  // Project stage extraction
  let stage = 'unknown';
  const stagePatterns = [
    { pattern: /\b(?:exploration[\s-]?stage|early[\s-]?stage|grassroots)\b/gi, stage: 'exploration' },
    { pattern: /\b(?:PEA|preliminary\s+economic\s+assessment|scoping\s+study)\b/gi, stage: 'pea' },
    { pattern: /\b(?:pre[\s-]?feasibility\s+study|PFS)\b/gi, stage: 'pre_feasibility' },
    { pattern: /\b(?:feasibility\s+study|DFS|definitive\s+feasibility|bankable\s+feasibility)\b/gi, stage: 'feasibility' },
    { pattern: /\b(?:construction|development|building|commissioning)\b/gi, stage: 'construction' },
    { pattern: /\b(?:production|operating|commercial\s+production|steady[\s-]?state)\b/gi, stage: 'production' }
  ];

  for (const { pattern, stage: stageValue } of stagePatterns) {
    if (pattern.test(text)) {
      stage = stageValue;
      break;
    }
  }

  // If still unknown, use document name
  if (projectName === 'Unknown Project' && doc.company_name) {
    projectName = `${doc.company_name} ${doc.primary_commodity || 'Mining'} Project`;
  }

  return { projectName, country, jurisdiction, stage };
}

/**
 * Process a document and extract project data
 */
async function processDocumentToProject(doc: any): Promise<any | null> {
  try {
    console.log(`\n🔍 Processing: ${doc.company_name} - ${doc.form_type}`);
    console.log(`  📅 Filed: ${doc.filing_date}`);
    console.log(`  📄 Pages: ${doc.page_count || 'N/A'}`);

    // Skip if already processed
    if (doc.processing_status === 'project_extracted') {
      console.log('  ⏭️ Already processed');
      return null;
    }

    // Fetch document content
    let content = null;
    if (doc.html_link) {
      console.log('  🌐 Fetching HTML content...');
      content = await fetchHTMLContent(doc.html_link);
    }

    if (!content) {
      // Use description as fallback
      content = doc.form_description || '';
      
      // Skip if too short
      if (content.length < 100) {
        console.log('  ❌ No meaningful content available');
        return null;
      }
    }

    console.log(`  📝 Content length: ${content.length} characters`);

    // Validate 40% metrics threshold
    const validation = validateDocumentMetrics(content);
    console.log(`  📏 Metrics coverage: ${validation.percentage}% (${validation.metricsFound}/${validation.totalMetrics})`);
    
    if (!validation.isValid) {
      console.log('  ❌ Below 40% threshold - skipping');
      return null;
    }

    // Extract metrics
    const metrics = extractMetricsWithContext(content);
    const confidence = calculateExtractionConfidence(metrics);
    
    console.log(`  🎯 Extraction confidence: ${confidence}%`);
    
    if (confidence < 40) {
      console.log('  ❌ Low confidence - skipping');
      return null;
    }

    // Extract project information
    const { projectName, country, jurisdiction, stage } = extractProjectInfo(content, doc);
    
    console.log(`  🏆 Project: ${projectName}`);
    console.log(`  📍 Location: ${jurisdiction}, ${country}`);
    console.log(`  🔄 Stage: ${stage}`);

    // Key metrics summary
    if (metrics.capex_usd_m) console.log(`  💵 CAPEX: $${metrics.capex_usd_m}M`);
    if (metrics.post_tax_npv_usd_m) console.log(`  📈 NPV: $${metrics.post_tax_npv_usd_m}M`);
    if (metrics.irr_percent) console.log(`  📊 IRR: ${metrics.irr_percent}%`);
    if (metrics.mine_life_years) console.log(`  ⏳ Mine Life: ${metrics.mine_life_years} years`);

    // Build project record
    const project = {
      project_name: projectName,
      company_name: doc.company_name,
      company_id: doc.company_id || null,
      country,
      jurisdiction,
      primary_commodity: metrics.primary_commodity || doc.primary_commodity,
      stage: metrics.stage || stage,
      
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
      contained_metal: metrics.contained_metal || null,
      contained_metal_unit: metrics.contained_metal_unit || null,
      
      // Operating costs
      opex_usd_per_tonne: metrics.opex_usd_per_tonne || null,
      aisc_usd_per_tonne: metrics.aisc_usd_per_tonne || null,
      
      // Source information
      technical_report_url: doc.pdf_link || doc.html_link,
      technical_report_date: doc.filing_date,
      data_source: `QuoteMedia-${doc.form_type}`,
      extraction_confidence: confidence,
      processing_status: 'extracted',
      
      // Timestamps
      discovery_date: new Date().toISOString(),
      last_scraped_at: new Date().toISOString(),
      
      // Description
      project_description: `${projectName} is a ${stage}-stage ${metrics.primary_commodity || doc.primary_commodity || 'mining'} project ` +
                          `located in ${jurisdiction}, ${country}. ` +
                          `Data extracted from ${doc.form_type} report filed on ${doc.filing_date}. ` +
                          (metrics.mine_life_years ? `Expected mine life: ${metrics.mine_life_years} years. ` : '') +
                          (metrics.capex_usd_m ? `Initial capital: $${metrics.capex_usd_m}M. ` : '') +
                          (validation.foundMetrics.length > 0 ? `Key metrics found: ${validation.foundMetrics.slice(0, 5).join(', ')}.` : '')
    };

    // Update document as processed
    await supabase
      .from('quotemedia_links')
      .update({ processing_status: 'project_extracted' })
      .eq('filing_id', doc.filing_id);

    return project;
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return null;
  }
}

/**
 * Main continuous extraction function
 */
async function continuousProjectExtraction() {
  console.log('🚀 CONTINUOUS MINING PROJECT EXTRACTION');
  console.log('='.repeat(60));
  console.log('Focus: NI 43-101 and S-K 1300 technical reports');
  console.log('Validation: 40% metrics threshold required');
  console.log('Process: Fetch HTML → Validate → Extract → Store\n');

  // Get unprocessed high-quality documents
  const { data: documents, error } = await supabase
    .from('quotemedia_links')
    .select('*')
    .gte('document_quality_score', 40)
    .gte('page_count', 100)
    .or('processing_status.is.null,processing_status.neq.project_extracted')
    .order('filing_date', { ascending: false })
    .limit(500);

  if (error || !documents) {
    console.error('Error fetching documents:', error);
    return;
  }

  console.log(`📁 Found ${documents.length} documents to process\n`);

  let projectsAdded = 0;
  let projectsUpdated = 0;
  let documentsProcessed = 0;
  let errors = 0;

  for (const doc of documents) {
    documentsProcessed++;
    
    // Extract project
    const project = await processDocumentToProject(doc);
    
    if (project) {
      // Check if project exists
      const { data: existing } = await supabase
        .from('projects')
        .select('project_id, extraction_confidence')
        .eq('project_name', project.project_name)
        .eq('company_name', project.company_name)
        .single();

      if (existing) {
        // Update only if new confidence is higher
        if (project.extraction_confidence > (existing.extraction_confidence || 0)) {
          const { error: updateError } = await supabase
            .from('projects')
            .update(project)
            .eq('project_id', existing.project_id);
          
          if (!updateError) {
            console.log('  ✅ Project updated with better data');
            projectsUpdated++;
          } else {
            console.error('  ❌ Update failed:', updateError.message);
            errors++;
          }
        } else {
          console.log('  ⏭️ Existing project has better data');
        }
      } else {
        // Insert new project
        const { error: insertError } = await supabase
          .from('projects')
          .insert(project);
        
        if (!insertError) {
          console.log('  ✅ New project added to database');
          projectsAdded++;
        } else {
          console.error('  ❌ Insert failed:', insertError.message);
          errors++;
        }
      }
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Progress update every 10 documents
    if (documentsProcessed % 10 === 0) {
      console.log(`\n📦 Progress: ${documentsProcessed}/${documents.length} documents processed`);
      console.log(`  ✅ New projects: ${projectsAdded}`);
      console.log(`  🔄 Updated projects: ${projectsUpdated}`);
      console.log(`  ❌ Errors: ${errors}\n`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('\n🏁 EXTRACTION COMPLETE!');
  console.log('=========================\n');
  console.log(`📄 Documents Processed: ${documentsProcessed}`);
  console.log(`✅ New Projects Added: ${projectsAdded}`);
  console.log(`🔄 Projects Updated: ${projectsUpdated}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`🎯 Success Rate: ${Math.round(((projectsAdded + projectsUpdated) / documentsProcessed) * 100)}%`);

  // Get total projects
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total Projects in Database: ${count}`);

  // Show sample of recent projects
  const { data: recentProjects } = await supabase
    .from('projects')
    .select('project_name, company_name, primary_commodity, stage, capex_usd_m, post_tax_npv_usd_m, irr_percent')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentProjects && recentProjects.length > 0) {
    console.log('\n🆕 Recent Projects Added:');
    for (const proj of recentProjects) {
      console.log(`\n  🏆 ${proj.project_name} (${proj.company_name})`);
      console.log(`     Commodity: ${proj.primary_commodity} | Stage: ${proj.stage}`);
      if (proj.capex_usd_m) console.log(`     CAPEX: $${proj.capex_usd_m}M`);
      if (proj.post_tax_npv_usd_m) console.log(`     NPV: $${proj.post_tax_npv_usd_m}M`);
      if (proj.irr_percent) console.log(`     IRR: ${proj.irr_percent}%`);
    }
  }
}

// Run continuous extraction
continuousProjectExtraction().catch(console.error);