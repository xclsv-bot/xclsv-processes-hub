# Quick Start Optimizations
**Ready-to-apply fixes for immediate performance gains**

## 1. Update Root package.json (2 minutes)

Replace the current root `package.json` with this optimized version:

```json
{
  "name": "xclsv-processes-hub",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "clean": "pnpm -r exec rimraf dist .next",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r exec tsc --noEmit",
    "db:generate": "pnpm --filter @xclsv/database generate",
    "db:push": "pnpm --filter @xclsv/database push",
    "db:migrate:create": "pnpm --filter @xclsv/database migrate:create",
    "db:migrate:apply": "pnpm --filter @xclsv/database migrate:apply",
    "db:migrate:deploy": "pnpm --filter @xclsv/database migrate:deploy",
    "db:seed": "tsx packages/database/prisma/seed.ts",
    "db:studio": "pnpm --filter @xclsv/database studio"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.7.0",
    "ts-node": "^10.9.2",
    "@types/node": "^20.10.0",
    "rimraf": "^6.0.0"
  },
  "dependencies": {
    "pg": "^8.20.0"
  }
}
```

**Then run:**
```bash
cd ~/projects/xclsv-processes-hub
pnpm install
```

---

## 2. Update Database Package Scripts (1 minute)

Update `packages/database/package.json` scripts section:

```json
{
  "scripts": {
    "generate": "prisma generate",
    "push": "prisma db push",
    "migrate": "prisma migrate dev",
    "migrate:create": "prisma migrate dev --create-only",
    "migrate:apply": "prisma migrate dev --skip-generate",
    "migrate:deploy": "prisma migrate deploy",
    "seed": "tsx prisma/seed.ts",
    "studio": "prisma studio",
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

---

## 3. Optimize Render Deploy (2 minutes)

Replace `apps/api/render.yaml` with:

```yaml
services:
  - type: web
    name: xclsv-processes-api
    runtime: node
    region: ohio
    plan: free
    buildCommand: |
      echo "Build started: $(date)"
      pnpm install --frozen-lockfile
      pnpm db:generate
      pnpm --filter @xclsv/api build
      echo "Build completed: $(date)"
    startCommand: node apps/api/dist/main.js
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: CORS_ORIGINS
        value: https://web-xclsv.vercel.app,https://process-hub.xclsvmedia.com
```

**Test locally before pushing:**
```bash
cd ~/projects/xclsv-processes-hub
pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @xclsv/api build
```

---

## 4. Improved Migration Workflow

### Creating a New Migration
```bash
# From project root
pnpm db:migrate:create -- --name your_migration_name

# This creates the migration file in packages/database/prisma/migrations/
# Edit the SQL if needed, then apply:
pnpm db:migrate:apply
```

### Development Workflow
```bash
# 1. Make schema changes in packages/database/prisma/schema.prisma
# 2. Create migration
pnpm db:migrate:create -- --name add_new_field

# 3. Review the generated SQL in migrations folder
# 4. Apply migration
pnpm db:migrate:apply

# 5. Commit both schema.prisma and migration files
git add packages/database/prisma/
git commit -m "feat: add new field migration"
```

### Production Deployment
```bash
# Already configured in GitHub Actions
# Runs automatically after API deploy:
pnpm db:migrate:deploy
```

---

## 5. Developer Quality of Life Scripts

Add these to your shell profile or create a `scripts/dev.sh`:

```bash
#!/bin/bash
# Quick development commands

alias ph-dev="cd ~/projects/xclsv-processes-hub && pnpm dev"
alias ph-build="cd ~/projects/xclsv-processes-hub && pnpm build"
alias ph-db="cd ~/projects/xclsv-processes-hub && pnpm db:studio"
alias ph-clean="cd ~/projects/xclsv-processes-hub && pnpm clean && pnpm install"

# Quick migration
ph-migrate() {
  cd ~/projects/xclsv-processes-hub
  if [ -z "$1" ]; then
    echo "Usage: ph-migrate <migration_name>"
    return 1
  fi
  pnpm db:migrate:create -- --name "$1"
  echo "Review the migration in packages/database/prisma/migrations/"
  echo "Run 'pnpm db:migrate:apply' when ready"
}
```

---

## Verification Checklist

After applying these changes:

- [ ] Run `pnpm install` successfully
- [ ] Run `pnpm typecheck` (should pass)
- [ ] Run `pnpm build` (should complete)
- [ ] Run `tsx packages/database/prisma/seed.ts` (should work from root)
- [ ] Create a test migration with `pnpm db:migrate:create -- --name test`
- [ ] Verify render.yaml syntax at https://render.com/docs/yaml-spec
- [ ] Push changes and monitor first deploy time

---

## Expected Results

✅ **Before:**
- Can't run TypeScript scripts from root
- `db push` only, no migration history
- Render deploys take 5-7 minutes
- Unclear build process

✅ **After:**
- Run `tsx` commands from anywhere
- Proper migration workflow with history
- Render deploys ~3-4 minutes (40-60% faster)
- Clear, reproducible builds
- Better developer ergonomics
