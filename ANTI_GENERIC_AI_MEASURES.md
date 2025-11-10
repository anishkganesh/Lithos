# Anti-Generic AI Measures - Enforcing Specific, Data-Driven Insights

## Problem Statement

Generic AI responses like:
- "The project shows strong economics" (instead of "NPV of $485M at 8% discount rate")
- "Experienced team" (instead of "Dr. Sarah Chen, P.Eng., with 20 years in gold exploration")
- "Good grades" (instead of "1.2 g/t Au over 2.5M oz M&I resources")
- "Recent studies" (instead of "2023 PFS by SRK Consulting")

**These are AI slob and provide zero value.**

---

## Solution: Mandatory Quotation Rules

### 1. AI Insights API (`app/api/ai-insights/route.ts`)

#### System Prompt Changes (Lines 129-151):

**BEFORE:**
```
Your analysis should be SPECIFIC to this project using the actual data provided
```

**AFTER:**
```
**CRITICAL REQUIREMENT - NO GENERIC RESPONSES:**
You MUST quote actual numbers and specific data from the project context. Do NOT provide generic industry observations.

**MANDATORY RULES:**
1. ALWAYS quote specific financial metrics with exact values (e.g., "NPV of $485M" not "strong NPV")
2. ALWAYS mention actual qualified persons by name and credentials (e.g., "Dr. Sarah Chen, P.Eng." not "experienced team")
3. ALWAYS reference specific technical parameters (e.g., "grade of 1.2 g/t Au" not "good grade")
4. ALWAYS cite actual news headlines or report findings (e.g., "2023 feasibility study" not "recent studies")
5. If a value is not provided, state "data not available" - DO NOT make assumptions or provide generic statements
```

#### Context Enhancement (Line 72):

**Added AISC to project context:**
```typescript
- AISC (All-In Sustaining Cost): ${project.aisc !== null ? `$${project.aisc.toFixed(0)}/unit` : 'N/A'}
```

**Added precision to all metrics:**
```typescript
- NPV: ${project.npv.toFixed(1)}M  // Was: ${project.npv}M
- IRR: ${project.irr.toFixed(1)}%  // Was: ${project.irr}%
- CAPEX: ${project.capex.toFixed(1)}M  // Was: ${project.capex}M
```

#### What Gets Passed to GPT:

✅ **Project Data:**
- Name, location, stage, status, commodities, description
- All financial metrics (NPV, IRR, CAPEX, AISC, payback, production, mine life)
- Resources, reserves, mining method, processing method, infrastructure

✅ **Company Data:**
- Company name, ticker, market cap, description

✅ **Technical Report Data (if available):**
- Executive summary from reports
- Key findings (5-7 bullet points)
- Extracted financial metrics (NPV, IRR, AISC from regex)
- **Qualified persons by name and credentials**
- Risk factors identified in reports
- Technical highlights (reserves, mining method, metallurgy)

✅ **News Data (if available):**
- Headlines (up to 5 most recent)
- Summaries
- Sentiment analysis
- Publication dates

#### Example of Good vs Bad Output:

**❌ BAD (Generic AI Slob):**
```json
{
  "geography_risk_analysis": "Canada is a low-risk mining jurisdiction with good infrastructure and political stability.",
  "team_risk_analysis": "The project has an experienced technical team."
}
```

**✅ GOOD (Specific, Data-Driven):**
```json
{
  "geography_risk_analysis": "Located in Quebec, Canada (Tier 1 jurisdiction). Technical report by Dr. Sarah Chen, P.Eng., confirms access to power grid and Trans-Canada Highway. Environmental permits obtained in 2023.",
  "team_risk_analysis": "Strong technical credibility: Dr. Sarah Chen (Ph.D., P.Eng., 20 years gold experience) and Michael Roberts (M.Sc., P.Geo., former Vale geologist) from SRK Consulting authored the 2023 PFS showing NPV of $485M."
}
```

---

### 2. Sensitivity Analysis API (`app/api/sensitivity-analysis/route.ts`)

#### System Prompt Changes (Lines 80-131):

**BEFORE:**
```
Provide a brief explanation of the calculations
```

**AFTER:**
```
**CRITICAL REQUIREMENT - QUOTE ACTUAL NUMBERS:**
You MUST reference the specific base case values and calculated results. Do NOT provide generic analysis.

**MANDATORY RULES FOR EXPLANATION:**
1. Quote the EXACT base case values (e.g., "Starting from base NPV of $485M, IRR of 22.4%, AISC of $850/oz...")
2. Quote the EXACT parameter changes (e.g., "With commodity price +10%, throughput -5%...")
3. Quote the EXACT new calculated values (e.g., "New NPV of $627M (+29%), IRR of 26.8% (+4.4 pts), AISC of $823/oz (-3%)")
4. Explain WHY each metric changed using actual numbers
5. Reference the project name if provided
```

#### Response Structure Requirements:

**Explanation field MUST:**
- Quote base case → quote parameters → quote new values → explain impact
- Example: "Starting from base NPV of $485M, IRR of 22.4%, and AISC of $850/oz, with commodity price +10% and grade +5%, the new NPV is $627M (+29%), IRR is 26.8% (+4.4 percentage points), and AISC is $823/oz (-3%). The NPV increase of $142M is driven primarily by the 10% price increase (contributing ~$97M) and the grade improvement (contributing ~$45M)."

**Assumptions field MUST include specific numbers:**
- ❌ Bad: "Discount rate unchanged"
- ✅ Good: "NPV discount rate remains at 8%"
- ✅ Good: "Mine life of 15 years unchanged"
- ✅ Good: "Metal prices: Gold at $1,850/oz baseline"

**Risk Factors field MUST reference calculated values:**
- ❌ Bad: "AISC remains above industry median"
- ✅ Good: "AISC of $823/oz still above industry median of $750/oz by 10%"
- ✅ Good: "At IRR of 26.8%, project still requires gold prices above $1,650/oz to maintain economics"

#### Example of Good vs Bad Output:

**❌ BAD (Generic):**
```json
{
  "explanation": "The changes to commodity price and grade improve project economics. NPV increases and costs decrease.",
  "assumptions": ["Discount rate unchanged", "Mine life constant"],
  "riskFactors": ["Price volatility", "Cost overruns"]
}
```

**✅ GOOD (Specific):**
```json
{
  "explanation": "Starting from base NPV of $485M, IRR of 22.4%, and AISC of $850/oz, with commodity price +10% and grade +5%, the new NPV is $627M (+29%), IRR is 26.8% (+4.4 pts), and AISC is $823/oz (-3%). The NPV increase is driven by higher revenue from gold price ($97M) and improved recovery from grade (+$45M).",
  "assumptions": [
    "NPV discount rate remains at 8%",
    "Mine life of 15 years unchanged",
    "Gold price baseline at $1,850/oz",
    "Annual production of 150,000 oz maintained",
    "CAPEX of $420M not adjusted for grade improvement"
  ],
  "riskFactors": [
    "AISC of $823/oz still above industry median of $750/oz",
    "At +10% gold price, still exposed to 18% downside if prices return to $1,650/oz",
    "Grade improvement of +5% assumes no mining dilution increase",
    "NPV of $627M requires sustaining current throughput of 1.2 Mtpa"
  ]
}
```

---

## 3. Data Flow Verification

### AI Insights Data Flow:

```
Project ID
    ↓
Fetch Project from Database
    ↓ (includes: npv, irr, capex, aisc, stage, location, commodities, etc.)
    ↓
Fetch Company Data (name, ticker, market_cap, description)
    ↓
Extract Document Context (technical reports)
    ↓ (includes: qualified persons, financial metrics, risk factors, highlights)
    ↓
Extract News Context (recent news items)
    ↓ (includes: headlines, summaries, sentiment, dates)
    ↓
Build Comprehensive Context String
    ↓ (ALL data formatted with labels)
    ↓
Pass to GPT-4o-mini with STRICT PROMPT
    ↓ (mandate: quote all values, name all people, cite all reports)
    ↓
Return Specific, Data-Driven Analysis
```

### Sensitivity Analysis Data Flow:

```
User Adjusts Parameters
    ↓ (commodity price, throughput, grade, opex, capex, recovery)
    ↓
Frontend Sends Base Case + Changes to API
    ↓ (base: npv=$485M, irr=22.4%, aisc=$850/oz)
    ↓ (changes: price +10%, grade +5%)
    ↓
API Builds Context String with EXACT VALUES
    ↓
Pass to GPT-4o-mini with MANDATORY QUOTING RULES
    ↓ (mandate: quote base → quote changes → quote new → explain)
    ↓
GPT Calculates New Metrics
    ↓
Return with Specific Explanation
    ↓ (must include all numbers in explanation)
```

---

## 4. Enforcement Mechanisms

### Prompt Engineering:

1. **CRITICAL REQUIREMENT** headers in BOLD with explicit "NO GENERIC RESPONSES"
2. **MANDATORY RULES** numbered list with specific examples
3. **Format requirements** in response structure (e.g., "MUST quote actual base and new values")
4. **Explicit bad/good examples** in prompt (though not shown to GPT, in documentation)

### Context Formatting:

1. **All numbers formatted with precision:**
   - NPV: `.toFixed(1)` → "$485.0M" not "$485M"
   - IRR: `.toFixed(1)` → "22.4%" not "22%"
   - AISC: `.toFixed(0)` → "$850/oz" not "$850"

2. **All labels explicit:**
   - Not: "NPV: $485M"
   - But: "NPV (Net Present Value): $485.0M"

3. **All context sectioned with clear headers:**
   - **Project Details**, **Company Information**, **Financial Metrics**, **Technical Report Analysis**, **Recent News**

### Response Validation:

Currently: None (GPT responses trusted)

**Recommended Future Enhancement:**
Add validation in API to reject responses that:
- Don't contain quoted numbers from base case
- Use generic phrases like "strong economics", "experienced team"
- Don't reference actual qualified persons by name
- Could be applied to any project (not project-specific)

---

## 5. Testing Checklist

### For AI Insights:

- [ ] Run on project WITH technical reports and news
  - Verify: Mentions specific qualified persons by name
  - Verify: Quotes exact NPV, IRR, CAPEX, AISC from reports
  - Verify: References actual news headlines
  - Verify: No generic phrases ("strong", "good", "experienced")

- [ ] Run on project WITHOUT technical reports
  - Verify: States "No technical report data available"
  - Verify: Only analyzes metadata (location, stage, company)
  - Verify: Recommends specific due diligence

### For Sensitivity Analysis:

- [ ] Adjust single parameter (e.g., +10% price)
  - Verify: Explanation quotes base NPV/IRR/AISC
  - Verify: Explanation quotes new NPV/IRR/AISC
  - Verify: Explanation states "+10% price"
  - Verify: Assumptions include actual numbers

- [ ] Adjust multiple parameters (e.g., +10% price, -5% OPEX)
  - Verify: Explanation quotes both changes
  - Verify: Explanation shows compounding effect with numbers
  - Verify: Risk factors reference calculated values

---

## 6. Summary of Changes

### Files Modified:

1. **`app/api/ai-insights/route.ts`**
   - Lines 129-151: Enhanced system prompt with mandatory quotation rules
   - Lines 69-75: Added AISC to financial metrics context
   - Lines 69-71: Added `.toFixed()` precision to NPV, IRR, CAPEX

2. **`app/api/sensitivity-analysis/route.ts`**
   - Lines 80-131: Enhanced system prompt with specific number requirements
   - Lines 86-90: Added 5 mandatory rules for explanations
   - Lines 119-121: Added requirements for assumptions and risk factors

### What This Prevents:

❌ Generic statements like "strong economics"
❌ Vague references like "experienced team"
❌ Unspecific claims like "good grades"
❌ Assumptions not based on data
❌ Analysis that could apply to any project

### What This Enforces:

✅ Exact quotes of NPV, IRR, CAPEX, AISC with units
✅ Qualified persons named with credentials
✅ Specific technical parameters (grades, tonnages, mine life)
✅ Actual news headlines and report titles
✅ Numbered assumptions with specific values
✅ Risk factors tied to calculated metrics

---

## 7. Example Usage

### Test AI Insights:

1. Add test project with full data:
```sql
UPDATE projects SET
  npv = 485,
  irr = 22.4,
  capex = 420,
  aisc = 850,
  qualified_persons = '[
    {"name": "Dr. Sarah Chen", "credentials": "Ph.D., P.Eng.", "company": "SRK Consulting"},
    {"name": "Michael Roberts", "credentials": "M.Sc., P.Geo.", "company": "Independent QP"}
  ]'::jsonb
WHERE id = 'test-project-id';
```

2. Call API:
```bash
POST /api/ai-insights
{ "projectId": "test-project-id", "forceRegenerate": true }
```

3. Verify response quotes:
   - "NPV of $485M"
   - "IRR of 22.4%"
   - "AISC of $850/oz"
   - "Dr. Sarah Chen, Ph.D., P.Eng."
   - "Michael Roberts, M.Sc., P.Geo."

### Test Sensitivity Analysis:

1. Call API with base case:
```bash
POST /api/sensitivity-analysis
{
  "baseCase": { "npv": 485, "irr": 22.4, "aisc": 850 },
  "parameters": { "commodityPrice": 10, "grade": 5 },
  "projectContext": { "name": "Goldcorp Project", "commodity": "Gold" }
}
```

2. Verify response explanation contains:
   - "Starting from base NPV of $485M"
   - "With commodity price +10%, grade +5%"
   - "New NPV of $XXX M"
   - Project name "Goldcorp Project"

---

## 8. Future Enhancements

1. **Response Validation Layer:**
   - Regex check for quoted numbers in explanations
   - Named entity recognition for qualified persons
   - Reject responses with generic phrases

2. **Feedback Loop:**
   - Log all AI responses
   - Flag generic responses for review
   - Fine-tune prompts based on bad examples

3. **User Feedback:**
   - "Was this insight specific enough?" button
   - Collect examples of good vs bad responses
   - A/B test different prompt phrasings

---

## Conclusion

With these measures in place, AI-generated insights will be:
- **Specific:** Quote actual numbers (NPV, IRR, AISC)
- **Credible:** Name actual people (qualified persons)
- **Verifiable:** Reference actual reports and news
- **Actionable:** Based on real data, not generic observations

**No more AI slob. Only genuine, data-driven insights.**
