## Overview

This project is a **Quote Generator Builder** (报价器生成器), a meta-tool designed to create custom quote calculators for packaging products, specifically gift boxes and pouches. It features a React frontend and an Express backend. The primary purpose is to empower users to:
1. Select a product type and printing method.
2. Configure detailed pricing logic, including material libraries, post-processing options, and discount structures.
3. Generate a dynamic, real-time quote calculator tailored to their specific configurations, displaying only relevant options and calculating costs instantly.

The project aims to streamline the quoting process for packaging manufacturers, offering flexibility and customization for various product specifications and pricing models.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for lightweight routing.
- **State Management**: React Query for server state; React Context for local quote state.
- **UI Components**: shadcn/ui library utilizing Radix UI primitives.
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode).
- **Build Tool**: Vite, providing Hot Module Replacement (HMR).

### Backend Architecture
- **Framework**: Express 5 on Node.js.
- **Language**: TypeScript with ES modules.
- **API Pattern**: RESTful API with `/api` prefix.
- **Storage**: Abstracted `IStorage` interface, currently implemented in-memory (`MemStorage`), designed for future database integration.

### Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL.
- **Schema**: Defined in `shared/schema.ts`, generated using Drizzle's table definitions.
- **Validation**: Zod schemas derived from Drizzle schemas via drizzle-zod.
- **Migrations**: Managed using `drizzle-kit push`.

### Build System
- **Development**: Vite dev server integrated with Express backend, HMR enabled.
- **Production**: Vite builds the frontend to `dist/public`; esbuild bundles the backend to `dist/index.cjs`.

### Project Structure
- **client/**: React frontend, including UI components, pages, hooks, and utilities.
- **server/**: Express backend, including API routes, storage logic, and static file serving.
- **shared/**: Contains shared code like schemas and types.
- **migrations/**: Database migration files.

### Key Design Decisions
- **Application Flow**: Users select a product (`/`), configure it via a "SurveyPage" (`/survey`), and then use the generated "QuotePage" (`/quote`).
- **Dynamic Configuration**: The system supports custom bag types with formula-based dimension detection and dynamic material/lamination layer management directly within the quote page.
- **Pricing Flexibility**: Extensive configuration for digital printing, post-processing (with structured pricing types), and quantity discounts.
- **Cost Separation**: Plate costs are treated separately from per-unit costs.
- **Profit Rate**: Configurable on the generated calculator, not during configuration.
- **UI/UX**: Focus on a builder-style interface for configuration (SurveyPage) and a dynamic, real-time calculator for quoting (QuotePage).

## External Dependencies

### Database
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: For database interactions and schema management.

### UI/Frontend Libraries
- **Radix UI**: Foundational accessible UI component primitives.
- **Lucide React**: Icon library.
- **Embla Carousel**: Carousel component.
- **date-fns**: Date utility library.
- **React Day Picker**: Calendar component.
- **Vaul**: Drawer component.
- **cmdk**: Command palette component.

### Development Tools
- **Vite**: Frontend build tool.
- **esbuild**: Server bundling.
- **Drizzle Kit**: Database schema tooling.
- **TypeScript**: Language for type safety across the application.

## Recent Changes

### February 10, 2026 - Removed Roll Film (卷膜)
- Roll film bag type removed from gravure and digital printing bag type lists
- All roll film specific calculation logic, UI adaptations, and breakdown sections removed
- Roll film config removed from gravure-config.ts

### February 10, 2026 - Demo Gravure Link
- **Demo Route**: `/demo/gravure` provides a standalone gravure printing experience (survey + quote)
- **Independent State**: Demo uses its own `QuoteProvider`, completely separate from the main app
- **Auto-init**: Automatically sets `productType=pouch`, `printingMethod=gravure` on load
- **Navigation**: No back button on survey, no restart button on quote; edit params returns to demo survey
- **Main App Unaffected**: Routes `/`, `/survey`, `/quote` remain independent

### February 10, 2026 - Survey Page Label Changes & Post-Processing Split
- **Section Renames**: 印刷→印刷费用, 复合→复合费用, 制袋→制袋费用
- **Post-Processing Split**: Single "后处理" section split into two: "附加工艺" (拉链, 冲孔, 加铁丝, 手提, 透气阀, 定点开窗, 吸嘴, 激光易撕线) and "表面处理" (烫金, 激凸, 哑油工艺)
- **Category Field**: `PostProcessingOptionConfig` now has `category: "additionalProcess" | "surfaceTreatment"` field
- **Quote Page**: Post-processing options displayed in two separate cards matching the survey categories
- **Making Formula Validation**: Preview only shows formula content if it matches pattern `number × dimension`; otherwise displays "制袋费用计算公式"

### February 10, 2026 - Eight-Side Bag Side Material Differentiation
- **Eight-Side Bag (八边封) Added**: New bag type option in gravure printing bag type list
- **Side Material Differentiation Mode**: Toggle between "sides same as front/back" vs "sides use different materials"
  - When `eightSideMode="diff"`, system maintains separate material stacks, separate print coverage, and separate lamination steps
  - Area split: frontBackBottomArea and twoSideArea calculated separately
- **Calculation**: gravureCosts splits material/print/lamination costs by area zone; breakdown shows split details

### February 10, 2026 - Gift Box (礼盒) Quote Generator (Builder Pattern)
- **New Product Type**: Gift box quote generator following the gravure builder pattern
- **Config**: `client/src/lib/giftbox-config.ts` - configurable arrays: BoxTypeConfig (with requiredDimensions + areaFormula), PaperTypeConfig, LinerTypeConfig, CraftConfig, MoldFeeRule, plus helper functions getBoxPriceByQty/getMoldFeeInfo/evaluateGiftBoxAreaFormula/parseGiftBoxDimensionsFromFormula
- **Safe Formula Evaluator**: Recursive descent math parser (tokenize → parseExpr → parseTerm → parseFactor) only accepts numbers, +, -, *, /, and parentheses. No `new Function` or `eval`.
- **State**: `client/src/lib/giftbox-store.tsx` - GiftBoxProvider context holding GiftBoxSurveyConfig with config/updateConfig
- **Survey Page (Builder)**: `client/src/pages/giftbox-survey.tsx` - full configuration builder with 5 Accordion sections:
  - 盒型配置: formula table with editable formulas, auto-detected dimension badges, enable/disable toggle (separate from ladder)
  - 阶梯价格: per-box-type ladder pricing tables (only shows enabled box types)
  - 材料: paper types table (name + price/m²), liner types table (calcMethod/pricePerCubicM/minCost/processFee), board price, paper area ratio
  - 特殊工艺: enable/disable, calcType (perUnit/perArea), pricing, start price
  - 模具费用: quantity-based pricing tiers
- **Quote Page (Calculator)**: `client/src/pages/giftbox-quote.tsx` - config-driven real-time calculator:
  - 盒型与尺寸: box type select + 长/宽/高 inputs in one row (4 columns)
  - 订单信息: quantity, inline ladder price display, mold fee info, exchange rate, tax rate
  - 材料配置: paper/liner dropdowns + liner height ratio + hole count in one row
  - 特殊工艺: craft cards in grid layout with checkboxes, per-area input for area-based crafts
  - 费用明细: expandable cost breakdown sections with formula details
  - 汇总: summary with RMB and USD totals
  - Defensive useEffect for selection validity when config changes
- **Main App Integration**: Product select → /giftbox/survey (builder) → /giftbox/quote (calculator)
- **Demo Route**: `/demo/giftbox` - standalone access with no back/restart buttons
- **Routing**: App.tsx uses location-based routing to separate giftbox, demo, and pouch flows with independent providers

### February 11, 2026 - Digital Printing Calculation Engine
- **New File**: `client/src/lib/digital-calc.ts` - Complete calculation engine for digital printing quotes
  - Bag expansion formulas for all bag types (三边封, 自立袋, 中封, 风琴, 八边封, etc.)
  - Layout optimization: N_row (across maxPrintWidth) × N_circ (around circumference)
  - Revolution-based pricing: printingTiers use maxRevolutions/pricePerRevolution with mode multipliers
  - Material width optimization based on order revolutions and print pattern width
  - Lamination formula: max(laminationUnitPrice, laminationPerMeter × totalMeters) × layerCount
  - Bag-making formula: max(coefficient × L_rev × totalRevolutions × N_row, minPrice)
  - Eight-side bag separate body/side calculations with independent layout/rotation
  - Double-bag support (×2 multiplier for threeSideDouble, standupDouble, eightSideDouble)
  - File handling fee: (SKU - 5) × 50 when SKU > 5
  - Special process costs with perQuantity/perMeter/printMultiplier calc bases
- **Config Types Updated**: `DigitalGeneratorConfig` in quote-store.tsx
  - `CustomBagType` has `makingCoefficient` and `makingMinPrice` fields
  - `printingTiers` use `maxRevolutions`/`pricePerRevolution` (revolution-based, not meter-based)
  - `laminationUnitPrice`/`laminationPerMeter` for lamination cost config
- **Survey Page**: Added bag-making cost configuration UI (coefficient + min price per digital bag type), lamination price configuration section
- **Quote Page**: Uses `calculateDigital()` from digital-calc.ts; displays comprehensive cost breakdown (material, lamination, print, bag-making, accessories, special process, custom costs, file fees, with/without tax totals in CNY and USD)

### February 11, 2026 - Design System Refinement (Precision Swiss Upgrade)
- **Primary Color**: Changed from golden yellow to orange (#F05A0E / HSL 20 89% 50%), with white foreground
- **Background**: Warm neutral #F8F8F6 (HSL 60 14% 97%), cards pure white
- **Muted/Section**: Beige tone #E9DDCC (HSL 35 40% 86%) for section backgrounds
- **Neutral Scale**: neutral-900 (#111827) for headings, neutral-500 (#6B7280) for muted text, neutral-300 (#D1D5DB) for borders
- **Typography**: Inter font, font-bold (700) for headings with tracking-tight, font-semibold (600) for labels/buttons
- **Inputs**: 44px height (h-11), 1px neutral-300 border, 6px radius, orange focus ring (ring-2)
- **Buttons**: min-h-11, px-5 py-3, font-semibold, 200ms transition, orange primary bg
- **Cards**: rounded-lg (6px), consistent padding
- **Summary Panel**: 10px border-radius, box-shadow: 0 8px 24px rgba(0,0,0,0.06), price display text-2xl font-bold
- **Dark Mode**: Updated to match orange primary, neutral dark backgrounds (220 hue family)
- **Cleanup**: All hardcoded bg-orange-*, bg-blue-*, bg-green-* replaced with semantic tokens (bg-primary, text-primary, etc.)
- **Sticky Headers**: All page headers use z-50 for proper stacking