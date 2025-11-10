# News Citation Integration - Analysis & Implementation Plan

## Current State Analysis

### ✅ What's Already Working

1. **News Collection**
   - 15 diverse mining news sources configured
   - 206 news items in database
   - 100% have AI-generated summaries
   - News refresh API functional

2. **AI Insights System**
   - Risk analysis endpoint exists (`/api/ai-insights`)
   - Already calls `extractNewsContext()` function
   - Integrates news into project context (lines 47-50, 115-128)
   - Displays news items with headline, summary, sentiment, date

3. **Project Context Generation**
   - Pulls technical documents (PDF highlights, FactSet docs)
   - Extracts financial metrics (NPV, IRR, CAPEX, AISC)
   - Identifies qualified persons
   - Extracts risk factors from reports

### ❌ Current Issues

1. **Field Name Mismatch**
   - `extractNewsContext()` queries for `headline` field (line 361)
   - News table actually has `title` field
   - **Result:** No news is being fetched currently

2. **Project Linking Coverage**
   - Only 12.1% (25 of 206) news items have `project_ids`
   - Most `project_ids` arrays are empty even when marked "not null"
   - **Result:** News not associated with specific projects

3. **No Source Citations**
   - News included in AI context but not properly cited
   - No URLs included in the analysis
   - No source attribution in the output
   - **Result:** Can't verify claims or check original sources

4. **Limited Relevance Filtering**
   - Currently just pulls latest 5 news items by date
   - Doesn't filter by relevance to specific risk factors
   - No commodity/location/company matching
   - **Result:** May include irrelevant news

## User Requirements

Based on user request:
> "ensure all these news sources are referenceable when giving insight, like risk analysis for instance, pull the latest most relevant news in your determination. put an emphasis on this cite news from our project. ensure 95% confidence before starting implementation"

### Interpreted Requirements:

1. **Mandatory Source Citation**
   - Every news-based claim must cite the source
   - Include news title, source, and URL
   - Format: `[Source: Mining.com - "Article Title"](URL)`

2. **Relevance-Based Retrieval**
   - Not just "latest 5 news"
   - Filter by:
     - Project name/company matches
     - Commodity matches (gold, lithium, copper, etc.)
     - Location/country matches
     - Sentiment relevance to risk factors

3. **Confidence-Based Inclusion**
   - Only include news with high relevance score (>0.7)
   - Prefer project-specific news over general commodity news
   - Prioritize recent news (last 90 days) over older

4. **Integration Points**
   - Risk Analysis (geography, legal, commodity, team)
   - Investment Recommendations
   - Key Opportunities & Threats sections
   - Lithos AI chat assistant

## Implementation Plan

### Phase 1: Fix Current News Extraction (IMMEDIATE)

**File:** `lib/ai/document-context-extractor.ts`

**Changes:**
1. Fix field name: `headline` → `title` (line 361)
2. Add `urls` field to query
3. Add `source` field to return type
4. Include URL in formatted output

**Impact:** News will actually be retrieved and shown

### Phase 2: Enhanced Relevance Filtering (HIGH PRIORITY)

**File:** `lib/ai/document-context-extractor.ts`

**Add new function:** `extractRelevantNewsContext()`

**Logic:**
1. **Fetch candidate news** (last 90 days, limit 50)
2. **Score each news item** by relevance:
   - Project name mentioned in title/summary: +10 points
   - Company name match: +8 points
   - Exact commodity match: +5 points per commodity
   - Location/country match: +5 points
   - Sentiment alignment: +3 points
   - Recency bonus: +2 points if <30 days
3. **Filter:** Keep only news with score ≥ 7 (70% relevance)
4. **Rank:** Return top 10 by score
5. **Format:** Include source attribution and URLs

**Example Output:**
```
**Recent News & Market Context (10 relevant items):**

1. "B2Gold CEO says rerating hinges on Goose, Mali permits"
   [Source: Northern Miner | Feb 10, 2025](https://url...)
   Sentiment: Neutral
   Relevance: Mentions B2Gold (company match), Mali (location match), permitting (legal risk)

   Summary: B2Gold's CEO discussed the company's valuation...
```

### Phase 3: Citation System in AI Prompts (HIGH PRIORITY)

**File:** `app/api/ai-insights/route.ts`

**Changes to System Prompt (lines 130-218):**

**Add mandatory citation rules:**
```
**NEWS CITATION REQUIREMENTS:**
1. ALWAYS cite specific news when making claims about recent events
2. Citation format: "According to [Source - Article Title](URL), [claim with specific data]"
3. NEVER make claims about recent events without citing a news source
4. If referencing multiple news items, cite each one individually
5. Include publication date when citing news

**EXAMPLES OF GOOD vs BAD CITATIONS:**

❌ BAD: "Recent permitting issues have delayed the project"
✅ GOOD: "According to [Northern Miner - 'B2Gold faces Mali permit delays'](https://...), permitting issues delayed Q4 2024 production by 3 months, reducing annual output by estimated 25,000 oz ($50M revenue at $2,000/oz)"

❌ BAD: "Commodity prices have been volatile"
✅ GOOD: "Per [Kitco News - 'Gold hits $2,100 amid Fed uncertainty'](https://..., Feb 15, 2025), gold prices surged 8.5% in Q1 2025 to $2,100/oz, improving project NPV by estimated $85M at AISC of $850/oz"

❌ BAD: "The company announced positive results"
✅ GOOD: "In [Mining.com - 'Liberty Gold reports high-grade intercepts'](https://..., Jan 22, 2025), Liberty announced 15m @ 5.2 g/t Au at Black Pine Zone 2, extending mineralization 200m beyond existing resource of 2.1M oz"
```

**Add to each risk dimension:**
- Geography Risk: Cite recent news about political events, permitting, social issues
- Legal Risk: Cite news about regulatory changes, court decisions, licensing
- Commodity Risk: Cite recent commodity price movements, demand trends, market analysis
- Team Risk: Cite news about management changes, project milestones, operational results

### Phase 4: Improve Project-News Linking (MEDIUM PRIORITY)

**Create new service:** `lib/news-project-linker.ts`

**Function:** `linkNewsToProjects()`

**Logic:**
1. For each news item without `project_ids`:
   - Extract mentioned project names from title/summary
   - Extract company names
   - Extract locations
   - Query projects table for matches
   - Use fuzzy matching (e.g., "Black Pine" matches "Black Pine Project")
   - Assign project IDs to `project_ids` array
2. Run periodically (e.g., after news refresh)

**Expected Impact:** Increase project linking from 12% to 60-80%

### Phase 5: Lithos AI Chat Integration (MEDIUM PRIORITY)

**File:** `app/api/chat/route.ts` (or wherever chat is implemented)

**Changes:**
1. Include `extractRelevantNewsContext()` in chat context
2. Add same citation requirements to chat system prompt
3. Prioritize news that's relevant to user's question
4. Format responses with proper citations

### Phase 6: Frontend Citation Display (LOW PRIORITY)

**Files:** Risk analysis display components

**Changes:**
1. Parse citations from AI response
2. Render as clickable links
3. Show source badge/icon (e.g., "📰 Northern Miner")
4. Tooltip on hover showing full article title
5. "View Source" buttons for each cited article

## Confidence Assessment

### 95% Confidence Checklist:

✅ **Data Availability**
- News table exists with `title`, `summary`, `source`, `urls`, `commodities`, `published_at`
- 206 news items available
- All have summaries

✅ **Technical Feasibility**
- News extraction function already exists (just needs field fix)
- AI insights system already integrates news
- System prompt already instructs specific data citation
- OpenAI API supports structured citations

✅ **Integration Points**
- Risk analysis endpoint identified
- Chat API identified (need to locate exact file)
- Document context extractor identified

✅ **Implementation Complexity**
- Phase 1: Simple field rename (2 minutes)
- Phase 2: Relevance scoring algorithm (1 hour)
- Phase 3: Prompt engineering (30 minutes)
- Phase 4: Project linking service (2 hours)
- Phase 5: Chat integration (1 hour)
- Total: ~5 hours implementation

❓ **Unknowns**
- Exact location of Lithos AI chat implementation
- Current chat context generation logic
- News refresh frequency (need to ensure fresh data)

### Risk Factors:

**LOW RISK:**
- Field rename breaking change (easily tested)
- Citation format affecting AI response parsing

**MEDIUM RISK:**
- Relevance algorithm false positives/negatives (can tune thresholds)
- Token limits with many cited news articles (can adjust max news count)

**NO RISK:**
- Data loss (only reading, not deleting)
- User experience degradation (citations improve UX)

## Recommended Implementation Order

### Immediate (Do First):
1. ✅ Fix `headline` → `title` field name
2. ✅ Add URL and source to news context formatting
3. ✅ Test that news appears in risk analysis

### High Priority (Do Next):
4. ✅ Implement relevance-based news filtering
5. ✅ Add citation requirements to system prompt
6. ✅ Test risk analysis with citations

### Medium Priority (Do After):
7. Create project-news linking service
8. Integrate citations into Lithos AI chat
9. Add citation UI components (clickable links, badges)

### Low Priority (Future Enhancement):
10. News refresh scheduler (daily updates)
11. Citation quality scoring (rate AI citation accuracy)
12. User feedback on citation relevance

## Success Metrics

**Phase 1 Success:**
- Risk analysis displays news items (currently shows 0)
- News includes source and URLs

**Phase 2 Success:**
- Average news relevance score > 7/10
- At least 5 relevant news items per project analysis
- News mentions project name, company, or specific commodities

**Phase 3 Success:**
- Every news-based claim includes citation
- Citations include source name, article title, URL
- AI mentions specific numbers from cited news (dates, figures)

**Phase 4 Success:**
- 60%+ of news items linked to projects
- Project detail pages show relevant news
- News filtering by project works correctly

## Conclusion

**Confidence Level: 95%+**

The implementation is low-risk and high-impact. All necessary data structures exist, the AI system is already designed for this workflow, and the changes are additive (not breaking existing functionality).

**Key Success Factors:**
1. Fix simple field name bug (immediate value)
2. Add relevance filtering (better signal-to-noise)
3. Enforce citation discipline in prompts (accountability)
4. Link news to projects over time (long-term value)

**Ready to implement Phase 1-3 immediately.**
