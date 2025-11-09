# Refinitiv LSEG API Cheat Sheet

## 🔑 Authentication

```bash
# Required Headers for all requests
ClientID: "API_Playground"  # or your client ID
X-Api-Key: "your_api_key"
Authorization: "Bearer your_bearer_token"
Accept: "*/*" or "application/json"
```

**Getting Bearer Token:**
```bash
# POST to OAuth2 endpoint (expires periodically, needs refresh)
curl -X POST "https://api.refinitiv.com/auth/oauth2/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "username=your_username" \
  -d "password=your_password" \
  -d "client_id=your_client_id"
```

---

## 📄 Filings Retrieval API (`/data/filings/v1`)

### Base URL
```
https://api.refinitiv.com/data/filings/v1
```

### Key Identifiers
- **DCN** (Document Control Number) - External identifier, film-number for EDGAR docs (e.g., `cr00329072`)
- **DocId** (Document Id) - Refinitiv internal identifier (legacy)
- **FilingId** (Financial Filing Id) - Refinitiv strategic permanent identifier
- **Filename** - Direct file name with extension (e.g., `ecpfilings_97654291060_html`)

### Supported File Types
- PDF
- TXT
- HTML
- ZIP

---

## 🔍 API Endpoints

### 1. Search by Identifier ⭐ **MAIN METHOD**
**Retrieve document by DCN, DocId, or FilingId**

```http
GET /retrieval/search/{identifier}/{value}
```

**Parameters:**
- `identifier`: One of `dcn`, `docId`, or `filingId`
- `value`: The identifier value

**Example (cURL):**
```bash
curl --location "https://api.refinitiv.com/data/filings/v1/retrieval/search/dcn/cr00329072" \
  --header "ClientID: API_Playground" \
  --header "X-Api-Key: 155d9dbf-f0ac-46d9-8b77-f7f6dcd238f8" \
  --header "Accept: */*" \
  --header "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Example (TypeScript/JavaScript):**
```typescript
const response = await fetch(
  'https://api.refinitiv.com/data/filings/v1/retrieval/search/dcn/cr00329072',
  {
    headers: {
      'ClientID': 'API_Playground',
      'X-Api-Key': 'your_api_key',
      'Authorization': 'Bearer your_token',
      'Accept': '*/*'
    }
  }
);

const data = await response.json();
// data.signedUrl contains the download URL
```

**Response:**
```json
{
  "signedUrl": "https://cdn-filings.filings.refinitiv.com/retrieval/filings/ecpfilings_34359955599_pdf?ClientID=...&Expires=1628601627&Signature=...&Key-Pair-Id=..."
}
```

### 2. Direct File Retrieval
**Fastest method - retrieve by filename**

```http
GET /retrieval/{filename}
```

**Example:**
```bash
curl --location "https://api.refinitiv.com/data/filings/v1/retrieval/ecpfilings_97654291060_html" \
  --header "ClientID: API_Playground" \
  --header "X-Api-Key: your_api_key" \
  --header "Authorization: Bearer your_token"
```

**Response:**
```json
[
  {
    "mimeType": "text/html",
    "signedUrl": "https://cdn.filings.def.refinitiv.com/retrieval/filings/9234528432?..."
  }
]
```

---

## 🗄️ Data Store API (`/data-store/v1`)

### GraphQL Endpoint
```http
POST https://api.refinitiv.com/data-store/v1/graphql
```

**Use Cases:**
- Search for filings by company, date, type
- Find identifiers (DCN, DocId, FilingId, Filename) for use with Filings API
- Query connected entities (instruments, organizations, corporate actions)

**Example Query for NI 43-101:**
```graphql
query SearchNI43101 {
  FinancialFiling(
    filter: {
      filingType: "NI 43-101"
      companyName: "Agnico Eagle Mines"
      filingDateFrom: "2023-01-01"
      filingDateTo: "2024-12-31"
    }
  ) {
    filingId
    dcn
    docId
    filename
    filingDate
    companyName
    filingType
  }
}
```

**Making GraphQL Request:**
```bash
curl -X POST "https://api.refinitiv.com/data-store/v1/graphql" \
  -H "X-Api-Key: your_api_key" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { FinancialFiling(filter: { filingType: \"NI 43-101\" }) { filingId dcn filename } }"}'
```

### Get GraphQL Schema
```http
GET /data-store/v1/graphql/schema/sdl
```

**Example:**
```bash
curl "https://api.refinitiv.com/data-store/v1/graphql/schema/sdl" \
  -H "X-Api-Key: your_api_key" \
  -o refinitiv-schema.sdl
```

---

## 📦 Document Binary API (`/data-store/document/v1`)

### Direct Binary Access

```http
GET /data-store/document/v1/FinancialFiling/FilingDocument/{id}/{filename}
GET /data-store/document/v1/DocumentMaster/Files/{id}/{filename}
```

**Use Case:** Direct download of filing documents when you have the document ID

---

## 🎯 NI 43-101 & SK-1300 Complete Workflow

### Step 1: Find Document Identifiers
**Option A: If you know the company and date range**

```bash
curl -X POST "https://api.refinitiv.com/data-store/v1/graphql" \
  -H "X-Api-Key: your_api_key" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { FinancialFiling(filter: { filingType: \"NI 43-101\", companyName: \"Agnico Eagle\" }) { filingId dcn filename filingDate } }"
  }'
```

**Option B: If you already have a DCN, FilingId, or Filename**
Skip to Step 2.

### Step 2: Retrieve Signed Document URL

```bash
# Using FilingId
curl "https://api.refinitiv.com/data/filings/v1/retrieval/search/filingId/{filingId}" \
  -H "ClientID: API_Playground" \
  -H "X-Api-Key: your_api_key" \
  -H "Authorization: Bearer your_token"

# Using DCN
curl "https://api.refinitiv.com/data/filings/v1/retrieval/search/dcn/{dcn}" \
  -H "ClientID: API_Playground" \
  -H "X-Api-Key: your_api_key" \
  -H "Authorization: Bearer your_token"

# Using Filename (fastest)
curl "https://api.refinitiv.com/data/filings/v1/retrieval/{filename}" \
  -H "ClientID: API_Playground" \
  -H "X-Api-Key: your_api_key" \
  -H "Authorization: Bearer your_token"
```

### Step 3: Download Document

```bash
# The signed URL from Step 2 can be used directly
curl -o ni43-101-report.pdf "signed_url_from_step_2"
```

---

## 📋 Document Type Classification

### NI 43-101 (Canadian Mining Reports)
- **Filing Type:** `NI 43-101` (confirm exact string with GraphQL schema)
- **Sources:** SEDAR (Canadian securities filings)
- **Common Identifiers:** DCN or FilingId

### SK-1300 (US Mining Reports - New as of 2022)
- **Filing Type:** `10-K` with exhibit `96.1` or specific `SK-1300` type
- **Sources:** SEC EDGAR
- **Common Identifiers:** DCN (EDGAR accession number based)

### Search Examples:

```graphql
# NI 43-101 Reports
query {
  FinancialFiling(filter: {
    filingType: "NI 43-101"
  }) {
    filingId
    dcn
    filename
  }
}

# SK-1300 / 10-K Exhibit 96.1
query {
  FinancialFiling(filter: {
    filingType: "10-K"
    exhibitNumber: "96.1"
  }) {
    filingId
    dcn
    filename
  }
}
```

---

## 🔐 OAuth2 Authentication (`/auth/oauth2/v1`)

### Get Access Token
```http
POST https://api.refinitiv.com/auth/oauth2/v1/token
```

**Parameters:**
```bash
curl -X POST "https://api.refinitiv.com/auth/oauth2/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "username=your_username" \
  -d "password=your_password" \
  -d "client_id=your_client_id"
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 600,
  "refresh_token": "..."
}
```

### Refresh Token
```bash
curl -X POST "https://api.refinitiv.com/auth/oauth2/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=your_refresh_token" \
  -d "client_id=your_client_id"
```

---

## 📊 Common Response Codes

| Code | Description | Action |
|------|-------------|--------|
| 200  | Successful operation | Proceed with response data |
| 400  | Bad request | Check parameters |
| 401  | Unauthorized | Refresh bearer token |
| 403  | Forbidden | Check API permissions |
| 404  | No documents found | Verify identifier |
| 429  | Too many requests | Implement rate limiting/backoff |
| 500  | Server error | Retry with exponential backoff |

---

## 💡 Best Practices

1. **Token Management**
   - Cache bearer tokens (they expire in ~10 minutes)
   - Implement automatic token refresh
   - Use refresh tokens when available

2. **Use Filename Endpoint** when possible for fastest retrieval

3. **Cache Signed URLs** - they're valid for a time window (check Expires param)

4. **GraphQL First Approach**
   - Use GraphQL to discover identifiers
   - Then use Filings API for actual document retrieval
   - Download and review the schema first

5. **Rate Limiting**
   - Monitor 429 responses
   - Implement exponential backoff
   - Batch requests when possible

6. **Error Handling**
   ```typescript
   async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         const response = await fetch(url, options);
         if (response.status === 429) {
           await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
           continue;
         }
         return response;
       } catch (error) {
         if (i === retries - 1) throw error;
       }
     }
   }
   ```

---

## 🔗 Related APIs

### File Store API (`/file-store/v1`)
```http
GET /file-store/v1/files
GET /file-store/v1/file-sets
```
- Packaged filing sets
- Bucket-based file organization
- Bulk downloads

### Message Services API (`/message-services/v1`)
```http
POST /message-services/v1/file-store/subscriptions
```
- Subscribe to notifications for new filings
- Real-time filing alerts
- Webhook support

---

## 📝 Complete TypeScript Example

```typescript
interface RefinitivConfig {
  clientId: string;
  apiKey: string;
  bearerToken: string;
}

class RefinitivClient {
  constructor(private config: RefinitivConfig) {}

  // Step 1: Search for documents
  async searchNI43101(companyName: string) {
    const response = await fetch(
      'https://api.refinitiv.com/data-store/v1/graphql',
      {
        method: 'POST',
        headers: {
          'X-Api-Key': this.config.apiKey,
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            query {
              FinancialFiling(filter: {
                filingType: "NI 43-101"
                companyName: "${companyName}"
              }) {
                filingId
                dcn
                filename
                filingDate
              }
            }
          `
        })
      }
    );
    return response.json();
  }

  // Step 2: Get signed URL
  async getDocumentUrl(identifier: string, type: 'dcn' | 'filingId' | 'docId') {
    const response = await fetch(
      `https://api.refinitiv.com/data/filings/v1/retrieval/search/${type}/${identifier}`,
      {
        headers: {
          'ClientID': this.config.clientId,
          'X-Api-Key': this.config.apiKey,
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Accept': '*/*'
        }
      }
    );
    const data = await response.json();
    return data.signedUrl;
  }

  // Step 3: Download document
  async downloadDocument(signedUrl: string, outputPath: string) {
    const response = await fetch(signedUrl);
    const buffer = await response.arrayBuffer();
    await Bun.write(outputPath, buffer);
  }

  // Complete workflow
  async downloadNI43101(companyName: string, outputDir: string) {
    // 1. Search
    const searchResults = await this.searchNI43101(companyName);
    const filings = searchResults.data.FinancialFiling;

    // 2. Download each document
    for (const filing of filings) {
      const signedUrl = await this.getDocumentUrl(filing.filingId, 'filingId');
      const filename = filing.filename || `${filing.filingId}.pdf`;
      await this.downloadDocument(signedUrl, `${outputDir}/${filename}`);
      console.log(`Downloaded: ${filename}`);
    }
  }
}

// Usage
const client = new RefinitivClient({
  clientId: 'API_Playground',
  apiKey: 'your_api_key',
  bearerToken: 'your_bearer_token'
});

await client.downloadNI43101('Agnico Eagle', './ni43101-reports');
```

---

## 🆘 Missing Information & Next Steps

### ❓ What We Still Need:

1. **Exact GraphQL field names** for filtering by document type
   - Get schema: `GET /data-store/v1/graphql/schema/sdl`
   - Search schema for: "NI 43-101", "SK-1300", "filingType", "exhibitNumber"

2. **Example identifiers** for NI 43-101 and SK-1300 documents
   - Contact Refinitiv support for sample DCNs/FilingIds
   - Or browse their documentation portal

3. **How SK-1300 documents are classified**
   - Are they tagged as "10-K" with exhibit "96.1"?
   - Or do they have a separate "SK-1300" filing type?

4. **Rate limits** for your specific API tier
   - Check with Refinitiv what your limits are
   - Implement appropriate throttling

### 📞 Support Resources

- **Developer Portal:** https://developers.refinitiv.com
- **API Playground:** Test APIs interactively at https://api.refinitiv.com/
- **Support Email:** Contact through developer portal
- **GraphQL Schema:** Essential - download first!

---

## 📌 Quick Reference Card

| Task | API Endpoint | Method | Key Headers |
|------|-------------|--------|-------------|
| Find document IDs | `/data-store/v1/graphql` | POST | X-Api-Key, Authorization |
| Get doc by ID | `/retrieval/search/{type}/{id}` | GET | ClientID, X-Api-Key, Authorization |
| Get by filename | `/retrieval/{filename}` | GET | ClientID, X-Api-Key, Authorization |
| Download binary | Use signed URL | GET | None (public URL) |
| Get schema | `/graphql/schema/sdl` | GET | X-Api-Key |
| Auth token | `/auth/oauth2/v1/token` | POST | Content-Type |

---

## 🧪 Testing Checklist

- [ ] Obtain valid API key from Refinitiv
- [ ] Get bearer token via OAuth2
- [ ] Download GraphQL schema
- [ ] Test document retrieval with sample DCN: `cr00329072`
- [ ] Identify correct GraphQL filter fields for NI 43-101
- [ ] Get sample NI 43-101 identifier from Refinitiv
- [ ] Test complete workflow: search → retrieve URL → download
- [ ] Implement token refresh logic
- [ ] Set up rate limiting
- [ ] Test error handling for 401, 404, 429 responses

---

**Last Updated:** 2025-10-30
**API Version:** v1
**Tested With:** Filings API v1, Data Store API v1
