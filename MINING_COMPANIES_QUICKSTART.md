# Mining Companies Database - Quick Start Guide

## Overview

This repository now contains a comprehensive database of **120 critical minerals mining companies** ready to populate your Supabase database.

## What's Included

### 1. Data File
**Location:** `/data/mining-companies-comprehensive.json`

- 120 mining companies
- Focus on critical minerals: lithium, copper, nickel, cobalt, rare earths, graphite
- Coverage: ASX, TSX/TSXV, NYSE, NASDAQ, LSE
- Mix of major producers ($100B+ market cap) to junior explorers ($10M+ market cap)

### 2. Population Script
**Location:** `/scripts/populate-mining-companies.ts`

- TypeScript script to load data into Supabase
- Checks for duplicates (skips existing companies by ticker + exchange)
- Provides detailed statistics and reporting
- Safe to run multiple times

### 3. Package Script
Added to `package.json`:
```json
"populate:companies": "tsx scripts/populate-mining-companies.ts"
```

## Quick Start

### Step 1: Verify Database Migration

Ensure the `companies` table exists in your Supabase database:

```bash
npm run migrate:db
```

This should run migration: `/supabase/migrations/006_create_companies_table.sql`

### Step 2: Populate the Database

Run the population script:

```bash
npm run populate:companies
```

**What it does:**
1. Loads 120 companies from the JSON file
2. Checks each company against existing database records
3. Inserts new companies (skips duplicates)
4. Reports statistics by exchange, commodity, market cap

**Expected output:**
```
======================================================================
POPULATING MINING COMPANIES DATABASE
======================================================================

📂 Loading data from: /path/to/data/mining-companies-comprehensive.json
✅ Loaded 120 companies

📊 Current database status:
   Existing companies: 0

📥 Inserting companies...
======================================================================
   ✅ Inserted: Albemarle Corporation (ALB.NYSE)
   ✅ Inserted: Sociedad Química y Minera de Chile S.A. (SQM.NYSE)
   ...

======================================================================
POPULATION COMPLETE
======================================================================

📊 Summary:
   Companies inserted: 120
   Companies skipped: 0
   Errors: 0
   Total in database: 120

📈 Companies by Exchange:
   ASX: 52
   TSXV: 26
   TSX: 12
   NYSE: 10
   LSE: 7
   ...

💰 Top 10 Companies by Market Cap:
   1. Berkshire Hathaway Energy (BRK.B.NYSE): $1000.0B
   2. BHP Group (BHP.ASX): $212.8B
   3. Rio Tinto (RIO.LSE): $81.1B
   ...

🔬 Companies by Primary Commodity:
   lithium: 48
   copper: 32
   rare earths: 20
   nickel: 18
   cobalt: 12
   graphite: 8
```

### Step 3: Verify in Your Application

The companies should now be available in your application:

1. Check the dashboard/companies page
2. Query the database:
```typescript
const { data: companies } = await supabase
  .from('companies')
  .select('*')
  .order('market_cap', { ascending: false })
```

## Data Breakdown

### By Exchange
- **ASX** (52): Dominated by lithium and rare earths producers in Australia
- **TSXV** (26): Junior explorers in lithium, rare earths, and battery metals
- **TSX** (12): Mid-cap producers and developers
- **NYSE** (10): Major global producers
- **LSE** (7): International mining companies
- **NASDAQ** (5): Emerging producers and developers

### By Commodity
- **Lithium** (48): From major producers (Albemarle, SQM, Pilbara) to junior explorers
- **Copper** (32): Major miners (BHP, Rio Tinto, Freeport) and emerging producers
- **Rare Earths** (20): Including MP Materials, Lynas, and various developers
- **Nickel** (18): From Vale and Glencore to junior explorers
- **Cobalt** (12): Often co-produced with nickel and copper
- **Graphite** (8): Natural graphite producers and synthetic anode manufacturers

### By Market Cap
- **Mega-cap** (>$100B): BHP, Berkshire Hathaway Energy
- **Large-cap** ($10B-$100B): Rio Tinto, Freeport, Vale, Glencore, etc.
- **Mid-cap** ($1B-$10B): Pilbara Minerals, Ivanhoe Mines, Mineral Resources
- **Small-cap** ($100M-$1B): Many ASX and TSXV developers
- **Micro-cap** (<$100M): Junior explorers

## Company Highlights

### Major Lithium Producers
- **Albemarle (ALB)** - Global leader, operations in Chile, Australia, US
- **SQM** - Chilean lithium from Atacama
- **Ganfeng Lithium** - China's largest producer
- **Pilbara Minerals (PLS)** - Australia's biggest lithium miner
- **Mineral Resources (MIN)** - Wodgina operation

### Major Copper Producers
- **BHP** - World's largest copper producer
- **Freeport-McMoRan** - Major producer in Americas and Indonesia
- **Southern Copper** - Extensive Peru and Mexico operations
- **Ivanhoe Mines** - Kamoa-Kakula in DRC (world-class deposit)

### Rare Earths Leaders
- **MP Materials** - Only US integrated producer (Mountain Pass)
- **Lynas Rare Earths** - Leading non-China producer
- **Iluka Resources** - Developing Eneabba refinery

### Emerging Producers
- **Liontown Resources** - New Kathleen Valley lithium operation
- **Sigma Lithium** - Brazil operations
- **Syrah Resources** - Balama graphite (Mozambique)

## Use Cases

### 1. Company Screening
Filter companies by:
- Exchange listing
- Market cap range
- Commodity focus
- Geographic region

### 2. Watchlist Management
The `watchlist` field allows users to:
- Add companies to a personal watchlist
- Track specific companies of interest
- Create custom portfolios

### 3. Market Analysis
Analyze the critical minerals sector:
- Compare market caps across exchanges
- Identify emerging producers
- Track commodity exposure

### 4. Integration with Mining Agent
Use this database as a foundation for:
- News monitoring for specific companies
- Document extraction (Exhibit 96.1 reports)
- Project-level analysis
- Supply chain mapping

## Next Steps

### Enhance the Database

Consider adding additional fields:
```sql
ALTER TABLE companies ADD COLUMN production_volume NUMERIC;
ALTER TABLE companies ADD COLUMN reserves NUMERIC;
ALTER TABLE companies ADD COLUMN resources NUMERIC;
ALTER TABLE companies ADD COLUMN primary_commodity TEXT;
ALTER TABLE companies ADD COLUMN secondary_commodities TEXT[];
ALTER TABLE companies ADD COLUMN project_names TEXT[];
```

### Update Data Regularly

Companies data should be refreshed periodically:
1. Update market caps (monthly)
2. Add new IPOs and listings (quarterly)
3. Update company descriptions and projects (as needed)
4. Remove delisted or acquired companies

### Connect to Other Features

Link companies to:
- News articles (track company mentions)
- SEC filings (Exhibit 96.1 technical reports)
- Projects (company -> projects relationship)
- Chat/AI features (company-specific insights)

## Troubleshooting

### Database Connection Issues
Ensure `.env.local` contains:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Duplicate Companies
The script checks for duplicates by `ticker` + `exchange`. If you need to re-populate:
1. Clear existing data:
```sql
DELETE FROM companies;
```
2. Re-run the population script

### Missing Dependencies
Ensure all dependencies are installed:
```bash
npm install
```

## Data Quality Notes

- Market caps are approximate (as of October 2025)
- Some private companies have estimated valuations
- Exchange listings reflect primary trading venue
- Company descriptions are concise summaries
- URLs include company website and reference sources

## Support

For questions or issues:
1. Check `/data/README.md` for detailed data documentation
2. Review the population script: `/scripts/populate-mining-companies.ts`
3. Verify database schema: `/supabase/migrations/006_create_companies_table.sql`

---

**Ready to use!** Run `npm run populate:companies` to get started.
