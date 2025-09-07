# AI Agent Instructions for Monerpy

## Project Overview
Monerpy is a personal finance management web application built with Astro, focusing on transaction tracking, recurring payments, and financial analytics. The application supports multi-user families with role-based access and works offline through PWA capabilities.

## Architecture & Key Components

### Frontend (Astro + TailwindCSS)
- Pages in `src/pages/` follow Astro's file-based routing
- Components in `src/components/` are reusable UI elements
- Layouts in `src/layouts/` define page structure templates
- Styles use TailwindCSS utility classes

### Backend (TypeScript + Prisma)
- Instead of API routes, use client-side actions
- Database access through Prisma ORM with Turso (SQLite-compatible)
- Authentication uses custom email/password system

### Data Model
Key entities and relationships:
- Families contain multiple users with roles (admin/member)
- Accounts belong to families and track balances
- Transactions link to accounts with categories and tags
- Recurring transactions generate regular entries

## Development Workflows

### Error check commands
```bash
pnpm astro check
```

### Setup
```bash
pnpm install
pnpm prisma generate # Generate Prisma client
pnpm dev # Start development server
```

### Database
- Migrations managed through Prisma
- Daily balance tracking requires careful transaction handling
- Account balances are computed from transaction history

### Testing & Validation
Focus on:
- Role-based access control
- Recurring transaction generation
- Offline data sync resolution
- Balance computation accuracy

## Project-Specific Patterns

### API Structure
- Client-side actions replace traditional API routes
- Dynamic routes use `[id]` parameter format
- Role checking in middleware layer

### State Management 
- Offline-first approach using PWA storage
- Background sync for pending transactions
- Real-time balance updates across components

### Data Flow
1. User actions trigger API calls
2. Server validates permissions and data
3. Database updates through Prisma
4. PWA sync layer handles offline state

## Cross-Component Integration
- Categories support parent-child relationships
- Transactions can have multiple tags
- Analytics aggregate across time periods
- Account balances depend on transaction timing

## Key Files
- `src/lib/` - Authentication logic
- `prisma/schema.prisma` - Data model definition
- `src/components/` - Reusable UI components

## Common Pitfalls
- Always check user roles before data operations
- Handle offline sync conflicts carefully
- Maintain account balance consistency
- Consider timezone effects on recurring transactions
- Don't assume the dependencies. Always verify them.