# AI Insights Setup Guide

## ✅ Implementation Status

The AI Insights feature has been **fully implemented** in the code. You just need to create the database table.

## 🚀 Quick Setup (2 minutes)

### Step 1: Create the Database Table

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/dfxauievbyqwcynwtvib

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Copy the entire SQL from: `supabase/migrations/011_create_ai_insights_table.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd+Enter on Mac / Ctrl+Enter on Windows)
   - You should see: "Success. No rows returned"

### Step 2: Test the Feature

1. **Start your development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Test AI Insights**:
   - Navigate to Dashboard or Global Projects
   - Click on any project row to open the detail panel
   - Click the **"AI Insights"** tab (4th tab)
   - Watch the AI generate comprehensive risk analysis!

## 📊 What You Get

The AI Insights tab provides:

### Risk Analysis (0-10 scale for each):
- **Geography Risk**: Political stability, infrastructure, jurisdiction quality
- **Legal Risk**: Regulatory framework, permitting, compliance
- **Commodity Risk**: Market dynamics, price volatility, demand trends
- **Team Risk**: Management experience, track record, capabilities

### Investment Recommendation:
- **Strong Buy** (0-3 risk score)
- **Buy** (3-5 risk score)
- **Hold** (5-7 risk score)
- **Pass** (7-10 risk score)

### Additional Insights:
- Overall risk summary
- 3-5 key opportunities
- 3-5 key threats
- Detailed rationale for each category

## 🔄 Caching & Performance

- **First View**: Generates fresh analysis (2-4 seconds)
- **Subsequent Views**: Instant load from cache
- **Cache Duration**: 7 days
- **Manual Refresh**: Available via refresh button
- **Model**: GPT-4o-mini (cost-effective, fast)

## 🎯 How It Works

1. **User clicks AI Insights tab**
2. **System checks cache**: `SELECT * FROM ai_insights WHERE project_id = ?`
3. **If cached & valid**: Display immediately
4. **If not cached**:
   - Generate via OpenAI API
   - Save to database
   - Display results
5. **Auto-expire after 7 days** for fresh analysis

## 🐛 Troubleshooting

### Error: "relation public.ai_insights does not exist"
**Solution**: Run the SQL migration from Step 1 above

### Error: "Project not found"
**Solution**: This is fixed in the code. Make sure you're running the latest version.

### No insights generating
**Check**:
- OpenAI API key is set in `.env.local`
- Database table was created successfully
- Check browser console for errors

## 📁 Key Files

- **API**: `app/api/ai-insights/route.ts`
- **UI Component**: `components/ai-insights-panel.tsx`
- **Integration**: `components/project-detail-panel/single-project-view-compact.tsx`
- **Database Schema**: `supabase/migrations/011_create_ai_insights_table.sql`

## 💡 Future Enhancements

Optional improvements you could add:
- Enable web search for enhanced analysis (`useWebSearch: true`)
- Batch pre-generation for watchlisted projects
- Export insights to PDF
- Historical insight tracking
- Comparative analysis across projects
