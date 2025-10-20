# FactSet Document Download - Status Report

## Summary

We've created test scripts to download FactSet mining documents, but we're encountering authentication issues that prevent API access.

## Current Status: ❌ Authentication Blocked

### Error
```
403 Forbidden - User Authorization Failed
```

This error occurs on **ALL** API endpoints, including basic metadata endpoints that should work with valid credentials.

### What This Means

The authentication is failing at the most basic level, which indicates one of:

1. **Credentials May Be Incorrect**
   - Username format might be wrong
   - API key might need to be regenerated
   - There might be a typo in .env.local

2. **Account Not Fully Provisioned**
   - API access might not be enabled for this account
   - The machine account might need additional setup
   - There might be IP whitelist restrictions

3. **Authentication Method Issue**
   - We're using Basic Auth as documented, but there might be additional steps
   - The account might require OAuth2 instead of Basic Auth

## Test Scripts Created

We've created several test scripts to help diagnose and resolve this:

### 1. `scripts/verify-factset-credentials.ts`
**Purpose**: Test basic authentication against FactSet API

**Usage**:
```bash
npx tsx scripts/verify-factset-credentials.ts
```

**What it does**:
- Tests authentication against 4 different endpoints
- Shows exactly which endpoints work and which don't
- Provides clear error messages

**Current Result**: All 4 tests fail with 403 Forbidden

---

### 2. `scripts/test-factset-download-final.ts`
**Purpose**: Search for filings and download documents

**Usage**:
```bash
npx tsx scripts/test-factset-download-final.ts
```

**What it will do (once auth works)**:
- Search for SEDAR/SEDAR+ filings for Canadian mining companies
- Display document metadata (title, date, form type, size)
- Download PDF/HTML documents to `downloads/factset-test/`
- Show which companies have filings available

**Current Result**: Cannot search because authentication fails

---

### 3. `scripts/test-factset-simple.ts`
**Purpose**: Test downloading a specific document using the URL from your email

**Usage**:
```bash
npx tsx scripts/test-factset-simple.ts
```

**What it tests**:
- Direct download from a known filing URL
- Tests if CACCESS error occurs (content access permissions)

**Current Result**: 403 User Authorization Failed (before CACCESS check)

## Next Steps

### Immediate Action Required

**Contact FactSet Support (Misa Kobayashi)**
- Email: misa.kobayashi@factset.com
- Reference: Machine account `LITHOS-2220379`

**Questions to Ask**:

1. **Is the machine account fully provisioned for API access?**
   - We're getting 403 on even basic metadata endpoints
   - Are there additional setup steps required?

2. **Is Basic Authentication the correct method?**
   - Current format: `Basic base64(username:api_key)`
   - Username: `LITHOS-2220379`
   - Do we need OAuth2 instead?

3. **Are there IP restrictions?**
   - Is the API access restricted to certain IP addresses?
   - Do we need to whitelist our IPs?

4. **What is the correct username format?**
   - Should it be `LITHOS-2220379`?
   - Or just the serial number `2220379`?
   - Or something else entirely?

5. **Can you verify the API key is active?**
   - Our current key starts with: `EQOXl4cVpo...`
   - Is this key properly associated with the account?

### What Will Work Once Authentication is Fixed

Once we resolve the 403 error, the scripts will be able to:

1. **Search for filings**
   ```
   ✅ Found 12 filing(s) for Ivanhoe Mines
   ```

2. **Display document metadata**
   ```
   📄 Filing 1:
      Title: NI 43-101 Technical Report - Kamoa-Kakula Project
      Date: 2024-03-15
      Form: Technical Report
      ID: ABC123
      Size: 15.2 MB
   ```

3. **Download documents**
   ```
   📥 Downloading...
   ✅ Downloaded 15234 KB (application/pdf)
   💾 Saved: IVN_1_ABC123.pdf
   ```

4. **Handle CACCESS errors gracefully**
   ```
   ⚠️  CACCESS Permission Required
   Contact FactSet support to enable content access
   ```

## Technical Details

### Authentication Method Used
```typescript
const authHeader = 'Basic ' + Buffer.from(`${username}:${apiKey}`).toString('base64')
```

### Endpoints Tested
```
https://api.factset.com/content/global-filings/v2/meta/sources
https://api.factset.com/content/global-filings/v2/meta/time-zones
https://api.factset.com/content/global-filings/v2/meta/categories
https://api.factset.com/content/global-filings/v2/search
```

All return: `403 Forbidden - User Authorization Failed`

### Expected vs Actual

**Expected** (with valid credentials):
- Metadata endpoints: `200 OK` with JSON data
- Search endpoint: `200 OK` with filing results
- Document download: Either `200 OK` (success) or `403 with CACCESS error` (permission issue)

**Actual**:
- All endpoints: `403 Forbidden - User Authorization Failed`
- This is a broader authentication failure, not a CACCESS issue yet

## Files Created

```
downloads/factset-test/          # Directory for downloaded documents (empty for now)

scripts/verify-factset-credentials.ts     # Credential verification
scripts/test-factset-download-final.ts    # Main download test
scripts/test-factset-simple.ts            # Simple URL test
scripts/test-factset-sdk-v2.ts           # SDK-based approach (had issues)
scripts/test-factset-document-download.ts # Earlier version
```

## Dependencies Installed

```json
{
  "@factset/sdk-globalfilings": "^3.2.0",
  "@factset/sdk-utils": "^2.1.0"
}
```

## Recommendation

**Before proceeding with CACCESS permissions**, we need to resolve the basic authentication issue. Once we can successfully call the search API and get filing results, we can then test document downloads to see if CACCESS permissions are needed.

The verification script (`verify-factset-credentials.ts`) will be your best tool to confirm when authentication is working - it should show `✅ SUCCESS` on all 4 test endpoints.

---

**Date**: 2025-10-20
**Status**: Blocked on authentication - needs FactSet support intervention
**Next Step**: Email Misa Kobayashi with the questions above
