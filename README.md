# XCLSV Process Hub

A centralized knowledge management system for documenting and organizing all operational processes at XCLSV Media.

## Overview

The Process Hub serves as the single source of truth for how XCLSV operates, replacing fragmented Google Drive folders with structured, role-based process documentation.

## Tech Stack

- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Backend**: NestJS with TypeScript
- **Frontend**: Next.js 14+ with React
- **Auth**: JWT-based authentication
- **Storage**: AWS S3 for media files
- **Search**: PostgreSQL full-text search + Vector embeddings

## Project Structure

```
xclsv-processes-hub/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── database/     # Prisma schema & client
│   └── shared/       # Shared types & utilities
└── package.json      # Monorepo root
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (Neon recommended)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/xclsv-bot/xclsv-processes-hub.git
   cd xclsv-processes-hub
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp packages/database/.env.example packages/database/.env
   # Edit .env with your database URL
   ```

4. Generate Prisma client and push schema:
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

5. Seed the database:
   ```bash
   pnpm --filter @xclsv/database seed
   ```

6. Start development servers:
   ```bash
   pnpm dev
   ```

## Operational Areas

The system organizes processes into XCLSV's 10 core operational areas:

1. Partnerships
2. Event Scheduling
3. Event Marketplace
4. Ambassador Recruitment
5. Ambassador Management
6. Operations
7. Client Management
8. Finances
9. Affiliate Management
10. Product Development

## License

Proprietary - XCLSV Media
