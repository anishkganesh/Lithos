# How to Populate Test Data for AISC and Qualified Persons

## Quick Test Data Population

### 1. Run the Migration First

```bash
# Via Supabase dashboard or CLI
# Execute: supabase/migrations/013_add_aisc_and_qualified_persons.sql
```

Or use the Supabase MCP tool to apply the migration.

---

## 2. Add Test AISC and Qualified Persons to a Project

### Option A: Via Supabase Dashboard

1. Go to Supabase dashboard → Table Editor → `projects`
2. Find any project (e.g., search for a gold project)
3. Click to edit the row
4. Set `aisc` to: `850` (for gold, this is $850/oz)
5. Set `qualified_persons` to:
```json
[
  {
    "name": "Dr. Sarah Chen",
    "credentials": "Ph.D., P.Eng.",
    "company": "SRK Consulting"
  },
  {
    "name": "Michael Roberts",
    "credentials": "M.Sc., P.Geo.",
    "company": "Qualified Person Independent"
  }
]
```

### Option B: Via SQL Query

```sql
-- Update a specific project (replace PROJECT_ID)
UPDATE projects
SET
  aisc = 850,
  qualified_persons = '[
    {
      "name": "Dr. Sarah Chen",
      "credentials": "Ph.D., P.Eng.",
      "company": "SRK Consulting"
    },
    {
      "name": "Michael Roberts",
      "credentials": "M.Sc., P.Geo.",
      "company": "Qualified Person Independent"
    }
  ]'::jsonb
WHERE id = 'YOUR-PROJECT-ID-HERE';
```

### Option C: Via TypeScript Script

Create `scripts/add-test-qualified-persons.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addTestData() {
  // Get first project
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .limit(1);

  if (!projects || projects.length === 0) {
    console.log('No projects found');
    return;
  }

  const project = projects[0];

  // Update with test data
  const { error } = await supabase
    .from('projects')
    .update({
      aisc: 850,
      qualified_persons: [
        {
          name: 'Dr. Sarah Chen',
          credentials: 'Ph.D., P.Eng.',
          company: 'SRK Consulting'
        },
        {
          name: 'Michael Roberts',
          credentials: 'M.Sc., P.Geo.',
          company: 'Qualified Person Independent'
        }
      ]
    })
    .eq('id', project.id);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`✅ Updated project: ${project.name}`);
    console.log(`   AISC: $850/oz`);
    console.log(`   Qualified Persons: 2 added`);
  }
}

addTestData();
```

Run it:
```bash
NEXT_PUBLIC_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." npx tsx scripts/add-test-qualified-persons.ts
```

---

## 3. Verify in UI

1. **Navigate to Project Detail:**
   - Go to `/global-projects` or `/dashboard`
   - Click on the project you just updated

2. **You Should See:**

   **Financial Metrics Section:**
   ```
   NPV: $XXX M
   IRR: XX%
   CAPEX: $XXX M
   AISC: $850/unit  ← NEW!
   ```

   **Qualified Persons Section:**
   ```
   👥 Qualified Persons

   Dr. Sarah Chen
   Ph.D., P.Eng.
   SRK Consulting

   Michael Roberts
   M.Sc., P.Geo.
   Qualified Person Independent
   ```

3. **In Project Screener Table:**
   - New "AISC ($/unit)" column should show `$850`
   - Sortable and filterable

4. **In Sensitivity Analysis:**
   - Now shows 3 metrics: NPV, IRR, AISC
   - Adjust parameters to see AISC predictions

---

## 4. Real-World AISC Examples by Commodity

### Gold Projects
```sql
UPDATE projects SET aisc = 850 WHERE commodities @> '["Gold"]' LIMIT 1;
```
- Typical range: $700-$1,200/oz
- Low-cost: $500-$700/oz
- High-cost: $1,200-$1,500/oz

### Copper Projects
```sql
UPDATE projects SET aisc = 2.50 WHERE commodities @> '["Copper"]' LIMIT 1;
```
- Typical range: $2.00-$3.50/lb
- Low-cost: $1.50-$2.00/lb
- High-cost: $3.50-$5.00/lb

### Lithium Projects
```sql
UPDATE projects SET aisc = 450 WHERE commodities @> '["Lithium"]' LIMIT 1;
```
- Typical range: $350-$600/tonne LCE
- Low-cost: $250-$350/tonne
- High-cost: $600-$800/tonne

---

## 5. Common Qualified Person Credentials

### Professional Designations:
- **P.Eng.** - Professional Engineer
- **P.Geo.** - Professional Geoscientist
- **MAusIMM** - Member of Australasian Institute of Mining and Metallurgy
- **MAIG** - Member of Australian Institute of Geoscientists
- **CEng** - Chartered Engineer (UK)
- **SME-RM** - Society for Mining, Metallurgy & Exploration Registered Member
- **FAusIMM** - Fellow of AusIMM

### Academic Credentials:
- **Ph.D.** - Doctor of Philosophy
- **M.Sc.** - Master of Science
- **M.Eng.** - Master of Engineering
- **B.Sc.** - Bachelor of Science

### Example Qualified Person:
```json
{
  "name": "Jane Anderson",
  "credentials": "Ph.D., P.Eng., MAusIMM",
  "company": "Wardrop Engineering"
}
```

---

## 6. What Happens After Population?

Once you add test data, the following features become active:

✅ **Project Detail Page:**
- AISC displays in Financial Metrics
- Qualified Persons section shows with professional credentials
- Empty state message disappears

✅ **Project Screener:**
- AISC column populates with values
- Can sort by AISC (lowest to highest cost)
- Can filter by AISC range (future feature)

✅ **Sensitivity Analysis:**
- AISC card shows baseline value
- Adjusting parameters updates AISC prediction
- GPT explains AISC impact in insights

✅ **Document Extraction:**
- When you upload a technical report
- System automatically extracts AISC and qualified persons
- Populates these fields from the document

---

## 7. Troubleshooting

### "I don't see qualified persons section"
- Check that migration was run: `qualified_persons` column exists
- Verify data format is correct JSONB array
- Check browser console for errors

### "AISC shows N/A"
- Ensure `aisc` column has numeric value (not null)
- Check value is reasonable (not 0 or negative)

### "Changes not reflecting in UI"
- Hard refresh browser (Cmd+Shift+R / Ctrl+F5)
- Check project was actually updated in database
- Verify you're viewing the correct project

---

## 8. Next Steps

After verifying test data works:

1. **Upload Technical Reports** → Extract real AISC and qualified persons
2. **Run Sensitivity Analysis** → Test GPT predictions with real data
3. **Compare Projects** → Sort by AISC to find low-cost operations
4. **Generate AI Insights** → Verify insights reference actual qualified persons
