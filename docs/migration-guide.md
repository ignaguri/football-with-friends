# Database Migration Guide

This guide covers how to create, manage, and deploy database migrations for the Football with Friends application.

## Overview

The application uses Kysely with Turso (LibSQL) for database management. Migrations are stored in the `migrations/` directory and follow a strict naming convention.

## Quick Start

### 1. Create a New Migration

```bash
# Create a new migration with a descriptive name
pnpm create-migration add-user-preferences

# Or with a description
pnpm create-migration add-user-preferences "Add user preferences table with settings"
```

This will create a file like `migrations/20240115162947-add-user-preferences.ts` with a proper template.

### 2. Edit the Migration

Open the generated migration file and implement your changes:

```typescript
export const up: Migration["up"] = async (db: Kysely<any>) => {
  await db.schema
    .createTable("user_preferences")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull())
    .addColumn("theme", "text", (col) => col.defaultTo("light"))
    .addColumn("notifications", "boolean", (col) => col.defaultTo(true))
    .execute();

  console.log("✅ Added user preferences table");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  await db.schema.dropTable("user_preferences").execute();
  console.log("↩️ Removed user preferences table");
};
```

### 3. Test Locally

```bash
# Run migrations on local database
pnpm migrate up

# Check migration status
pnpm migrate status

# Rollback if needed
pnpm migrate down
```

### 4. Deploy to Production

```bash
# Check what will be migrated (dry run)
pnpm migrate-remote dry-run

# Apply migrations to remote Turso database
pnpm migrate-remote up

# Check remote migration status
pnpm migrate-remote status
```

## Migration Commands

### Local Development

| Command                 | Description                        |
| ----------------------- | ---------------------------------- |
| `pnpm migrate up`       | Run all pending migrations locally |
| `pnpm migrate down [n]` | Rollback n migrations (default: 1) |
| `pnpm migrate status`   | Check local migration status       |

### Remote Production

| Command                        | Description                         |
| ------------------------------ | ----------------------------------- |
| `pnpm migrate-remote up`       | Run all pending migrations on Turso |
| `pnpm migrate-remote down [n]` | Rollback n migrations on Turso      |
| `pnpm migrate-remote status`   | Check remote migration status       |
| `pnpm migrate-remote dry-run`  | Preview what migrations would run   |

### Migration Creation

| Command                                      | Description               |
| -------------------------------------------- | ------------------------- |
| `pnpm create-migration <name>`               | Create new migration file |
| `pnpm create-migration <name> "description"` | Create with description   |

## Migration File Format

### Naming Convention

Migration files must follow this format:

```
YYYYMMDDHHMMSS-description.ts
```

Examples:

- `20240115162947-add-user-preferences.ts`
- `20240116143022-update-match-schema.ts`
- `20240117110533-add-indexes.ts`

### File Structure

Every migration file must export two functions:

```typescript
import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Implementation here
  console.log("✅ Migration completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Rollback implementation here
  console.log("↩️ Migration rolled back");
};
```

### Required Imports

- `sql` from "kysely" - for raw SQL queries
- `Migration` type from "kysely" - for type safety

### Best Practices

1. **Always include console.log statements** for feedback
2. **Write reversible migrations** - implement both `up` and `down`
3. **Test locally first** before deploying to production
4. **Use descriptive names** that explain what the migration does
5. **Keep migrations small** - one logical change per migration
6. **Never edit existing migrations** - create new ones instead

## Common Migration Patterns

### Creating Tables

```typescript
export const up: Migration["up"] = async (db: Kysely<any>) => {
  await db.schema
    .createTable("table_name")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();
};
```

### Adding Columns

```typescript
export const up: Migration["up"] = async (db: Kysely<any>) => {
  await db.schema
    .alterTable("existing_table")
    .addColumn("new_column", "text")
    .execute();
};
```

### Creating Indexes

```typescript
export const up: Migration["up"] = async (db: Kysely<any>) => {
  await db.schema
    .createIndex("index_name")
    .on("table_name")
    .column("column_name")
    .execute();
};
```

### Inserting Data

```typescript
export const up: Migration["up"] = async (db: Kysely<any>) => {
  await db
    .insertInto("table_name")
    .values({
      id: "unique-id",
      name: "Example Name",
      created_at: sql`CURRENT_TIMESTAMP`,
    })
    .execute();
};
```

## Environment Configuration

### Local Development

Set `STORAGE_PROVIDER=local-db` in your `.env` file:

```env
STORAGE_PROVIDER=local-db
LOCAL_DATABASE_URL=file:./local.db
```

### Production (Turso)

Set `STORAGE_PROVIDER=turso` in your production environment:

```env
STORAGE_PROVIDER=turso
TURSO_DATABASE_URL=libsql://your-database-url
TURSO_AUTH_TOKEN=your-auth-token
```

## Validation and Quality Checks

### ESLint Rules

Migration files are automatically validated with ESLint rules that check:

- File naming convention
- Required imports
- Function signatures
- Type annotations
- Console.log statements

### Pre-commit Hooks

Before committing, the following checks run automatically:

- ESLint validation
- TypeScript compilation
- Prettier formatting

### Manual Validation

```bash
# Check migration files for issues
pnpm lint migrations/

# Type check migration files
pnpm typecheck
```

## Troubleshooting

### Migration Fails

1. **Check the error message** - it usually indicates the specific issue
2. **Verify your SQL syntax** - use the Kysely query builder
3. **Test locally first** - always test migrations locally before deploying
4. **Check database connection** - ensure environment variables are correct

### Rollback Issues

1. **Check migration history** - `pnpm migrate-remote status`
2. **Verify rollback logic** - ensure `down` function is correct
3. **Test rollback locally** - `pnpm migrate down` to test

### Environment Issues

1. **Validate environment** - `pnpm env:check`
2. **Check Turso credentials** - ensure `TURSO_AUTH_TOKEN` is valid
3. **Verify database URL** - ensure `TURSO_DATABASE_URL` is correct

### Common Errors

| Error                                    | Solution                                                |
| ---------------------------------------- | ------------------------------------------------------- |
| "Migration file name must follow format" | Use `pnpm create-migration` to generate files           |
| "Missing required imports"               | Add `import { sql } from "kysely"` and `Migration` type |
| "Database connection failed"             | Check environment variables with `pnpm env:check`       |
| "Migration already exists"               | Choose a different name or check existing files         |

## Production Deployment Checklist

Before deploying migrations to production:

- [ ] Test migration locally with `pnpm migrate up`
- [ ] Verify rollback works with `pnpm migrate down`
- [ ] Check migration status with `pnpm migrate-remote status`
- [ ] Run dry-run with `pnpm migrate-remote dry-run`
- [ ] Ensure you have a database backup
- [ ] Apply migration with `pnpm migrate-remote up`
- [ ] Verify migration status after deployment

## Migration History

The system tracks migration history in the `kysely_migration` table:

- `name` - Migration file name
- `timestamp` - When the migration was executed

You can view this history with:

```bash
pnpm migrate-remote status
```

## Getting Help

If you encounter issues:

1. Check this guide first
2. Run `pnpm migrate-remote status` to see current state
3. Use `pnpm migrate-remote dry-run` to preview changes
4. Test locally before deploying to production
5. Check the console output for detailed error messages

Remember: **Always test migrations locally before deploying to production!**
