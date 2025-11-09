# Quick Test: Get Fresh Token and Run NI 43-101 Search

## 🚀 Steps to See Sample Documents

### Step 1: Get Fresh Token (30 seconds)

1. Go to: https://api.refinitiv.com/
2. Sign in: `anish@lithos-ai.com` / `123@Ninja`
3. Navigate to any endpoint (e.g., `/data/filings/v1`)
4. Look at the Python code sample
5. Copy the Bearer token (everything after `'Authorization': 'Bearer `)

### Step 2: Run Test Script

```bash
# Replace YOUR_FRESH_TOKEN with the token from Step 1
REFINITIV_BEARER_TOKEN="YOUR_FRESH_TOKEN" npx tsx scripts/test-ni43101-search.ts
```

## 📊 What You'll See

The script will test **5 different GraphQL queries**:

### Test 1: Basic DocumentMaster
- Verifies GraphQL API is working
- Returns 3 sample documents

### Test 2: SEDAR Filings Filter
- Searches specifically for Canadian (SEDAR) filings
- Returns 5 results

### Test 3: Search "43-101" in Title
- Looks for documents with "43-101" in the title
- **This should find actual NI 43-101 reports!**
- Returns up to 10 documents

### Test 4: SEDAR Technical Reports
- Combines SEDAR source + Technical Report type
- Returns 10 results

### Test 5: Sample Filings List
- Just lists 3 random filings to see structure
- Helps understand response format

## 📄 Expected Output

```
🔍 Testing NI 43-101 GraphQL Search Queries

✅ Token found: eyJhbGci...

============================================================
Testing: Test 1: Basic DocumentMaster Query
============================================================

Query:
  query TestDocumentMaster { ... }

------------------------------------------------------------
Status: 200 OK
✅ Success!

Results:
{
  "DocumentMaster": [
    {
      "ObjectId": "...",
      "Document": {
        "DocumentId": "...",
        "TitleText": {
          "Value": "Document Title Here"
        }
      }
    },
    ...
  ]
}

... (continues for all 5 tests)
```

## 🎯 What We're Looking For

### Success Indicators:
- ✅ `Status: 200 OK`
- ✅ `"data"` object with results
- ✅ `FinancialFilingId` values we can use for retrieval
- ✅ Documents with "43-101" or "Technical Report" in title

### If We Find NI 43-101 Documents:
```json
{
  "FinancialFiling": [
    {
      "FilingDocument": {
        "FinancialFilingId": "12345678901",  // ← Use this to download!
        "DocumentSummary": {
          "DocumentTitle": "NI 43-101 Technical Report - Malartic Mine",
          "FeedName": "SEDAR",
          "DocumentType": "Technical Report",
          "FilingDate": "2023-03-15",
          "PageCount": 250
        }
      },
      "FilingOrganization": {
        "CommonName": "Agnico Eagle Mines Limited"
      }
    }
  ]
}
```

### Then Download It:
```bash
# Using the FinancialFilingId from results
curl "https://api.refinitiv.com/data/filings/v1/retrieval/search/filingId/12345678901" \
  -H "ClientID: API_Playground" \
  -H "X-Api-Key: 155d9dbf-f0ac-46d9-8b77-f7f6dcd238f8" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 If Queries Fail

The script will show:
- ❌ Which query failed
- Error message
- Line/column of GraphQL syntax error

We can then adjust the query structure based on the error messages.

## 📝 After Running

**If successful**, you'll see:
1. Sample document titles and metadata
2. FinancialFilingIds to download documents
3. Which query structure works best

**Share the output** and I can:
- Parse the results
- Identify actual NI 43-101 documents
- Create a bulk download script for those specific documents

---

**Ready to run when you have a fresh token!** 🚀

Just paste the new bearer token and run:
```bash
REFINITIV_BEARER_TOKEN="paste_here" npx tsx scripts/test-ni43101-search.ts
```
