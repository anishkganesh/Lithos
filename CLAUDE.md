# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Test scrapers
npm run test:scraper
npm run test:scraper:mock
npm run test:scraper:real

# Populate projects
npm run populate:projects

# Demo scraper pipeline
npm run demo:scraper

# Test mining agent v2
npm run test:agent-v2
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript (strict mode enabled)
- **UI Components**: Radix UI + shadcn/ui components
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Integration**: OpenAI API
- **Web Scraping**: Firecrawl API
- **Fonts**: Geist Sans and Geist Mono
- **Charts**: Recharts
- **Tables**: TanStack Table

### Project Structure

```
lithos/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── chat/         # Chat AI endpoints
│   │   ├── mining-agent/ # Mining data collection
│   │   └── web-search/   # Web search integration
│   ├── dashboard/         # Main dashboard (requires auth)
│   ├── login/            # Login page
│   └── signup/           # Signup page
├── components/            # React components
│   ├── project-screener/ # Mining project table
│   ├── project-detail-panel/ # Project analysis views
│   ├── ui/              # Reusable UI components
│   └── mining-agent-*.tsx # Mining agent UI components
├── lib/                   # Core utilities
│   ├── mining-agent/     # Mining data orchestration
│   │   ├── scrapers/     # Various data source scrapers
│   │   └── *.ts         # Processing and extraction
│   ├── types/            # TypeScript definitions
│   ├── auth-context.tsx  # Authentication provider
│   ├── chat-context.tsx  # Chat UI state
│   └── global-chat-context.tsx # Global chat functionality
└── public/               # Static assets
```

### Key Architectural Patterns

#### Context Providers
The app uses nested React Context providers in `app/layout.tsx`:
1. `AuthProvider` - Manages authentication state
2. `ChatProvider` - Controls chat UI state  
3. `GlobalChatProvider` - Handles AI chat functionality

#### Database Access
- Uses Supabase client from `lib/supabase.ts`
- Service role client available in `lib/supabase-service.ts` for admin operations
- Tables include: projects, chat_history, agent_runs, companies, usr, brands

#### Mining Agent System
The mining agent (`lib/mining-agent/`) is a sophisticated data collection system:
- **Orchestrator**: Coordinates multiple scrapers and document processing
- **Scrapers**: Different scrapers for ASX, SEDAR, EDGAR, LSE, and general mining news
- **Document Processor**: Extracts structured project data from documents
- **Progress Tracking**: Real-time progress updates during scraping operations

#### API Route Pattern
All API routes follow consistent patterns:
- Located in `app/api/*/route.ts`
- Use standard HTTP methods (GET, POST)
- Return consistent JSON responses
- Handle errors gracefully

#### Component Conventions
- All client components must include `"use client"` directive
- Use TypeScript interfaces for component props
- Leverage shadcn/ui components from `components/ui/`
- Follow existing patterns for new components

### Environment Variables
Required environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FIRECRAWL_API_KEY=
OPENAI_API_KEY=
NEWS_API_KEY= (optional)
NEWS_API_HOST= (optional)
```

### Important Notes

#### Build Configuration
The Next.js config (`next.config.mjs`) has:
- ESLint errors ignored during builds
- TypeScript errors ignored during builds
- Images unoptimized

This suggests focusing on functionality over strict linting during development.

#### Path Aliases
The project uses `@/*` as a path alias for the root directory, configured in `tsconfig.json`.

#### Styling
- Use Tailwind CSS classes exclusively
- Utilize the `cn()` utility from `lib/utils.ts` for conditional classes
- Theme customization via CSS variables in `app/globals.css`

#### Authentication Flow
1. Users authenticate via `/login` or `/signup`
2. Protected routes (like `/dashboard`) redirect to login if unauthenticated
3. Auth state managed globally via `AuthProvider`

#### Mining Project Data
The app focuses on critical minerals mining projects with:
- Comprehensive project screening table
- Detailed project analysis views
- Sensitivity analysis for financial metrics
- AI-powered insights and recommendations
- Real-time data collection from multiple sources