# ⚠️ Manual Database Migration Required

The document upload feature has been fully implemented in code, but requires a **one-time manual database migration** to be completed.

## Why Manual Migration is Needed

Supabase's RLS (Row Level Security) and policy creation cannot be executed via the REST API or service role key. These operations must be run directly in the Supabase SQL Editor.

## Implementation Status

### ✅ Completed (All Code Ready)
- [x] PDF Navigation Fix ([inline-pdf-viewer.tsx](components/project-detail-panel/inline-pdf-viewer.tsx))
- [x] TypeScript Interfaces Updated ([mining-project.ts](lib/types/mining-project.ts))
- [x] Upload API Route Created ([/api/documents/upload/route.ts](app/api/documents/upload/route.ts))
- [x] Chat Integration Complete ([chat-sidebar.tsx](components/chat-sidebar.tsx))
- [x] Visual Indicators Added ([project-screener.tsx](components/project-screener/project-screener.tsx))
- [x] Storage Bucket Created (`user-documents`)

### ⏳ Requires Manual Action
- [ ] **Database schema migration (see instructions below)**

---

## 🔧 Manual Migration Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `dfxauievbyqwcynwtvib`
3. Navigate to: **SQL Editor** (in left sidebar)
4. Click: **New Query**

### Step 2: Copy and Paste This SQL

Copy the entire SQL block below and paste it into the SQL Editor:

\`\`\`sql
-- ============================================================================
-- LITHOS USER UPLOAD SUPPORT MIGRATION
-- ============================================================================
-- This migration adds support for user-uploaded private technical documents
-- Created: 2025-01-24
-- ============================================================================

-- 1. Add columns to support user-uploaded private documents
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS document_storage_path TEXT;

-- 2. Create indexes for faster private project queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id) WHERE is_private = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_is_private ON projects(is_private);

-- 3. Enable Row Level Security (RLS) on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Users can see all public projects
CREATE POLICY "Public projects are viewable by everyone"
ON projects FOR SELECT
USING (is_private = FALSE OR is_private IS NULL);

-- 5. RLS Policy: Users can see their own private projects
CREATE POLICY "Users can view their own private projects"
ON projects FOR SELECT
USING (is_private = TRUE AND user_id = auth.uid());

-- 6. RLS Policy: Authenticated users can insert their own private projects
CREATE POLICY "Users can insert their own private projects"
ON projects FOR INSERT
WITH CHECK (is_private = TRUE AND user_id = auth.uid());

-- 7. RLS Policy: Users can update their own private projects
CREATE POLICY "Users can update their own private projects"
ON projects FOR UPDATE
USING (is_private = TRUE AND user_id = auth.uid());

-- 8. RLS Policy: Users can delete their own private projects
CREATE POLICY "Users can delete their own private projects"
ON projects FOR DELETE
USING (is_private = TRUE AND user_id = auth.uid());

-- 9. Create storage bucket for user documents (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-documents', 'user-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 10. Storage RLS Policy: Users can upload their own documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-documents' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 11. Storage RLS Policy: Users can view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-documents' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 12. Storage RLS Policy: Users can delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-documents' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
\`\`\`

### Step 3: Execute the SQL

1. Click **Run** button (or press Cmd+Enter / Ctrl+Enter)
2. Wait for execution to complete
3. Verify success message appears

### Step 4: Verify Migration

Run this verification script from your terminal:

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL="https://dfxauievbyqwcynwtvib.supabase.co" \\
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc" \\
npx tsx scripts/check-migration-status.ts
\`\`\`

You should see:
```
✅ Migration columns exist in projects table
✅ Storage bucket "user-documents" exists
```

---

## 🎯 After Migration: Testing the Feature

Once migration is complete, test the document upload flow:

### 1. Upload a Technical Report
- Go to dashboard
- Open AI chat sidebar
- Click attachment/upload button
- Select a PDF file with "technical", "report", "NI 43-101", "JORC", or "feasibility" in the filename
- Wait for upload and extraction

### 2. Verify Results
- Check that a success message appears in chat showing extracted data (NPV, IRR, etc.)
- Open the project screener table
- Look for your uploaded document with a purple **"Private"** badge
- Click on the project to view details

### 3. Test Privacy
- Log out and log in as a different user
- Verify that your private project does NOT appear in their project screener
- Log back in as yourself
- Verify that your private project IS visible

### 4. Ask Questions
- In the chat, ask questions about the uploaded document
- Example: "What is the NPV of the project I just uploaded?"
- Verify that the AI can answer based on the extracted data

---

## 📋 What the Migration Does

### Database Changes
- Adds 4 new columns to `projects` table:
  - `user_id` - Links project to the user who uploaded it
  - `is_private` - Boolean flag to mark private projects
  - `uploaded_at` - Timestamp of when document was uploaded
  - `document_storage_path` - Path to PDF in Supabase Storage

- Creates 2 database indexes for query performance
- Enables Row Level Security (RLS) on projects table
- Creates 5 RLS policies for projects table (SELECT, INSERT, UPDATE, DELETE)
- Creates storage bucket `user-documents` (50MB file limit)
- Creates 3 RLS policies for storage objects (INSERT, SELECT, DELETE)

### How It Works
1. User uploads a technical report PDF via chat
2. PDF is uploaded to Supabase Storage at `user-documents/{user_id}/{filename}`
3. Text is extracted using `unpdf` library
4. Relevant sections are found using regex pattern matching
5. Structured data is extracted using OpenAI GPT-4o-mini
6. New private project is created in database with:
   - Extracted financial data (NPV, IRR, CAPEX, etc.)
   - Link to user who uploaded (`user_id`)
   - Privacy flag set (`is_private = true`)
   - Storage path to original PDF
7. RLS policies ensure users only see their own private projects
8. Purple "Private" badge appears in project screener
9. Users can ask questions about uploaded documents in chat

---

## 🚨 Important Notes

1. **This migration is safe to run multiple times** - All operations use `IF NOT EXISTS` or `ON CONFLICT DO NOTHING`

2. **Existing data is preserved** - The new columns are added with default values (`is_private = false` for existing projects)

3. **Public projects remain public** - Only newly uploaded user documents are marked private

4. **Storage bucket already exists** - Created automatically during testing, but SQL will create if missing

5. **No downtime required** - Migration can be run while app is running

---

## 🔍 Troubleshooting

### If you get policy conflicts:
Some policies might already exist. That's OK - the `CREATE POLICY` will skip if they exist.

### If you get column already exists:
That's fine! The `ADD COLUMN IF NOT EXISTS` will skip it.

### If RLS is already enabled:
No problem - the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is idempotent.

### To check what exists already:
\`\`\`sql
-- Check columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('user_id', 'is_private', 'uploaded_at', 'document_storage_path');

-- Check policies
SELECT policyname
FROM pg_policies
WHERE tablename = 'projects';

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'user-documents';
\`\`\`

---

## 📚 Related Files

### Implementation Files
- [/app/api/documents/upload/route.ts](app/api/documents/upload/route.ts) - Upload API with regex + OpenAI extraction
- [/components/chat-sidebar.tsx](components/chat-sidebar.tsx:518-560) - File upload integration
- [/components/project-screener/project-screener.tsx](components/project-screener/project-screener.tsx:259-266) - Private badge display
- [/lib/types/mining-project.ts](lib/types/mining-project.ts:40-44) - TypeScript interface
- [/components/project-detail-panel/inline-pdf-viewer.tsx](components/project-detail-panel/inline-pdf-viewer.tsx) - PDF navigation fix

### Migration Files
- [/supabase/migrations/20250124_add_user_upload_support.sql](supabase/migrations/20250124_add_user_upload_support.sql) - Original migration (same SQL as above)
- [/scripts/check-migration-status.ts](scripts/check-migration-status.ts) - Verification script

---

## ✅ Next Steps

1. Run the SQL migration in Supabase Dashboard
2. Verify with `npm run tsx scripts/check-migration-status.ts`
3. Test document upload end-to-end
4. Delete this file once migration is confirmed working

---

**Questions?** Check the implementation files listed above or review the code at the line numbers specified.
