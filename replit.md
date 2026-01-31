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

### January 31, 2026 - Digital Printing Configuration System
- **Digital Printing Survey Page** with 8 accordion modules:
  - 袋型: 15 built-in digital bag types (三边封, 自立袋变体, 八边封变体, 卷膜, 异形袋)
  - 印刷层材料: 19 default materials (MOPP, BOPP, PET, 牛皮纸, etc.)
  - 复合层材料: 24 default materials (VMPET, AL, NY, CPP, VMCPP, etc.)
  - 热封层材料: 26 default materials (PE, PLA, CPP, APE, etc.)
  - 印刷模式: 4 modes (无印刷, 单黑, 单白, 双层白) with 5-tier meter-based pricing
  - 特殊工艺: 15 special processes (双面印刷, 异形袋, 可变码, 局部UV, 烫金, etc.)
  - 附件配置: 8 zipper types, 3 valve types, 8 accessories with stackable flags
  - 系统常量: Device limits (740mm width, 1120mm circumference), waste factors, VAT rate

- **Digital Printing Data Types**:
  - `DigitalMaterial`: 3-category structure (print/composite/seal) with kg price and square meter price
  - `DigitalPrintMode`: Print mode with enable flag
  - `DigitalSpecialProcess`: Special process with formula, min price, and notes
  - `DigitalZipperType`, `DigitalValveType`, `DigitalAccessory`: Accessory types with pricing
  - `DigitalPrintingTier`: Meter-based tier pricing (≤500m, 500m-1000m, etc.)
  - `DigitalSystemConstants`: Device limits and waste coefficients
  - `DigitalGeneratorConfig`: Complete digital printing configuration

- **State Management Updates**:
  - Added `digitalConfig` to QuoteState
  - Added `updateDigitalConfig()` method to QuoteProvider
  - Extended `generateOutput()` to include digitalConfig for digital printing
  - Extended `parseDimensionsFromFormula()` to include digital dimension keywords (侧琴, 封边, 面积系数, 数量单位)

### January 31, 2026 - Custom Bag Types and Dynamic Configuration
- **袋型 Module Redesign**:
  - Added `CustomBagType` interface with formula and auto-detected `requiredDimensions`
  - Added `parseDimensionsFromFormula()` helper that detects Chinese dimension keywords (袋宽, 袋高, 底插入, etc.)
  - Users can add custom bag types with formulas; system auto-detects required dimension fields
  - Built-in bag types marked with "(内置)" label, formulas are read-only
  - Custom bag types allow full editing and deletion

- **材料 Module Changes**:
  - Removed "类别" (category) column from `CustomMaterial`
  - Removed material layer count selector from survey page (moved to quote page)
  - Added "保存材料库" button with toast confirmation

- **复合 Module Changes**:
  - Removed lamination step count selector from survey page (moved to quote page)
  - Added +/delete buttons for custom lamination types

- **后处理 Module Changes**:
  - Added +/delete buttons for custom post-processing options
  - Added "保存后处理选项" button with toast confirmation

- **制版 Module Changes**:
  - Changed to informational display only in survey page
  - Actual plate cost inputs moved to quote page

- **QuotePage Dynamic Features**:
  - Material layers are now fully dynamic (user adds/removes as needed, 1-5 layers)
  - Lamination steps are now fully dynamic with "添加复合" button
  - Plate cost inputs integrated into quote page
  - Bag type dropdown uses configured `customBagTypes` from config

### January 2026 - Quote Generator Builder Complete Restructure
- **Completely restructured SurveyPage** from parameter selection to configuration builder:
  - 7 accordion modules for comprehensive configuration
  - Bag type selection with table format (add/remove custom types)
  - Material library editor (name, thickness, density, grammage, price, notes)
  - Printing price rules (coverage percentage to price/㎡ mapping)
  - Lamination price rules (lamination type to price/㎡)
  - Post-processing options library (enable/disable with price formulas)
  - Plate price configuration (informational display)
  - Quantity discount rules (min quantity, coefficient, label)
  
- **Data types in quote-store.tsx**:
  - `CustomBagType`: Bag type with formula and auto-detected dimensions
  - `CustomMaterial`: Material library entry (no category field)
  - `PrintingPriceRule`: Coverage-to-price mapping
  - `LaminationPriceRule`: Lamination type-to-price mapping
  - `PostProcessingOptionConfig`: Post-processing option with enable flag and price formula
  - `PlatePriceConfig`: Plate cost calculation parameters
  - `QuantityDiscountRule`: Quantity-based discount tiers
  - `GeneratorConfig`: Complete configuration for generated calculator
  
- **QuotePage** as dynamic quote calculator:
  - Bag type dropdown with dimension inputs based on selected bag
  - Dynamic material layers (add/remove by user)
  - Dynamic lamination steps (add/remove by user)
  - Post-processing option cards (checkboxes with real-time cost display)
  - Printing coverage selector
  - Plate cost inputs (separate from per-unit price)
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
- Material layer count is controlled dynamically by user in quote page (1-5 layers)
- Lamination step count is controlled dynamically by user in quote page
- Custom bag types support formula-based dimension detection via `parseDimensionsFromFormula()`
- Area formulas use Chinese keywords: 袋宽, 袋高, 底插入, 侧面展开, 背封边
