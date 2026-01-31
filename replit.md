# Replit.md

## Overview

This is a **Quote Generator Builder** (报价器生成器) built with a React frontend and Express backend. The application is a **meta-tool** that allows users to create custom quote calculators for packaging products (gift boxes and pouches). Users:
1. Select a product type and printing method
2. Configure pricing logic and libraries (materials, post-processing, discounts, etc.)
3. Get a dynamically generated quote calculator that shows only configured options and calculates costs in real-time

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

### January 2026 - Quote Generator Builder Complete Restructure
- **Completely restructured SurveyPage** from parameter selection to configuration builder:
  - 7 accordion modules for comprehensive configuration
  - Bag type selection with checkboxes (shows area formula and required dimensions)
  - Material library editor (name, category, thickness, density, grammage, price, notes)
  - Printing price rules (coverage percentage to price/㎡ mapping)
  - Lamination price rules (lamination type to price/㎡)
  - Post-processing options library (enable/disable with price formulas)
  - Plate price configuration (length, circumference, color count, price per cm²)
  - Quantity discount rules (min quantity, coefficient, label)
  
- **New data types in quote-store.tsx**:
  - `CustomMaterial`: Material library entry with all specifications
  - `PrintingPriceRule`: Coverage-to-price mapping
  - `LaminationPriceRule`: Lamination type-to-price mapping
  - `PostProcessingOptionConfig`: Post-processing option with enable flag and price formula
  - `PlatePriceConfig`: Plate cost calculation parameters
  - `QuantityDiscountRule`: Quantity-based discount tiers
  - `GeneratorConfig`: Complete configuration for generated calculator
  
- **Rebuilt QuotePage** as dynamic quote calculator:
  - Bag type dropdown with dimension inputs based on selected bag
  - Material layers with quick-add buttons for first 4 materials
  - Lamination step selectors (configurable step count)
  - Post-processing option cards (checkboxes with real-time cost display)
  - Printing coverage selector
  - Plate cost calculator (separate from per-unit price)
  - Profit rate and exchange rate inputs
  - Real-time cost calculation with breakdown display
  - Quote results showing unit price and total in CNY and USD

## Application Flow
1. **ProductSelectPage** (`/`) - User selects product type (box/pouch) and printing method for pouches
2. **SurveyPage** (`/survey`) - **Configuration Builder**: User configures pricing logic, material library, and options for the quote calculator
3. **QuotePage** (`/quote`) - **Generated Calculator**: Displays configured options, calculates costs in real-time based on user inputs

## Key Design Decisions
- Plate cost is calculated separately from per-unit cost (版费与袋子单价分开结算)
- Profit rate is on the generated calculator, not the configuration page
- Material library supports configurable layer count (1-5 layers)
- Lamination supports configurable step count (1-4 steps)
- Area formulas are based on bag type and display required dimension fields dynamically
