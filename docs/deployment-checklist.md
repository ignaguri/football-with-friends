# Production Deployment Checklist

This checklist ensures safe deployment of database migrations to production.

## Pre-Deployment

### 1. Environment Validation

- [ ] Run `pnpm env:check` to validate environment variables
- [ ] Verify `STORAGE_PROVIDER=turso` is set
- [ ] Confirm `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are correct
- [ ] Test database connection with `pnpm migrate-remote status`

### 2. Migration Testing

- [ ] All migrations tested locally with `pnpm migrate up`
- [ ] Rollback tested locally with `pnpm migrate down`
- [ ] No ESLint errors: `pnpm lint migrations/`
- [ ] TypeScript compilation passes: `pnpm typecheck`

### 3. Migration Validation

- [ ] Check migration status: `pnpm migrate-remote status`
- [ ] Run dry-run: `pnpm migrate-remote dry-run`
- [ ] Verify pending migrations are expected
- [ ] Review migration file names follow convention

### 4. Backup Strategy

- [ ] Database backup created (if needed)
- [ ] Rollback plan documented
- [ ] Emergency contact information available

## Deployment

### 1. Apply Migrations

- [ ] Run `pnpm migrate-remote up`
- [ ] Monitor console output for errors
- [ ] Verify all migrations completed successfully

### 2. Post-Deployment Verification

- [ ] Check migration status: `pnpm migrate-remote status`
- [ ] Verify database schema changes
- [ ] Test application functionality
- [ ] Monitor application logs for errors

## Emergency Procedures

### If Migration Fails

1. **Stop immediately** - don't continue with other deployments
2. **Check error message** - identify the specific issue
3. **Assess impact** - determine if rollback is needed
4. **Rollback if necessary** - `pnpm migrate-remote down`
5. **Fix the issue** - address the root cause
6. **Test locally** - ensure fix works
7. **Re-deploy** - try migration again

### If Rollback is Needed

1. **Assess data integrity** - check if rollback is safe
2. **Run rollback** - `pnpm migrate-remote down [n]`
3. **Verify rollback** - check database state
4. **Test application** - ensure everything works
5. **Document incident** - record what happened

## Environment-Specific Notes

### Vercel Deployment

- Migrations run manually before deployment
- Environment variables set in Vercel dashboard
- No automatic migration execution

### Local Development

- Use `pnpm migrate` for local testing
- Local database: `file:./local.db`
- Safe to experiment and rollback

## Contact Information

- **Primary Developer**: [Your Name]
- **Backup Contact**: [Backup Name]
- **Emergency Escalation**: [Manager/Lead]

## Migration Commands Reference

```bash
# Check environment
pnpm env:check

# Local testing
pnpm migrate up
pnpm migrate down
pnpm migrate status

# Production deployment
pnpm migrate-remote dry-run
pnpm migrate-remote up
pnpm migrate-remote status

# Emergency rollback
pnpm migrate-remote down [n]
```

## Common Issues and Solutions

| Issue                        | Solution                                |
| ---------------------------- | --------------------------------------- |
| Environment validation fails | Check `.env` file and Vercel settings   |
| Database connection fails    | Verify Turso credentials                |
| Migration syntax error       | Test locally first, check Kysely syntax |
| Rollback fails               | Check migration `down` function         |
| Permission denied            | Ensure proper Turso auth token          |

---

**Remember**: Always test migrations locally before deploying to production!
