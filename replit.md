# Replit.md

## Overview

This is a product quoting application (自动报价器 - "Auto Quote Generator") built with a React frontend and Express backend. The application guides users through a multi-step flow to generate quotes for packaging products (gift boxes and pouches). Users select a product type, fill out a survey with product specifications, and receive a quote.

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

### January 2026 - Gravure Printing Survey Implementation
- Added printing method selection (gravure/digital) to ProductSelectPage for pouch products
- Implemented comprehensive gravure configuration data models in `client/src/lib/gravure-config.ts`:
  - 10 bag types with area formulas, waste coefficients, and bag making rates
  - 20+ material types with thickness, density, and price properties
  - Print coverage options (25-300%)
  - Lamination types (dry, dry retort, solventless)
  - Post-processing options with pricing formulas
  - Spout prices configuration
- Built 7-module accordion-based survey interface for gravure printing:
  1. 袋型与尺寸 (Bag Type & Dimensions) - bag type selection and dimension fields
  2. 材料层结构 (Material Layer Structure) - 1-4 layer material configuration
  3. 工艺成本 (Process Cost) - printing coverage and lamination steps
  4. 后处理 (Post-Processing) - optional features like zipper, spout, hot stamp
  5. 制版与起订 (Plate & MOQ) - plate configuration and quantity discounts
  6. 制袋成本 (Bag Making Cost) - waste coefficients and bag making rates
  7. 利润设置 (Profit Settings) - profit rate configuration
- Visual distinction between user input fields (User icon, primary color) and backend configuration fields (Settings icon, muted color)
- State persistence to global context via QuoteProvider including all backend configuration parameters

## Application Flow
1. **ProductSelectPage** (`/`) - User selects product type (box/pouch) and printing method for pouches
2. **SurveyPage** (`/survey`) - User configures product parameters based on selected type/method
3. **QuotePage** (`/quote`) - System calculates and displays the quotation (to be implemented)