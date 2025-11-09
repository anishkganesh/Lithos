# Refinitiv NI 43-101 Research & Implementation Guide

## ✅ What We've Confirmed

### Working API Endpoints

1. **Document Retrieval by DCN**
   ```
   GET https://api.refinitiv.com/data/filings/v1/retrieval/search/dcn/cr00329072
   ```

2. **Document Retrieval by DocId**
   ```
   GET https://api.refinitiv.com/data/filings/v1/retrieval/search/docId/49612437
   ```

3. **Document Retrieval by FilingId**
   ```
   GET https://api.refinitiv.com/data/filings/v1/retrieval/search/filingId/34359955599
   ```

### Required Authentication

All requests need:
```bash
ClientID: "API_Playground"
X-Api-Key: "155d9dbf-f0ac-46d9-8b77-f7f6dcd238f8"
Authorization: "Bearer <TOKEN>"  # ⚠️ REQUIRED - Currently missing
```

---

## ❓ What We Still Need

### 1. Bearer Token (URGENT)

**How to get it:**
```bash
curl -X POST "https://api.refinitiv.com/auth/oauth2/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "username=YOUR_REFINITIV_USERNAME" \
  -d "password=YOUR_REFINITIV_PASSWORD" \
  -d "client_id=YOUR_CLIENT_ID"
```

**Token expires in:** ~10 minutes (600 seconds)

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 600,
  "refresh_token": "..."
}
```

### 2. NI 43-101 Document Identifiers

We need to find **DCN, DocId, or FilingId** values for actual NI 43-101 reports.

**Possible sources:**
- Refinitiv GraphQL API (once authenticated)
- SEDAR (System for Electronic Document Analysis and Retrieval) - Canadian filings
- Company websites and investor relations pages
- Refinitiv support/documentation

### 3. GraphQL Schema & Query Structure

Need to determine:
- Correct field names for NI 43-101 filtering
- Available metadata fields
- How to filter by document size (100+ pages)
- How to filter by filing jurisdiction (Canadian/US)

---

## 🎯 Target Mining Companies for NI 43-101 Reports

### Tier 1: Major Gold Producers
| Company | Known Projects | Expected NI 43-101 |
|---------|---------------|-------------------|
| Agnico Eagle Mines | Canadian Malartic, LaRonde, Detour Lake | ✅ Yes |
| Barrick Gold | Hemlo, Goldstrike, Cortez | ✅ Yes |
| Newmont | Éléonore, Musselwhite, Red Lake | ✅ Yes |
| Kinross Gold | Fort Knox, Tasiast, Paracatu | ✅ Yes |
| Kirkland Lake Gold | Fosterville, Macassa | ✅ Yes (merged with Agnico) |

### Tier 2: Mid-Tier Producers
| Company | Known Projects | Expected NI 43-101 |
|---------|---------------|-------------------|
| B2Gold | Fekola, Masbate, Otjikoto | ✅ Yes |
| Eldorado Gold | Lamaque, Olympias | ✅ Yes |
| IAMGOLD | Westwood, Côté Gold | ✅ Yes |
| Osisko Mining | Windfall Lake | ✅ Yes |
| Pretium Resources | Brucejack | ✅ Yes |

### Tier 3: Base Metals & Diversified
| Company | Known Projects | Expected NI 43-101 |
|---------|---------------|-------------------|
| Lundin Mining | Candelaria, Eagle, Neves-Corvo | ✅ Yes |
| First Quantum Minerals | Cobre Panama, Sentinel | ✅ Yes |
| Teck Resources | Highland Valley, Red Dog | ✅ Yes |
| Hudbay Minerals | Constancia, Snow Lake | ✅ Yes |
| Ivanhoe Mines | Kamoa-Kakula, Platreef | ✅ Yes |

---

## 📊 Research Strategy

### Phase 1: Authenticate & Test (CURRENT)

```typescript
// 1. Get bearer token
const tokenResponse = await fetch(
  'https://api.refinitiv.com/auth/oauth2/v1/token',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      username: REFINITIV_USERNAME,
      password: REFINITIV_PASSWORD,
      client_id: CLIENT_ID
    })
  }
);

const { access_token } = await tokenResponse.json();

// 2. Test with known identifiers
const testIds = [
  { type: 'dcn', value: 'cr00329072' },
  { type: 'docId', value: '49612437' },
  { type: 'filingId', value: '34359955599' }
];

for (const id of testIds) {
  const docUrl = await getDocument(id.type, id.value, access_token);
  await downloadAndAnalyze(docUrl);
}
```

### Phase 2: Discover NI 43-101 Identifiers

**Method A: GraphQL Search**
```graphql
query {
  FinancialFiling(
    filter: {
      # Try these field variations:
      filingType: "NI 43-101"
      # OR
      documentType: "Technical Report"
      # OR
      regulatoryForm: "43-101F1"
    }
    limit: 100
  ) {
    filingId
    dcn
    docId
    filename
    companyName
    filingDate
    pageCount
  }
}
```

**Method B: SEDAR Cross-Reference**
1. Query SEDAR for recent NI 43-101 filings
2. Extract company names and filing dates
3. Cross-reference with Refinitiv using company name + date

**Method C: Company-Specific Search**
```graphql
query {
  Company(name: "Agnico Eagle Mines") {
    filings(type: "NI 43-101") {
      filingId
      dcn
      reportTitle
      filingDate
    }
  }
}
```

### Phase 3: Bulk Download (100+ Reports)

```typescript
async function bulkDownloadNI43101(companies: string[]) {
  for (const company of companies) {
    // 1. Search for company's NI 43-101 reports
    const reports = await searchReports(company);

    // 2. Filter for documents > 100 pages
    const largeDocs = reports.filter(r => r.pageCount > 100);

    // 3. Download and process
    for (const doc of largeDocs) {
      await downloadAndProcess(doc);
    }
  }
}
```

### Phase 4: Extract & Store Metadata

```typescript
interface NI43101Metadata {
  // Report identification
  filingId: string;
  dcn: string;
  companyName: string;
  projectName: string;
  reportDate: string;

  // Location
  country: string;
  province: string;
  latitude: number;
  longitude: number;

  // Mineral resources
  mineralTypes: string[];
  measuredResources: Record<string, number>;
  indicatedResources: Record<string, number>;
  inferredResources: Record<string, number>;

  // Technical details
  authors: string[];
  qualifiedPersons: string[];
  cutOffGrade: number;
  miningMethod: string;

  // Economic data
  netPresentValue: number;
  internalRateOfReturn: number;
  paybackPeriod: number;
  capitalCost: number;
  operatingCost: number;
}
```

---

## 🔬 Example: Complete Workflow for One Project

### Target: Agnico Eagle - Canadian Malartic Project

**Step 1: Find Document**
```bash
# Search by company name
curl -X POST "https://api.refinitiv.com/data-store/v1/graphql" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { FinancialFiling(filter: { companyName: \"Agnico Eagle\", filingType: \"NI 43-101\" }) { filingId dcn filename } }"
  }'
```

**Step 2: Retrieve Document**
```bash
# Use the filingId from Step 1
curl "https://api.refinitiv.com/data/filings/v1/retrieval/search/filingId/XXXXXX" \
  -H "ClientID: API_Playground" \
  -H "X-Api-Key: 155d9dbf-f0ac-46d9-8b77-f7f6dcd238f8" \
  -H "Authorization: Bearer ${TOKEN}"

# Response: { "signedUrl": "https://..." }
```

**Step 3: Download PDF**
```bash
curl -o canadian-malartic-ni43101.pdf "${SIGNED_URL}"
```

**Step 4: Extract Key Sections**
```typescript
const report = await parsePDF('canadian-malartic-ni43101.pdf');

const sections = {
  summary: extractSection(report, 'Executive Summary'),
  mineralResources: extractTable(report, 'Mineral Resource Statement'),
  mineralReserves: extractTable(report, 'Mineral Reserve Statement'),
  economics: extractSection(report, 'Economic Analysis'),
  location: extractCoordinates(report),
  authors: extractQualifiedPersons(report)
};
```

**Step 5: Store in Database**
```typescript
await supabase.from('technical_documents').insert({
  company_name: 'Agnico Eagle Mines',
  project_name: 'Canadian Malartic',
  document_type: 'NI 43-101',
  filing_date: '2023-03-31',
  pdf_url: supabaseUrl,
  source: 'Refinitiv LSEG',
  metadata: sections
});

await supabase.from('projects').update({
  technical_report_url: supabaseUrl,
  mineral_resources: sections.mineralResources,
  mineral_reserves: sections.mineralReserves,
  npv: sections.economics.npv
}).eq('name', 'Canadian Malartic');
```

---

## 📝 Implementation Checklist

### Immediate (Need to complete to proceed)
- [ ] Obtain Refinitiv username/password
- [ ] Generate bearer token
- [ ] Test token with known document IDs
- [ ] Download at least 1 sample NI 43-101 PDF

### Short-term (This week)
- [ ] Download GraphQL schema
- [ ] Identify correct field names for NI 43-101 filtering
- [ ] Create list of 50+ NI 43-101 document identifiers
- [ ] Download and verify 10-20 NI 43-101 reports
- [ ] Set up automated token refresh

### Medium-term (This month)
- [ ] Build PDF parsing pipeline for NI 43-101 structure
- [ ] Extract structured data (resources, reserves, economics)
- [ ] Download 100+ NI 43-101 reports for major projects
- [ ] Link reports to projects in database
- [ ] Create search/filter interface for reports

### Long-term (Ongoing)
- [ ] Set up monitoring for new NI 43-101 filings
- [ ] Automate download of new reports
- [ ] Build comparative analysis tools
- [ ] Track changes across report updates
- [ ] Build ML model to extract key metrics

---

## 🚨 Known Issues & Solutions

### Issue 1: 401 Unauthorized
**Problem:** Bearer token missing or expired

**Solution:**
```typescript
class TokenManager {
  private token: string | null = null;
  private expiresAt: number = 0;

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt) {
      return this.token;
    }

    // Fetch new token
    const response = await fetch(tokenUrl, { /* auth params */ });
    const data = await response.json();

    this.token = data.access_token;
    this.expiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 1min buffer

    return this.token;
  }
}
```

### Issue 2: Unknown GraphQL Schema
**Problem:** Don't know field names for filtering

**Solution:**
```bash
# Download schema
curl "https://api.refinitiv.com/data-store/v1/graphql/schema/sdl" \
  -H "X-Api-Key: 155d9dbf-f0ac-46d9-8b77-f7f6dcd238f8" \
  -o schema.sdl

# Search schema for relevant types
grep -A 20 "type FinancialFiling" schema.sdl
grep -i "43-101\|technical\|report" schema.sdl
```

### Issue 3: No Document Identifiers
**Problem:** Don't have DCN/FilingId values for NI 43-101 docs

**Solution:**
1. Contact Refinitiv support for sample identifiers
2. Use SEDAR API to find recent filings
3. Browse company investor relations pages
4. Use GraphQL once authenticated to search

---

## 📞 Next Steps & Support

### Critical Information Needed:
1. **Refinitiv Credentials**
   - Username
   - Password
   - Client ID (if different from API_Playground)

2. **Sample NI 43-101 Identifiers**
   - Request from Refinitiv support
   - Or: guidance on how to search their system

3. **GraphQL Documentation**
   - Field names for document filtering
   - Pagination limits
   - Rate limits

### Contact Points:
- **Refinitiv Developer Portal:** https://developers.refinitiv.com
- **Support:** Through developer portal
- **Documentation:** API reference docs in portal

---

## 💡 Alternative Approach: SEDAR Direct

If Refinitiv access is limited, we can also get NI 43-101 reports directly from SEDAR:

```typescript
// SEDAR API (if available)
const sedarUrl = 'https://www.sedarplus.ca/csa-party/records/document.html';

// Or scrape SEDAR+ website
const companies = ['Agnico Eagle Mines', 'Barrick Gold', ...];

for (const company of companies) {
  const filings = await fetchSEDARFilings(company, {
    category: 'Technical Report',
    filingType: 'NI 43-101'
  });

  for (const filing of filings) {
    const pdf = await downloadSEDARDocument(filing.documentId);
    // Process and store
  }
}
```

---

**Last Updated:** 2025-10-30
**Status:** Awaiting bearer token & document identifiers
**Priority:** HIGH - Blocking bulk extraction
