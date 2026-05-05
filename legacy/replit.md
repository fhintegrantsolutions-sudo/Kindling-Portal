# Kindling - Private Note Investing Portal

## Overview

Kindling is a client portal for private note investing that allows users to manage their investment portfolio, view active notes, and register for new investment opportunities. The application is a full-stack TypeScript project with a React frontend and Express backend, using PostgreSQL for data persistence.

The platform enables investors to:
- View dashboard summaries of their portfolio
- Browse and manage active note participations
- Discover new investment opportunities
- Manage profile settings, documents, and beneficiaries

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Build Tool**: Vite for development and production builds

The frontend follows a page-based structure with reusable components. Pages include Dashboard, Notes, Opportunities, Profile, and Auth. The design uses a serif font (Libre Baskerville) for headings and Inter for body text, creating a professional financial services aesthetic.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Design**: RESTful endpoints prefixed with `/api`
- **Session Management**: Connect-pg-simple for PostgreSQL session storage

The server provides CRUD operations for notes, participations, payments, beneficiaries, and documents. Routes are registered in `server/routes.ts` and the storage layer abstracts database operations in `server/storage.ts`.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Entities**:
  - `users`: Investor accounts with authentication
  - `notes`: Investment notes with terms, rates, and status
  - `participations`: User investments in specific notes
  - `payments`: Payment records for participations
  - `beneficiaries`: User-designated beneficiaries
  - `documents`: Uploaded tax/legal documents

### Build and Development
- Development runs with `tsx` for TypeScript execution
- Production build uses esbuild for server bundling and Vite for client
- Database migrations managed via `drizzle-kit push`

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with PostgreSQL driver (`node-postgres`)

### UI Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Shadcn/ui**: Pre-configured component library using Radix + Tailwind
- **Lucide React**: Icon library
- **Recharts**: Charting library for portfolio visualizations
- **date-fns**: Date formatting and manipulation

### Form and Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation (integrated with Drizzle via `drizzle-zod`)
- **@hookform/resolvers**: Zod resolver for React Hook Form

### Development Tools
- **Vite**: Frontend build tool with HMR
- **Tailwind CSS v4**: Utility-first CSS framework
- **TypeScript**: Type safety across full stack

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay for development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development environment indicator