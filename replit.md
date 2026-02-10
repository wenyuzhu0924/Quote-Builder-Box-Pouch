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

### February 10, 2026 - Eight-Side Bag Side Material Differentiation
- **Eight-Side Bag (八边封) Added**: New bag type option in gravure printing bag type list
- **Side Material Differentiation Mode**: Toggle between "sides same as front/back" vs "sides use different materials"
  - When `eightSideMode="diff"`, system maintains separate material stacks, separate print coverage, and separate lamination steps
  - Area split: frontBackBottomArea and twoSideArea calculated separately
- **Calculation**: gravureCosts splits material/print/lamination costs by area zone; breakdown shows split details