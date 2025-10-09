# Mining Projects Database

## Overview

This directory contains comprehensive data on **114 real-world critical minerals mining projects** from around the globe. The data has been populated into the `projects` table in the Supabase database.

## Database Statistics

### Project Count by Commodity
- **Lithium**: 42 projects
- **Copper**: 40 projects
- **Nickel**: 15 projects
- **Rare Earths**: 12 projects
- **Gold**: 12 projects
- **Cobalt**: 11 projects
- **Graphite**: 10 projects
- **Molybdenum**: 7 projects
- **Silver**: 7 projects
- **Other minerals**: Tantalum, Zinc, Platinum Group Metals, Potash, Uranium, Boron, and more

### Project Stages
- **Production**: 52 projects (45.6%)
- **Development**: 28 projects (24.6%)
- **Exploration**: 13 projects (11.4%)
- **Pre-Feasibility**: 9 projects (7.9%)
- **Feasibility**: 7 projects (6.1%)
- **Construction**: 4 projects (3.5%)
- **On Hold**: 1 project (0.9%)

### Geographic Distribution
**Top Locations:**
1. Canada: 19 projects
2. Western Australia: 18 projects
3. USA: 17 projects
4. Chile: 13 projects
5. Argentina: 5 projects
6. Democratic Republic of Congo: 5 projects
7. Brazil: 5 projects
8. Peru: 4 projects
9. Australia (other regions): 4 projects
10. South Australia: 3 projects
11. Mali: 3 projects

### Top Companies by Project Count
1. **Glencore plc**: 6 projects
2. **BHP Group Limited**: 5 projects
3. **Rio Tinto Group**: 5 projects
4. **Anglo American plc**: 4 projects
5. **IGO Limited**: 3 projects
6. **Ivanhoe Mines Ltd.**: 3 projects
7. **Teck Resources Limited**: 3 projects
8. **Vale S.A.**: 3 projects

## Data Files

### `mining-projects-comprehensive.json`
Complete dataset of 122 mining projects with the following fields:
- `company_name`: Name of the operating company
- `name`: Project name
- `location`: Geographic location (country/region)
- `stage`: Development stage (Exploration, Development, Production, etc.)
- `commodities`: Array of commodities produced/targeted
- `resource_estimate`: Summary of resource estimate
- `reserve_estimate`: Summary of proven/probable reserves (if available)
- `ownership_percentage`: Company's ownership stake (0-100%)
- `status`: Project status (Active, On Hold, Closed)
- `description`: Brief project description
- `urls`: Array of reference URLs

## Notable Projects Included

### Major Lithium Projects
- **Greenbushes** (Australia) - World's largest hard-rock lithium mine
- **Pilgangoora** (Australia) - One of the largest spodumene operations
- **Thacker Pass** (Nevada, USA) - Largest known lithium resource in North America
- **Salar de Atacama** (Chile) - World-class brine operations
- **James Bay** (Quebec, Canada) - Major spodumene project under construction
- **Kathleen Valley** (Australia) - New major operation in construction

### Major Copper Projects
- **Escondida** (Chile) - World's largest copper mine
- **Oyu Tolgoi** (Mongolia) - One of the world's largest copper-gold deposits
- **Kamoa-Kakula** (DRC) - Highest-grade major copper mine
- **Grasberg** (Indonesia) - Major copper-gold operation
- **Los Bronces** (Chile) - Major Chilean copper producer

### Major Rare Earth Projects
- **Mountain Pass** (California, USA) - Only operating REE mine in North America
- **Mt Weld** (Australia) - One of the richest REE deposits globally
- **Nolans Bore** (Australia) - NdPr-focused project under development

### Major Nickel Projects
- **Voisey's Bay** (Canada) - World-class Ni-Cu-Co deposit
- **Sudbury** (Canada) - Historic nickel mining district
- **Nova** (Australia) - High-grade Ni-Cu-Co mine

### Major Graphite Projects
- **Balama** (Mozambique) - One of the world's largest natural graphite operations
- **Matawinie** (Quebec, Canada) - Integrated graphite and anode facility
- **Sivior** (Australia) - High-purity graphite project

## Data Sources

Projects data was compiled from:
- Company annual reports and investor presentations
- ASX, TSX, NYSE, and LSE public filings
- NI 43-101 and JORC technical reports
- Mining databases (S&P Global Market Intelligence, Mining.com)
- Company websites and project fact sheets
- Industry publications and news sources

## Population Scripts

### `populate-mining-projects.ts`
TypeScript script to populate the Supabase database with projects data. Features:
- Automatic company matching by name
- Duplicate detection and skipping
- Comprehensive error handling
- Progress tracking and statistics
- Links projects to existing companies in the database

## Usage

To populate or update the projects database:

```bash
npm run tsx scripts/populate-mining-projects.ts
```

The script will:
1. Load project data from `mining-projects-comprehensive.json`
2. Match each project to an existing company in the database
3. Check for duplicates (by project name + company)
4. Insert new projects
5. Display comprehensive statistics

## Data Quality Notes

- All projects are real, operating or proposed mining projects
- Resource and reserve estimates are from the most recent public disclosures
- Project stages reflect status as of data compilation (Q4 2024 - Q1 2025)
- Ownership percentages represent the operating company's stake
- Some projects may have updated information since data compilation

## Integration with Companies Database

All projects are linked to companies in the `companies` table via the `company_id` foreign key. The companies database contains 120+ mining companies from major global exchanges (ASX, TSX, NYSE, LSE, etc.).

## Future Enhancements

Potential additions for future versions:
- Financial metrics (NPV, IRR, capex, opex)
- Production forecasts and timelines
- Environmental and social governance (ESG) data
- Mining method details (underground, open-pit, ISL, etc.)
- Processing technology details
- Offtake agreements and partnerships
- Permitting status and timeline
- Regular data updates from public filings

## Last Updated

Database populated: October 2025
Data current as of: Q1 2025
Total projects: 114

---

**Note**: This is a snapshot dataset for development and analysis purposes. For real-time information, always consult the companies' official disclosures and regulatory filings.
