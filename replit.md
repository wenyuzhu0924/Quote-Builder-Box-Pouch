# Replit.md

## Overview

This is a **Quote Generator Builder** (报价器生成器) built with a React frontend and Express backend. The application is a **meta-tool** that allows users to create custom quote calculators for packaging products (gift boxes and pouches). Users:
1. Select a product type and printing method
2. Choose which parameters to include in their calculator
3. Get a dynamically generated quote calculator that only shows the selected fields and calculates costs in real-time

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: 
  - React Query (@tanstack/react-query) for server state
  - React Context for local quote state (QuoteProvider in `client/src/lib/quote-store.tsx`)
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful routes prefixed with `/api`
- **Storage**: Abstracted storage interface (`IStorage`) with in-memory implementation (`MemStorage`), designed for easy swap to database

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` using Drizzle's table definitions
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Migrations**: Managed via `drizzle-kit push` command

### Build System
- **Development**: Vite dev server with Express backend, HMR enabled
- **Production**: 
  - Frontend: Vite builds to `dist/public`
  - Backend: esbuild bundles server to `dist/index.cjs`
  - Selective dependency bundling for faster cold starts

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/ui/  # shadcn/ui components
│       ├── pages/          # Route pages
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utilities and state
├── server/           # Express backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data access layer
│   └── static.ts     # Static file serving
├── shared/           # Shared code (schemas, types)
└── migrations/       # Database migrations
```

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

## External Dependencies

### Database
- **PostgreSQL**: Primary database (connection via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Database operations and schema management

### UI/Frontend Libraries
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **date-fns**: Date manipulation
- **React Day Picker**: Calendar component
- **Vaul**: Drawer component
- **cmdk**: Command palette component

### Development Tools
- **Vite**: Frontend build tool with Replit-specific plugins
- **esbuild**: Server bundling
- **Drizzle Kit**: Database schema management
- **TypeScript**: Type checking across the codebase

### Session Management
- **connect-pg-simple**: PostgreSQL session store (available but not currently implemented)

## Recent Changes

### January 2026 - Quote Generator Builder Implementation
- **Restructured application architecture** from direct quote calculator to meta-tool (quote generator builder)
- Implemented comprehensive gravure configuration data models in `client/src/lib/gravure-config.ts`:
  - 10 bag types with area formulas, waste coefficients, and bag making rates
  - 20+ material types with thickness, density, and price properties
  - Print coverage options (25-300%)
  - Lamination types (dry, dry retort, solventless)
  - Post-processing options with pricing formulas
  - Spout prices configuration
- **SurveyPage restructured** as parameter selection interface:
  - 7 accordion modules with checkboxes for 40+ parameters
  - Visual distinction: User icon (primary color) for end-user input fields, Settings icon (muted) for backend config
  - Users check which parameters to include in the generated calculator
- **QuotePage implemented** as dynamic quote calculator:
  - Dynamically renders only user-selected parameter fields
  - Real-time cost calculation using useMemo for performance
  - Covers materials, printing, lamination, post-processing, waste, bag-making, quantity discounts, and profit
  - "编辑参数" button to return to survey and adjust selections
- **Updated global state management** with new types:
  - `SelectedParameters`: tracks which fields are enabled in the calculator
  - `BackendDefaults`: stores default configuration values
  - `QuoteGeneratorConfig`: complete configuration for the generated calculator

## Application Flow
1. **ProductSelectPage** (`/`) - User selects product type (box/pouch) and printing method for pouches
2. **SurveyPage** (`/survey`) - **Parameter Selection**: User checks which parameters to include in the quote calculator via checkboxes in 7 accordion modules
3. **QuotePage** (`/quote`) - **Generated Calculator**: Displays only selected fields, calculates costs in real-time based on user inputs