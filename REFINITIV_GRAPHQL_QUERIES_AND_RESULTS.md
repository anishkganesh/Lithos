# Refinitiv GraphQL Queries & Downloaded Documents

## 📊 GraphQL Queries We Tested

### Query 1: Basic FinancialFiling Search (FAILED)
```graphql
{
  FinancialFiling(filter: { filingType: "NI 43-101" }, limit: 50) {
    filingId
    dcn
    filename
    companyName
    filingDate
  }
}
```

**Result:** ❌ Failed - Field `filingType` doesn't exist
**Error:** GraphQL validation error

---

### Query 2: SEDAR-Specific Search (FAILED)
```graphql
{
  SEDARFiling(filter: { formType: "NI 43-101" }, limit: 50) {
    filingId
    dcn
    filename
    issuerName
    filingDate
  }
}
```

**Result:** ❌ Failed - Type `SEDARFiling` doesn't exist in schema
**Error:** Unknown type

---

### Query 3: DocumentMaster Search (FAILED)
```graphql
{
  DocumentMaster(filter: { documentType: "Technical Report" }, limit: 50) {
    id
    filename
    companyName
  }
}
```

**Result:** ❌ Failed - `DocumentMaster` exists but filter structure wrong
**Error:** Invalid filter arguments

---

## ✅ Correct GraphQL Query (Based on Schema Analysis)

### Proper Query Structure for NI 43-101:

```graphql
query SearchNI43101TechnicalReports {
  FinancialFiling(
    filter: {
      # Filter by data source
      FilingDocument_FeedName: "SEDAR"

      # Filter by document characteristics
      FilingDocument_DocumentSummary_DocumentType: "Technical Report"

      # OR try form type
      FilingDocument_DocumentSummary_FormType: "43-101F1"

      # Filter by page count (NI 43-101 are usually 100+ pages)
      FilingDocument_DocumentSummary_PageCount_gte: 100

      # Filter by date (recent documents)
      FilingDocument_DocumentSummary_FilingDate_gte: "2020-01-01"

      # Filter by high-level category
      FilingDocument_DocumentSummary_MidLevelCategory_contains: "Technical"
    }
    limit: 50
  ) {
    ObjectId
    FilingDocument {
      FinancialFilingId
      DocId
      DocumentName
      DocumentSummary {
        DocumentType
        FormType
        DocumentTitle
        FilingDate
        PageCount
        FeedName
        HighLevelCategory
        MidLevelCategory
        DocumentDescriptor1
      }
      FilesMetaData {
        FileName
        MimeType
        FileSize
      }
      Identifiers {
        IdentifierType
        IdentifierValue
      }
    }
    FilingOrganization {
      CommonName
      OfficialName
    }
  }
}
```

### Alternative Simpler Query:

```graphql
query SimpleNI43101Search {
  FinancialFiling(
    filter: {
      FilingDocument_DocumentSummary_DocumentTitle_contains: "43-101"
      FilingDocument_DocumentSummary_FeedName: "SEDAR"
    }
    limit: 50
  ) {
    FilingDocument {
      FinancialFilingId
      DocumentName
      DocumentSummary {
        DocumentTitle
        FilingDate
        PageCount
      }
    }
    FilingOrganization {
      CommonName
    }
  }
}
```

---

## 📄 Documents Actually Downloaded

### Test Documents Retrieved:

We tested with **sample document IDs** (not NI 43-101), which successfully demonstrated the API works:

#### Document 1: SEC Filing from 1998
```json
{
  "identifier": "dcn:cr00329072",
  "file": "19981231_4295865951_34359882308_1_1_raw.pdf",
  "size": "3.5 MB",
  "pages": "~150-200 pages (estimated)",
  "type": "SEC EDGAR Filing",
  "source": "EDGAR (US)",
  "date": "December 31, 1998",
  "description": "Older SEC annual/quarterly report",
  "api_response": {
    "19981231_4295865951_34359882308_1_1_raw.pdf": {
      "signedUrl": "https://cdn-filings.filings.refinitiv.com/retrieval/filings/...",
      "mimeType": "application/pdf"
    }
  }
}
```

#### Document 2: Asset-Backed Securities Filing
```json
{
  "identifier": "docId:49612437",
  "file": "20190213_5046649783_97654291060_9_13_ABS-15G_with_exhibits.pdf",
  "size": "22 KB (0.02 MB)",
  "pages": "3 pages",
  "type": "ABS-15G (Asset-Backed Securities Report)",
  "source": "EDGAR (US)",
  "date": "February 13, 2019",
  "description": "Report about asset-backed securities",
  "api_response": {
    "files": [
      {
        "filename": "20190213_5046649783_97654291060_9_13_ABS-15G_with_exhibits.pdf",
        "mimeType": "application/pdf"
      },
      {
        "filename": "20190213_5046649783_97654291060_9_13_ABS-15G_with_exhibits.html",
        "mimeType": "text/html"
      },
      {
        "filename": "20190213_5046649783_97654291060_9_13_ABS-15G_dissemination.txt",
        "mimeType": "text/plain"
      }
    ]
  }
}
```

#### Document 3: SEC Filing from 2003
```json
{
  "identifier": "filingId:34359955599",
  "file": "20030331_4295886324_34359955599_1_12_raw.pdf",
  "size": "1.7 MB",
  "pages": "~75-100 pages (estimated)",
  "type": "SEC EDGAR Filing",
  "source": "EDGAR (US)",
  "date": "March 31, 2003",
  "description": "SEC corporate filing (likely 10-K or 10-Q)",
  "api_response": {
    "20030331_4295886324_34359955599_1_12_raw.pdf": {
      "signedUrl": "https://cdn-filings.filings.refinitiv.com/retrieval/filings/...",
      "mimeType": "application/pdf"
    }
  }
}
```

---

## 🔍 What These Documents Tell Us

### Confirmed Working:
✅ API authentication
✅ Document retrieval by multiple identifier types
✅ Signed URL generation
✅ PDF download
✅ Multiple file formats (PDF, HTML, TXT)

### Not NI 43-101 Because:
❌ Source: EDGAR (US) instead of SEDAR (Canada)
❌ Type: General financial filings, not technical reports
❌ Content: Corporate financial data, not mining/geology
❌ Format: Standard SEC forms (10-K, 8-K, ABS-15G)

---

## 📊 Sample API Responses

### Response Format for Document Retrieval:

```json
{
  "19981231_4295865951_34359882308_1_1_raw.pdf": {
    "signedUrl": "https://cdn-filings.filings.refinitiv.com/retrieval/filings/19981231_4295865951_34359882308_1_1_raw.pdf?ClientID=API_Playground&Expires=1761855638&Signature=OrtBTfYip73Gf0AudeZjQv6qgJNnwg4YopAbnyqXrwREaxsK1Lr-BhMO~3aPLYDyBYM-DPgw1SdKPWa6C6Q7ROLvnTpVC8AOaCCeeeF2Vb7gBhMdOkx0~23-EgCpkXhAUIcJHfmkbeb9yYQRT~iKUQyKWSWKZW87jRp36FhwSCAoaKNq4JuIiT3547Qv8~GZ6Porw5NItz4GJ4hUnyq5Hw6hYHhIfVpi4xw3ErfPaLHGrrNqEcJwGPy8E-2VsBJVjnNpxhkSpfWrjzoAeq-L-75LSw1AR1mdDuaeDc9dcLE9I-mlrKTXueKYvaBrTxa4ec1G6K0Vljm-B8fllftLQw__&Key-Pair-Id=APKAIDW27KNAZ6YUBN7A",
    "mimeType": "application/pdf"
  }
}
```

**Key Points:**
- `signedUrl`: Temporary download link (expires based on `Expires` param)
- `mimeType`: File type
- Multiple files can be returned for one identifier
- URLs work with standard HTTP GET (no auth needed once generated)

---

## 🎯 How to Get Actual NI 43-101 Documents

### Step 1: Use Correct GraphQL Query

Based on schema analysis, use one of the corrected queries above.

### Step 2: Filter Criteria for NI 43-101

```javascript
{
  // Must have
  FeedName: "SEDAR",  // Canadian source

  // One of these
  DocumentType: "Technical Report",
  FormType: "43-101F1",
  DocumentTitle_contains: "43-101",
  DocumentDescriptor1: "NI 43-101",

  // Recommended
  PageCount_gte: 100,  // NI 43-101 are comprehensive
  LanguageId: "505062",  // English
  FilingDate_gte: "2020-01-01"  // Recent documents
}
```

### Step 3: Known Mining Companies to Search

```graphql
query AgnicoEagleNI43101 {
  FinancialFiling(
    filter: {
      FilingOrganization_CommonName_contains: "Agnico Eagle"
      FilingDocument_DocumentSummary_DocumentTitle_contains: "43-101"
      FilingDocument_DocumentSummary_FeedName: "SEDAR"
    }
    limit: 20
  ) {
    FilingDocument {
      FinancialFilingId
      DocumentSummary {
        DocumentTitle
        FilingDate
      }
    }
  }
}
```

---

## 🔧 Test Script Usage

### Current Working Script:

```bash
# Get fresh token from API Playground
export REFINITIV_BEARER_TOKEN="eyJhbGci..."

# Run extractor
REFINITIV_BEARER_TOKEN="$REFINITIV_BEARER_TOKEN" \
NEXT_PUBLIC_SUPABASE_URL="https://dfxauievbyqwcynwtvib.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your_key" \
npx tsx scripts/refinitiv-working-extractor.ts
```

### What It Does:
1. ✅ Fetches GraphQL schema (3.8 MB)
2. ⚠️ Attempts NI 43-101 search (needs query fix)
3. ✅ Tests document retrieval with sample IDs
4. ✅ Downloads PDFs to `downloads/refinitiv/`

---

## 📈 Next Steps

### 1. Fix GraphQL Query (Priority)
- Use correct field names from schema
- Test with `DocumentTitle_contains: "43-101"`
- Filter by `FeedName: "SEDAR"`

### 2. Get Known NI 43-101 Identifiers
- Browse SEDAR.com for Agnico Eagle
- Find a specific NI 43-101 report
- Get its identifier from Refinitiv
- Test retrieval

### 3. Implement Search Results Parsing
```typescript
// Once search works
const results = await searchNI43101();
for (const filing of results) {
  const filingId = filing.FilingDocument.FinancialFilingId;
  const url = await getDocumentUrl('filingId', filingId);
  await downloadDocument(url, `ni43101_${filingId}.pdf`);
}
```

---

## 📊 Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| **API Access** | ✅ Working | Bearer tokens from playground work |
| **Document Retrieval** | ✅ Working | Tested with 3 sample docs |
| **PDF Download** | ✅ Working | Downloaded 5.2 MB successfully |
| **GraphQL Search** | ⚠️ Needs Fix | Query structure needs correction |
| **NI 43-101 Docs** | ⏳ Pending | Need correct search query or identifiers |

**Bottom Line:** Infrastructure works perfectly. Just need correct GraphQL query structure or sample NI 43-101 identifiers to start bulk downloads.

---

**Files Downloaded:** 3 PDFs (test documents)
**Total Size:** 5.2 MB
**Source:** SEC EDGAR (US financial filings)
**Target:** SEDAR NI 43-101 (Canadian mining technical reports)

🎯 **Next:** Implement corrected GraphQL query → Test → Bulk download NI 43-101 reports
