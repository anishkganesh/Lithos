const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Realistic mining companies
const companies = [
  { name: 'Barrick Gold Corporation', ticker: 'GOLD', exchange: 'NYSE' },
  { name: 'Newmont Corporation', ticker: 'NEM', exchange: 'NYSE' },
  { name: 'Freeport-McMoRan', ticker: 'FCX', exchange: 'NYSE' },
  { name: 'BHP Group', ticker: 'BHP', exchange: 'ASX' },
  { name: 'Rio Tinto', ticker: 'RIO', exchange: 'LSE' },
  { name: 'Anglo American', ticker: 'AAL', exchange: 'LSE' },
  { name: 'Glencore', ticker: 'GLEN', exchange: 'LSE' },
  { name: 'Vale S.A.', ticker: 'VALE', exchange: 'NYSE' },
  { name: 'Lithium Americas', ticker: 'LAC', exchange: 'TSX' },
  { name: 'Albemarle Corporation', ticker: 'ALB', exchange: 'NYSE' }
];

// Project templates - using only 'Exploration' as it's the only valid enum value
const projectTemplates = [
  { commodity: 'Gold', stages: ['Exploration'] },
  { commodity: 'Copper', stages: ['Exploration'] },
  { commodity: 'Lithium', stages: ['Exploration'] },
  { commodity: 'Silver', stages: ['Exploration'] },
  { commodity: 'Nickel', stages: ['Exploration'] }
];

// Locations
const locations = [
  { country: 'Canada', jurisdictions: ['Ontario', 'Quebec', 'British Columbia', 'Yukon'] },
  { country: 'Australia', jurisdictions: ['Western Australia', 'Queensland', 'New South Wales'] },
  { country: 'Chile', jurisdictions: ['Antofagasta', 'Atacama', 'Coquimbo'] },
  { country: 'Peru', jurisdictions: ['Arequipa', 'Cusco', 'Cajamarca'] },
  { country: 'USA', jurisdictions: ['Nevada', 'Arizona', 'Alaska', 'Utah'] }
];

async function populateDemoProjects() {
  console.log('Creating demo mining projects...\n');
  
  let created = 0;
  let errors = 0;
  
  // Create 5 new projects
  for (let i = 0; i < 5; i++) {
    const company = companies[Math.floor(Math.random() * companies.length)];
    const template = projectTemplates[Math.floor(Math.random() * projectTemplates.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const jurisdiction = location.jurisdictions[Math.floor(Math.random() * location.jurisdictions.length)];
    
    // First, ensure company exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('company_id')
      .eq('company_name', company.name)
      .single();
    
    let companyId;
    if (!existingCompany) {
      const { data: newCompany } = await supabase
        .from('companies')
        .insert({
          company_name: company.name,
          stock_ticker: company.ticker,
          exchange: company.exchange,
          headquarters_country: location.country
        })
        .select()
        .single();
      
      companyId = newCompany?.company_id;
    } else {
      companyId = existingCompany.company_id;
    }
    
    // Create project
    const projectName = `${jurisdiction} ${template.commodity} Project ${Date.now() + i}`;
    
    const project = {
      project_name: projectName,
      company_name: company.name,
      company_id: companyId,
      country: location.country,
      jurisdiction: jurisdiction,
      stage: 'Exploration', // Always use Exploration as it's the only valid enum
      primary_commodity: template.commodity,
      post_tax_npv_usd_m: Math.floor(Math.random() * 500) + 100,
      irr_percent: Math.floor(Math.random() * 30) + 15,
      capex_usd_m: Math.floor(Math.random() * 500) + 100,
      mine_life_years: Math.floor(Math.random() * 20) + 5,
      annual_production_tonnes: Math.floor(Math.random() * 100000) + 10000,
      project_description: `An exploration stage ${template.commodity.toLowerCase()} mining project in ${jurisdiction}, ${location.country}`,
      data_source: 'Demo',
      source_document_url: `https://example.com/report-${Date.now()}.pdf`,
      extraction_confidence: 0.95,
      created_at: new Date().toISOString(),
      discovery_date: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select();
    
    if (error) {
      errors++;
      console.error(`❌ Error creating ${projectName}:`, error.message);
    } else {
      created++;
      console.log(`✅ Created: ${projectName}`);
      console.log(`   Company: ${company.name}`);
      console.log(`   Location: ${jurisdiction}, ${location.country}`);
      console.log(`   Stage: Exploration`);
      console.log(`   NPV: $${project.post_tax_npv_usd_m}M\n`);
    }
  }
  
  // Get final count
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n📊 Summary:');
  console.log(`   Created: ${created} projects`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total projects in database: ${count}`);
}

populateDemoProjects();
