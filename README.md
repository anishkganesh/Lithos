# Lithos - AI-Powered Critical Minerals Intelligence Platform

Lithos is a Bloomberg Terminal-inspired platform supercharged by artificial intelligence for the critical minerals industry, cutting weeks of mining analyst work to minutes and quantifying qualitative extraneous factors that humans may understate.

## Overview

Lithos ingests drill-hole logs, satellite imagery, offtake contracts and ESG filings, then uses a fine-tuned LLM + geospatial models to deliver instant diligence notes, cash-flow forecasts and supply-chain risk maps for miners, traders and financiers.

## Features

### 🔍 Project Screener
- Dense, spreadsheet-style table with 15+ mining projects
- Advanced filtering with multi-select options
- Real-time search across all columns
- Column management and visibility controls
- Bulk actions (export CSV, watchlist, compare)
- Conditional formatting for IRR, ESG scores, and risk levels

### 📊 Project Detail View
- Comprehensive single project analysis
- Key metrics cards (NPV, IRR, Payback, Production)
- Risk alerts and red flags
- Interactive sensitivity analysis with real-time calculations
- Similar projects recommendations
- Multi-tab interface (Overview, Technical Report, AI Insights, Experts)

### 🔄 Project Comparison
- Side-by-side comparison of multiple projects
- Percentage differences with trend indicators
- Detailed comparison table
- Toggle switches for ESG Score, Jurisdiction Risk
- Export to CSV/PDF functionality

## Tech Stack

- **Framework:** Next.js 15.2.4
- **UI Components:** Radix UI + shadcn/ui
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Tables:** TanStack Table
- **Language:** TypeScript
- **Font:** Geist

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/anishkganesh/Lithos.git
cd Lithos
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) in your browser.

## Project Structure

```
lithos/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Main dashboard page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── project-screener/  # Table and filtering components
│   ├── project-detail-panel/ # Detail view components
│   └── ui/               # Reusable UI components
├── lib/                   # Utilities and types
│   ├── types/            # TypeScript type definitions
│   └── data/             # Mock data
└── public/               # Static assets
```

## Deployment

This project is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Deploy with default settings

## Environment Variables

The app works without environment variables (using dummy data), but for full functionality, add these in Vercel:

### Required for Database Features:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Required for Mining Agent:
```bash
FIRECRAWL_API_KEY=your_firecrawl_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Optional:
```bash
NEWS_API_KEY=your_news_api_key
NEWS_API_HOST=your_news_api_host
```

To add these in Vercel:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable with its value
4. Redeploy your application

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Contact

For questions or support, please contact the Lithos team. 