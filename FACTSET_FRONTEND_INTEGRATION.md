# ✅ FactSet Documents - Frontend Integration Guide

## Current Status

**Documents Uploaded**: ✅ 3 PDFs in Supabase Storage
**Project in Database**: ✅ "Sinkhole at the Alcaparrosa Mine"
**URLs Working**: ✅ All PDFs publicly accessible
**Frontend Ready**: ✅ Just needs to display the URLs

---

## The Project with Documents

**Project**: "Sinkhole at the Alcaparrosa Mine"
**Company**: Lundin Mining Corporation (LUN)
**Project ID**: `4efc284f-44af-4fe3-acb7-88bea867d2b6`

**Documents** (3):
1. **Vicuña Mineral Resource Technical Report** (126 KB)
   - URL: https://dfxauievbyqwcynwtvib.supabase.co/storage/v1/object/public/factset-documents/LUN/17ca31087ae39ed85f521a3024f229ab.pdf

2. **NI 43-101 Consent (1)** (96 KB)
   - URL: https://dfxauievbyqwcynwtvib.supabase.co/storage/v1/object/public/factset-documents/LUN/7cab5fe479030b62dc756eba685f46f6.pdf

3. **NI 43-101 Consent (2)** (94 KB)
   - URL: https://dfxauievbyqwcynwtvib.supabase.co/storage/v1/object/public/factset-documents/LUN/21ca748f03a556a5e866362df4bedffb.pdf

**Project URLs Array**: The project's `urls` column now contains all 3 Supabase Storage URLs ✅

---

## How Your Frontend Should Access This

### Option 1: Using the `urls` Column (Current)

Your project already has the URLs in the `urls` array:

```typescript
// In your project-screener component
const { data: projects } = await supabase
  .from('projects')
  .select(`
    *,
    company:companies(*)
  `)

// Display in table
{projects?.map(project => (
  <TableRow>
    <TableCell>{project.name}</TableCell>
    <TableCell>{project.company.name}</TableCell>
    <TableCell>
      {project.urls && project.urls.length > 0 ? (
        <div className="flex gap-2">
          {project.urls.map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              📄 Doc {idx + 1}
            </a>
          ))}
        </div>
      ) : (
        <span className="text-gray-400">No documents</span>
      )}
    </TableCell>
  </TableRow>
))}
```

### Option 2: Using the `factset_documents` Table (Better)

For more control and metadata:

```typescript
// In your project detail panel
const { data: documents } = await supabase
  .from('factset_documents')
  .select('*')
  .eq('project_id', projectId)
  .order('filing_date', { ascending: false })

// Display with full metadata
{documents?.map(doc => (
  <div key={doc.id} className="border p-4 rounded">
    <h3 className="font-semibold">{doc.headline}</h3>
    <p className="text-sm text-gray-600">
      Filed: {new Date(doc.filing_date).toLocaleDateString()}
    </p>
    <p className="text-sm text-gray-600">Type: {doc.form_type}</p>
    <p className="text-sm text-gray-600">
      Size: {Math.round(doc.file_size / 1024)} KB
    </p>
    <a
      href={doc.public_url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      View PDF
    </a>
  </div>
))}
```

### Option 3: Show Document Count in Projects Table

```typescript
// Add document count to your projects query
const { data: projects } = await supabase
  .from('projects')
  .select(`
    *,
    company:companies(*),
    factset_documents(count)
  `)

// Display in table
<TableCell>
  {project.factset_documents[0]?.count || 0} documents
</TableCell>
```

---

## Testing the Integration

### Step 1: Find the Project in Your Frontend

1. Open your dashboard at http://localhost:3003/dashboard
2. Search for "Lundin" or "Alcaparrosa" in the projects table
3. You should see the project "Sinkhole at the Alcaparrosa Mine"

### Step 2: Verify URLs Display

The project's `urls` column contains 3 URLs. Your frontend should already display these if you're rendering the `urls` field.

### Step 3: Click a URL

When you click a URL, it should:
1. Open in a new tab/window
2. Show the PDF directly in the browser
3. Allow download if needed

---

## Example Component: Document List

Create a new component to show documents nicely:

```typescript
// components/project-documents.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Document {
  id: string
  headline: string
  filing_date: string
  form_type: string
  public_url: string
  file_size: number
}

export function ProjectDocuments({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDocuments() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('factset_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('filing_date', { ascending: false })

      if (!error && data) {
        setDocuments(data)
      }
      setLoading(false)
    }

    fetchDocuments()
  }, [projectId])

  if (loading) return <div>Loading documents...</div>

  if (documents.length === 0) {
    return <div className="text-gray-500">No documents available</div>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Technical Documents</h3>
      {documents.map(doc => (
        <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{doc.headline}</h4>
              <div className="mt-1 flex gap-4 text-sm text-gray-600">
                <span>📅 {new Date(doc.filing_date).toLocaleDateString()}</span>
                <span>📋 {doc.form_type}</span>
                <span>📦 {Math.round(doc.file_size / 1024)} KB</span>
              </div>
            </div>
            <a
              href={doc.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              View PDF
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
```

Then use it in your project detail panel:

```typescript
// In your project detail page
import { ProjectDocuments } from '@/components/project-documents'

// Inside your component
<ProjectDocuments projectId={project.id} />
```

---

## Quick Verification Query

Run this in your Supabase SQL editor to see what the frontend should display:

```sql
SELECT
  p.name as project_name,
  c.name as company_name,
  p.urls,
  COUNT(fd.id) as document_count,
  json_agg(
    json_build_object(
      'headline', fd.headline,
      'url', fd.public_url
    )
  ) as documents
FROM projects p
JOIN companies c ON p.company_id = c.id
LEFT JOIN factset_documents fd ON fd.project_id = p.id
WHERE p.id = '4efc284f-44af-4fe3-acb7-88bea867d2b6'
GROUP BY p.id, p.name, c.name, p.urls;
```

**Expected Result**:
- Project name: "Sinkhole at the Alcaparrosa Mine"
- Company: "Lundin Mining Corporation"
- URLs: Array with 3 Supabase Storage URLs
- Document count: 3

---

## Why It Should Already Work

Your project has:
- ✅ `urls` column populated with Supabase Storage URLs
- ✅ Linked to `factset_documents` table via `project_id`
- ✅ All URLs are public and accessible

**If your frontend displays the `urls` field, it will automatically show the document links!**

---

## Next Steps

1. **Find the project** in your frontend (search for "Lundin" or "Alcaparrosa")
2. **Check if URLs display** in the projects table
3. **Click a URL** - it should open the PDF in a new tab
4. **If not showing**: Add the document display component above to your project detail panel

---

## Summary

**Current Setup**:
- ✅ 3 PDFs uploaded to Supabase Storage
- ✅ Project exists in database with URLs
- ✅ All URLs are public and working
- ✅ Documents linked via `factset_documents` table

**What You Need to Do**:
- Search for "Sinkhole at the Alcaparrosa Mine" in your project screener
- Click on one of the document URLs
- PDF should open in new tab

**If URLs Don't Show**:
- Add the `ProjectDocuments` component to your project detail panel
- Or update your projects table to display the `urls` array

The infrastructure is complete - you just need to display it! 🎉
