# How to Get Refinitiv OAuth2 Credentials

## 🎯 What You Need

You're missing **2 critical pieces** to access the Refinitiv APIs:

1. **OAuth2 Client ID** - A unique identifier for your application
2. **OAuth2 Client Secret** - A secret key for authentication

## ✅ What You Already Have

- ✅ **API Key:** `155d9dbf-f0ac-46d9-8b77-f7f6dcd238f8`
- ✅ **Account:** `anish@lithos-ai.com`
- ✅ **Password:** `123@Ninja`
- ✅ **Portal Access:** https://developers.refinitiv.com
- ✅ **250 APIs** listed in your account

---

## 📝 Step-by-Step Instructions

### Step 1: Log Into Developer Portal

1. Go to: **https://developers.refinitiv.com**
2. Click "Sign In" (top right)
3. Enter credentials:
   - **Email:** `anish@lithos-ai.com`
   - **Password:** `123@Ninja`

### Step 2: Navigate to AppKey Generator

Look for one of these sections in the portal:
- **"AppKey Generator"** (as shown in your screenshot)
- **"My Apps"**
- **"Applications"**
- **"Credentials"**
- **"OAuth2 Apps"**

### Step 3: Create New Application

Click **"Create New Application"** or **"Generate New AppKey"**

**Fill in the form:**

| Field | Value |
|-------|-------|
| **Application Name** | `Lithos Mining Documents API` |
| **Description** | `Automated extraction of NI 43-101 and SK-1300 technical reports for mining projects` |
| **Application Type** | `Server Application` or `Machine-to-Machine` |
| **Grant Type** | `Client Credentials` |
| **Redirect URIs** | Leave empty (not needed for server apps) |

### Step 4: Select Required APIs

**Check these APIs (CRITICAL):**

- ✅ **Filings Retrieval** (`/data/filings/v1`)
- ✅ **Data Store / GraphQL** (`/data-store/v1`)
- ✅ **Document Store** (`/data-store/document/v1`) - if available

**Optional but useful:**
- ✅ **Message Services** (`/message-services/v1`) - for new filing notifications
- ✅ **File Store** (`/file-store/v1`) - for bulk downloads

### Step 5: Select Scopes/Permissions

**Required Scopes:**
- ✅ `trapi.data.filings.retrieval`
- ✅ `trapi.data.store`

**Additional Scopes (if available):**
- ✅ `trapi.data.sedar` - Canadian filings
- ✅ `trapi.data.edgar` - US filings
- ✅ `trapi.data.technical-reports`

### Step 6: Save and Generate Credentials

Click **"Create"** or **"Generate"**

**You should receive:**

```
✅ Application Created Successfully!

Client ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Client Secret: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy

⚠️ SAVE THESE NOW - Client Secret shown only once!
```

**IMMEDIATELY COPY BOTH VALUES!**

---

## 🔍 Where to Find It in the Portal

Based on your screenshot, look for these menu items:

### Main Navigation:
- **"AppKey Generator"** ← Most likely location
- **"Developer Portal"** → **"My Apps"**
- **"APIs"** → **"My APIs"** → **"Credentials"**

### If You Can't Find It:

**Try searching for:**
- "Create Application"
- "OAuth2"
- "Credentials"
- "Client ID"
- "App Registration"

**Or contact support:**
- Look for **"Support"** or **"Help"** link in the portal
- Email: Usually `api.support@lseg.com` or found in portal
- Live chat: May be available in the portal

---

## 🧪 Test Your Credentials

Once you have the Client ID and Client Secret:

### Quick Test:

```bash
# Replace YOUR_CLIENT_ID and YOUR_CLIENT_SECRET with actual values
curl -X POST "https://api.refinitiv.com/auth/oauth2/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 600,
  "scope": "trapi.data.filings.retrieval trapi.data.store"
}
```

### Using Our Scripts:

```bash
# Add to your .env file
echo 'REFINITIV_CLIENT_ID="your-client-id"' >> .env
echo 'REFINITIV_CLIENT_SECRET="your-client-secret"' >> .env
echo 'REFINITIV_API_KEY="155d9dbf-f0ac-46d9-8b77-f7f6dcd238f8"' >> .env

# Test authentication
npx tsx scripts/refinitiv-auth-test.ts

# If successful, extract NI 43-101 documents
npx tsx scripts/refinitiv-ni43101-extractor.ts
```

---

## ❓ Common Issues & Solutions

### Issue 1: "AppKey Generator" Not Found

**Try:**
1. Check under different menu names: "Apps", "Applications", "My Apps"
2. Search the portal for "OAuth2" or "Credentials"
3. Contact support and ask: "How do I create OAuth2 credentials for API access?"

### Issue 2: No "Create Application" Button

**Possible reasons:**
- Your account type doesn't have permission
- APIs need to be subscribed to first
- Contact your account administrator

**Solution:**
- Contact Refinitiv support
- Ask to enable "Application Registration" for your account

### Issue 3: APIs Not Listed

**If you can't find `/data/filings/v1` in the API list:**

1. Go to **"API Catalog"** or **"Browse APIs"**
2. Search for: `filings` or `data-store`
3. Click **"Subscribe"** or **"Add to My APIs"**
4. Then create the application

### Issue 4: Account Limitations

**Some accounts may have restrictions:**
- **Trial accounts:** Limited API access
- **Educational accounts:** May not include filing data
- **Demo accounts:** May only access sample data

**Solution:**
- Check your account type in portal
- May need to upgrade to production account
- Contact sales/support if needed

---

## 📞 Refinitiv Support Contact

### If You Get Stuck:

**Option 1: Portal Support**
- Look for **"Support"** or **"Help"** button in the portal
- Usually has live chat or ticket submission

**Option 2: Email Support**
- Find the support email in the portal footer
- Subject: "OAuth2 Credentials for Filings API Access"
- Include: Your account email and use case

**Option 3: Account Manager**
- If you have a dedicated account manager
- They can provision credentials directly

### What to Tell Support:

```
Subject: Need OAuth2 Credentials for API Access

Hello,

I need help creating OAuth2 application credentials to access the
Refinitiv APIs programmatically.

Account Details:
- Email: anish@lithos-ai.com
- API Key: 155d9dbf-f0ac-46d9-8b77-f7f6dcd238f8

Use Case:
- Extract NI 43-101 and SK-1300 technical reports
- Automated server-side document retrieval
- Building mining project database

APIs Needed:
- /data/filings/v1 (Filings Retrieval)
- /data-store/v1 (GraphQL Data Access)

Request:
Please guide me on how to generate OAuth2 Client ID and Client Secret
for server-to-server authentication, or provision them for my account.

Thank you!
```

---

## 🎯 What to Do Right Now

### Action Plan:

1. **[ ] Log into:** https://developers.refinitiv.com
2. **[ ] Find:** "AppKey Generator" or "My Apps" section
3. **[ ] Create:** New OAuth2 application
4. **[ ] Copy:** Client ID and Client Secret
5. **[ ] Save:** Credentials to `.env` file
6. **[ ] Test:** Run `npx tsx scripts/refinitiv-auth-test.ts`
7. **[ ] Extract:** Run `npx tsx scripts/refinitiv-ni43101-extractor.ts`

### If It Works:
✅ You'll be able to download 100+ NI 43-101 technical reports immediately!

### If It Doesn't Work:
📧 Contact Refinitiv support with the template above

---

## 📊 What Happens After You Get Credentials

### Immediate (Same Day):
1. ✅ Authentication working
2. ✅ Download GraphQL schema
3. ✅ Test document retrieval (sample docs)
4. ✅ Verify NI 43-101 access

### Next Day:
1. ✅ Search for NI 43-101 documents
2. ✅ Download 10-20 sample PDFs
3. ✅ Upload to Supabase storage
4. ✅ Link to projects in database

### This Week:
1. ✅ Download 100+ NI 43-101 reports
2. ✅ Extract structured data
3. ✅ Build search interface
4. ✅ Set up automated monitoring

**Everything is ready to go - we just need those 2 credentials!**

---

## 🔐 Security Note

**Keep your credentials safe:**
- ✅ Store in `.env` file (not committed to git)
- ✅ Never share Client Secret
- ✅ Treat like a password
- ✅ Rotate if compromised

**Our scripts already handle this:**
- Credentials read from environment variables
- Not hardcoded in any files
- `.env` is in `.gitignore`

---

**Last Updated:** 2025-10-30
**Status:** Awaiting OAuth2 Client ID and Client Secret
**Next Step:** Access Developer Portal → Create Application → Copy Credentials
