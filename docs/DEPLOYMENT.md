# Deployment Guide

This guide explains how to set up automated deployments for database migrations to production.

## Automated Migration Deployment

When you push changes to the `main` branch that include migration files in `supabase/migrations/`, GitHub Actions will automatically:

1. ✅ Run CI checks (type checking, linting, build)
2. 🔄 Apply migrations to production Supabase
3. 📝 Generate updated TypeScript types
4. 💾 Commit types back to the repo if changed

## Required GitHub Secrets

To enable automated deployments, you need to add the following secrets to your GitHub repository:

### 1. `SUPABASE_ACCESS_TOKEN`

Your Supabase personal access token for API access.

**How to get it:**
1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Give it a name like "GitHub Actions"
4. Copy the token

**Add to GitHub:**
1. Go to your repo: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `SUPABASE_ACCESS_TOKEN`
4. Value: Paste your token
5. Click "Add secret"

### 2. `SUPABASE_PROJECT_REF`

Your Supabase project reference ID.

**How to get it:**
- From your Supabase project URL: `https://supabase.com/dashboard/project/YOUR-PROJECT-REF`
- Or from Settings → General → Reference ID

**Current value:** `tbsqgbgghjdezvhnssje`

**Add to GitHub:**
1. Go to your repo: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `SUPABASE_PROJECT_REF`
4. Value: `tbsqgbgghjdezvhnssje`
5. Click "Add secret"

### 3. `SUPABASE_DB_PASSWORD`

Your database password for the `postgres` user.

**How to get it:**
1. Go to your Supabase project → Settings → Database
2. Find "Database password" section
3. Click "Reset database password" if you don't have it saved
4. Copy the password

**Add to GitHub:**
1. Go to your repo: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `SUPABASE_DB_PASSWORD`
4. Value: Paste your database password
5. Click "Add secret"

### 4. `NEXT_PUBLIC_SUPABASE_URL` (Already configured)

Your production Supabase URL - already in your CI workflow.

### 5. `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Already configured)

Your production Supabase anon key - already in your CI workflow.

## Workflow Overview

### `.github/workflows/ci.yml`
Runs on every push and PR to `main`:
- Type checking
- Linting
- Build verification

### `.github/workflows/deploy-migrations.yml`
Runs on push to `main` when migration files change:
- Links to production Supabase
- Applies pending migrations
- Generates TypeScript types from the updated schema
- Commits type updates back to the repo

## Testing the Setup

### 1. Create a Test Migration

```bash
# While Supabase is running locally
pnpm supabase:start

# Create a test migration
npx supabase migration new test_deployment

# Add some SQL to the new migration file
echo "-- Test migration" > supabase/migrations/$(ls -t supabase/migrations | head -1)
```

### 2. Commit and Push

```bash
git add supabase/migrations/
git commit -m "test: add test migration"
git push origin main
```

### 3. Monitor Deployment

1. Go to your GitHub repo → Actions tab
2. Watch the "Deploy Migrations to Production" workflow
3. Check the logs for success/failure

### 4. Verify in Supabase

1. Go to https://supabase.com/dashboard/project/tbsqgbgghjdezvhnssje
2. Navigate to Database → Migrations
3. Verify your migration appears in the history

## Workflow Behavior

### When migrations are deployed:
- ✅ New migrations are applied in order
- ✅ Types are regenerated
- ✅ A commit is created if types changed (with `[skip ci]` to avoid loops)

### When migrations fail:
- ❌ Workflow fails and deployment stops
- ❌ Types are not updated
- ❌ Nothing is committed
- 📧 You'll receive a GitHub notification

## Manual Deployment (Backup)

If you need to deploy migrations manually:

```bash
# Link to production
npx supabase link --project-ref tbsqgbgghjdezvhnssje

# Apply migrations
npx supabase db push

# Generate types
npx supabase gen types typescript --linked > lib/types/database.ts
```

## Rollback Strategy

Supabase doesn't have automatic rollbacks. To rollback a migration:

1. Create a new migration that reverses the changes
2. Push to main to deploy the rollback migration

Example:
```bash
npx supabase migration new rollback_feature_x
# Edit the migration to undo changes
git add supabase/migrations/
git commit -m "rollback: revert feature X migration"
git push origin main
```

## Best Practices

1. **Test locally first**: Always test migrations with `pnpm supabase:reset` locally
2. **Small migrations**: Keep migrations focused and small for easier rollbacks
3. **No data loss**: Avoid `DROP` statements in production migrations
4. **Monitor after deploy**: Check Supabase logs after automated deployments
5. **Backup before major changes**: Use Supabase's backup feature for major schema changes

## Troubleshooting

### Migration fails in CI but works locally

- Check that your local Supabase version matches production
- Verify all environment variables are set in GitHub Secrets
- Check for data-dependent migrations (e.g., constraints that fail on production data)

### Types not updating

- Check the workflow logs for errors in the "Generate TypeScript types" step
- Ensure the `lib/types/database.ts` file is not ignored in `.gitignore`
- Verify the GitHub Actions bot has write permissions

### Workflow not triggering

- Ensure the migration file is in `supabase/migrations/`
- Check that you pushed to the `main` branch
- Verify the workflow file syntax is correct
