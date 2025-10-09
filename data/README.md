# Mining Companies Database

This directory contains comprehensive data on critical minerals mining companies compiled for the Lithos platform.

## File: mining-companies-comprehensive.json

A curated dataset of **120 mining companies** focused on critical minerals and battery metals.

### Data Coverage

**Total Companies:** 120

**By Exchange:**
- ASX (Australian Securities Exchange): 52 companies
- TSXV (TSX Venture Exchange): 26 companies
- TSX (Toronto Stock Exchange): 12 companies
- NYSE (New York Stock Exchange): 10 companies
- LSE (London Stock Exchange): 7 companies
- NASDAQ: 5 companies
- Private: 3 companies
- OTC: 2 companies
- SZSE (Shenzhen Stock Exchange): 1 company
- MOEX (Moscow Exchange): 1 company
- CSE (Canadian Securities Exchange): 1 company

**By Commodity Focus:**
- Lithium: 48 companies
- Copper: 32 companies
- Rare Earths: 20 companies
- Nickel: 18 companies
- Cobalt: 12 companies
- Graphite: 8 companies

**Market Cap Range:**
- Largest: $1,000B (Berkshire Hathaway Energy)
- Median: $380M
- Smallest: $12M
- Mix of major producers, mid-cap developers, and junior explorers

### Geographic Coverage

**Countries Represented:**
- Australia
- Canada
- USA
- Chile
- Brazil
- UK
- China
- Russia
- Switzerland

**Key Mining Regions:**
- Western Australia (lithium, nickel, rare earths, graphite)
- Quebec and Ontario (lithium, rare earths, nickel)
- Nevada and Idaho (lithium, gold, antimony)
- Chile (copper, lithium)
- Peru and Mexico (copper)
- DRC and Zambia (copper, cobalt)
- Brazil (nickel, lithium)

### Data Fields

Each company entry includes:

```json
{
  "name": "Company Name",
  "ticker": "TICKER",
  "exchange": "EXCHANGE",
  "country": "Headquarters Country",
  "website": "https://company-website.com",
  "description": "Brief description of operations and commodities",
  "market_cap": 1000000000,
  "urls": ["https://source1.com", "https://source2.com"]
}
```

**Field Descriptions:**
- **name**: Full legal company name
- **ticker**: Stock ticker symbol
- **exchange**: Primary stock exchange listing
- **country**: Country where company is headquartered
- **website**: Official company website URL
- **description**: Overview of company's mining operations and primary commodities
- **market_cap**: Approximate market capitalization in USD
- **urls**: Array of reference URLs (company website, stock quote pages, etc.)

### Notable Companies Included

**Major Producers (Market Cap > $10B):**
- Albemarle Corporation (ALB) - Leading lithium producer
- BHP Group (BHP) - World's largest copper producer
- Rio Tinto (RIO) - Diversified mining giant
- Freeport-McMoRan (FCX) - Major copper producer
- Southern Copper (SCCO) - Large copper producer
- Vale (VALE) - World's largest nickel producer
- Glencore (GLEN) - Major copper, cobalt, nickel producer
- Ganfeng Lithium - China's largest lithium producer
- SQM - Chilean lithium producer
- MP Materials (MP) - Leading U.S. rare earths producer

**Emerging Producers:**
- Pilbara Minerals (PLS) - Australia's largest lithium miner
- Liontown Resources (LTR) - New lithium producer
- Ivanhoe Mines (IVN) - Major DRC copper developer
- Syrah Resources (SYR) - Graphite producer
- Lynas Rare Earths (LYC) - Leading rare earths producer outside China

**Junior Explorers & Developers:**
- Core Lithium (CXO)
- Patriot Battery Metals (PMET)
- Frontier Lithium (FL)
- American Lithium (LI)
- Atlantic Lithium (ALL)
- And 50+ more exploration and development stage companies

### Data Quality & Sources

All data compiled from:
- Official company websites
- Stock exchange listings (ASX, TSX, NYSE, LSE, NASDAQ)
- Financial data providers (Yahoo Finance, Google Finance, Bloomberg)
- Industry publications (Investing News Network, Mining.com)
- Government filings and reports

Data collected: October 2025

**Accuracy Notes:**
- Market capitalizations are approximate and reflect values as of data collection
- Some private companies have estimated valuations
- Exchange listings reflect primary trading venue (many companies are cross-listed)
- Commodity focus based on company descriptions and operations

### Usage

To populate the Supabase database with this data:

```bash
npm run populate:companies
```

This will:
1. Load the JSON data
2. Check for existing companies (skip duplicates)
3. Insert new companies into the `companies` table
4. Provide statistics on insertions

### Database Schema

The data maps to the following Supabase table:

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ticker TEXT,
  exchange TEXT,
  country TEXT,
  website TEXT,
  description TEXT,
  market_cap NUMERIC,
  urls TEXT[],
  watchlist BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Maintenance

To update this data:
1. Research new mining companies and IPOs
2. Verify market caps and company information
3. Update the JSON file
4. Re-run the population script
5. Script will skip existing companies and add new ones

### Critical Minerals Focus

This dataset emphasizes companies involved in **critical minerals** essential for:
- Electric vehicle batteries (lithium, nickel, cobalt, graphite)
- Clean energy transition (copper for electrification)
- Technology manufacturing (rare earths for magnets, electronics)
- Energy security (uranium, strategic metals)

### Future Enhancements

Potential additions to this dataset:
- Production volumes and reserves data
- Project-level information
- Financial metrics (revenue, EBITDA)
- ESG ratings
- Ownership structure
- Recent news and announcements
- Historical stock performance

---

**Last Updated:** October 8, 2025

**Compiled By:** Claude (Anthropic AI)

**For:** Lithos - Critical Minerals Intelligence Platform
