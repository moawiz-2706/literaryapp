# Latest Order Workflow Fix Manifest

This package starts from the latest `origin/main` commit and includes the following uncommitted fixes.

## Order workflow fixes

- Removed optional GHL opportunity creation after Lulu order submission.
- Removed optional GHL contact custom-field update after Lulu order submission.
- Kept Lulu order creation and contact tagging intact.
- Normalized GHL Internal Reference product values when GHL sends an object, array, ID, or title.
- Matches the book by the stable `ghl_product_id` before title fallback.

## Lulu account/environment fixes

- Clears the in-memory and database Lulu access-token cache when integration credentials are saved.
- Prevents a still-valid token from an old Client ID/Secret from routing orders to the wrong Lulu account or sandbox/production environment.
- Logs the actual Lulu API base URL used during print-job creation.
- Adds the `/health` endpoint required by the Render configuration.

## Validation

```bash
npm --prefix server install
npm --prefix server run test:trigger
node server/smoketest.js
```

The archive excludes `server/node_modules`, `client/node_modules`, `.env*`, and build output. It includes `.git` metadata.

## Push after extraction

```bash
cd literaryapp_latest
git status
git add -A
git commit -m "Fix Lulu order routing and simplify order workflow"
git push origin main
```

After deployment, save the Lulu credentials again with the correct environment selected. The next order log will show either `https://api.lulu.com` or `https://api.sandbox.lulu.com`.
