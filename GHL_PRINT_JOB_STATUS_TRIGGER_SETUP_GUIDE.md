# GHL Product-Aware and All-Status Trigger Setup

## Existing trigger: Lulu Print Job Shipped

Keep the existing trigger for shipment notifications:

```text
Name: Lulu Print Job Shipped
Key: lulu_print_job_shipped
```

### Status filter

Use:

```text
Name: Status
Type: Select
Reference: status
Option type: Constants
Label: Shipped
Value: SHIPPED
```

The backend emits this trigger only when Lulu reports `SHIPPED`.

### Global Product filter

Because LiteraryApp creates one GHL Global Product whose name equals the book title, configure the second filter as follows:

```text
Name: Global Product
Type: Select
Required: Yes
Reference: ghlProductId
Option type: Internal Reference
Internal module: Global Products
```

The important change is the **Reference**. Use `ghlProductId`, not `bookTitle`.

The event payload now includes both values:

```json
{
  "bookTitle": "Example Book",
  "ghlProductId": "<the-GHL-Global-Product-ID>"
}
```

The filter should match the stable Global Product ID. The exact title remains available through the `bookTitle` custom variable for messages and workflow conditions.

The backend also supports older subscriptions that still use `reference = bookTitle` with a Global Product value. New workflows should use `ghlProductId`.

## New trigger: all Lulu status changes

Create a second Marketplace trigger. Do not change the meaning of the existing shipped trigger because its key is immutable and existing workflows may depend on it.

```text
Name: Lulu Print Job Status Changed
Key: lulu_print_job_status_changed
```

Use the same Subscription URL and secret as the shipped trigger:

```text
https://YOUR_BACKEND_DOMAIN/workflow-trigger/subscription
```

```text
X-LiteraryApp-Trigger-Secret: YOUR_GHL_TRIGGER_SUBSCRIPTION_SECRET
```

### Status filter

Configure a **Multi-Select** filter:

```text
Name: Status
Reference: status
Type: Multi-Select
Option type: Constants
```

Add these values:

```text
CREATED                 Created
UNPAID                  Unpaid
PAYMENT_IN_PROGRESS     Payment in Progress
PRODUCTION_DELAYED      Production Delayed
PRODUCTION_READY        Production Ready
IN_PRODUCTION           In Production
SHIPPED                 Shipped
DELIVERED               Delivered
REJECTED                Rejected
CANCELED                Canceled
ERROR                   Error (defensive application mapping)
```

Lulu’s current documentation explicitly lists the first 10 values. LiteraryApp also supports `ERROR` defensively; keep it only if the raw Lulu payloads in your account use it.

### Global Product filter for the all-status trigger

Add the same product filter:

```text
Name: Global Product
Type: Select
Required: Yes
Reference: ghlProductId
Option type: Internal Reference
Internal module: Global Products
```

### Custom variables

Add at least:

```text
contactId
contactName
firstName
lastName
bookTitle
ghlProductId
luluPrintJobId
internalPrintJobId
status
statusChangedAt
trackingId
trackingUrl
carrierName
quantity
shippingLevel
locationId
```

Tracking fields may be empty for statuses before `SHIPPED`; this is expected. Lulu documents shipment tracking at `SHIPPED`, not during the earlier production states.

## Required deployment steps

1. Run `server/db/production_schema.sql` in Supabase. This adds `print_jobs.ghl_product_id` and creates/updates the trigger tables.
2. Deploy the updated backend.
3. Confirm each approved book has `books.ghl_product_id` populated.
4. Confirm new orders copy that value into `print_jobs.ghl_product_id`.
5. In the GHL Developer Portal, update the shipped trigger definition to include `ghlProductId` in sample data and use the `ghlProductId` filter reference.
6. Create the new all-status trigger using `GHL_PRINT_JOB_STATUS_TRIGGER_DEFINITION.json`.
7. Submit the new or changed trigger version for HighLevel review and wait for approval.
8. Create or update workflows in the target sub-account.
9. Confirm HighLevel sends subscription callbacks for both trigger keys.
10. Verify the stored subscriptions:

```sql
select location_id, workflow_id, trigger_key, active, filters, target_url
from ghl_trigger_subscriptions
where trigger_key in ('lulu_print_job_shipped', 'lulu_print_job_status_changed');
```

## Runtime behavior

- Lulu sends `PRINT_JOB_STATUS_CHANGED` to LiteraryApp.
- LiteraryApp verifies the Lulu HMAC signature and resolves the order by `locationId` and Lulu print-job ID.
- The status transition is persisted.
- `lulu_print_job_shipped` is emitted only for `SHIPPED`.
- `lulu_print_job_status_changed` is emitted for every non-empty Lulu status transition.
- Both events include the original sub-account's `locationId` and the order's `ghlProductId`.
- Only subscriptions belonging to that location are queried and delivered.
- The delivery ledger prevents duplicate deliveries for the same subscription, trigger, job, status, and status-change timestamp.

## Files

- `GHL_PRINT_TRIGGER_DEFINITION.json` — updated shipped trigger definition.
- `GHL_PRINT_JOB_STATUS_TRIGGER_DEFINITION.json` — new all-status trigger definition.
- `server/services/ghlTriggerService.js` — product-aware filters and both emitters.
- `server/services/statusService.js` — schedules the all-status event for every transition.
- `server/routes/workflowTrigger.js` — accepts both trigger keys.
- `server/services/orderService.js` — carries the product ID into order creation.
- `server/db/database.js` — persists the product ID on print jobs.
- `server/db/production_schema.sql` — adds `print_jobs.ghl_product_id`.

## Official references

- [Lulu Print API Documentation](https://api.lulu.com/docs/)
- [HighLevel Creating a Marketplace Workflow Trigger](https://marketplace.gohighlevel.com/docs/marketplace-modules/CustomTriggers/)
