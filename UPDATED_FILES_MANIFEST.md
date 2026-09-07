# LiteraryApp Updated Files Package

This package contains the repository working tree plus its `.git` directory. It includes the uncommitted changes for the GHL Global Product-aware trigger and the all-status trigger.

## Updated tracked files

- `GHL_PRINT_TRIGGER_DEFINITION.json`
- `README.md`
- `server/db/database.js`
- `server/db/production_schema.sql`
- `server/routes/workflowTrigger.js`
- `server/services/ghlTriggerService.js`
- `server/services/orderService.js`
- `server/services/statusService.js`
- `server/trigger_smoketest.js`

## New files

- `GHL_PRINT_JOB_STATUS_TRIGGER_DEFINITION.json`
- `GHL_PRINT_JOB_STATUS_TRIGGER_SETUP_GUIDE.md`
- `GHL_TRIGGER_CONFIGURATION_REVIEW.md`
- `ORDER_SHIPPED_TRIGGER_AUDIT.md`
- `server/db/migrations/005_global_product_trigger.sql`
- `UPDATED_FILES_MANIFEST.md`

## After extracting

```bash
cd literaryapp
npm --prefix server install
npm --prefix server run test:trigger
node server/smoketest.js

git status
git add -A
git commit -m "Add product-aware and all-status Lulu GHL triggers"
git push origin main
```

Run `server/db/production_schema.sql` in Supabase, or apply `server/db/migrations/005_global_product_trigger.sql` if the existing production schema is already current. Update/submit the Marketplace trigger definitions in GHL after deployment.

The archive intentionally excludes installed dependency directories such as `server/node_modules` and `client/node_modules`; these are restored with the package managers after extraction.
