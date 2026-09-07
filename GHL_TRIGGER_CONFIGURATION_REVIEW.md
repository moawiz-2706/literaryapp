# GHL Trigger Configuration Review

## Conclusion

The current configuration is **correct for a shipped-only trigger**, provided that the trigger has been published/approved in the HighLevel Marketplace, the subscription URL and secret are correct, the app is installed in the target sub-account, and the production database/webhooks are active.

The `Status = SHIPPED` filter matches the repository implementation:

- `server/services/statusService.js` invokes the emitter only when `luluStatus === 'SHIPPED'`.
- `server/services/ghlTriggerService.js` hardcodes the emitted payload field to `status: 'SHIPPED'`.
- The trigger key is `lulu_print_job_shipped`.

Do **not** add all Lulu statuses to the existing shipped trigger and expect it to emit those statuses. The current backend never emits this trigger for `CREATED`, `UNPAID`, `IN_PRODUCTION`, `DELIVERED`, or any other status.

## Filter review

| Configuration item | Assessment | Recommendation |
| --- | --- | --- |
| Status → Select → Constant `Shipped = SHIPPED` | Correct | Keep it. It is redundant from a backend perspective because this trigger emits only `SHIPPED`, but it is useful as a user-facing confirmation. |
| Book Title → Select → Internal Reference → Global Products | Legacy-compatible but not preferred | Change the reference to `ghlProductId`. The payload now contains the stable GHL Global Product ID as well as the exact `bookTitle`. |
| Custom variables | Mostly correct | Keep the listed variables. Consider adding `trackingIds`, `trackingUrls`, `carrierNames`, `quantity`, and `shippingLevel` because the backend already emits them. |
| Contact ID variable | Correct but not automatic contact binding | Use a Find Contact step if the workflow’s Email/SMS action does not automatically resolve `contactId`. |

### Why the Book Title filter is a problem

The payload builder now sends both:

```json
{
  "bookTitle": "Example Book",
  "ghlProductId": "highlevel-global-product-id"
}
```

An Internal Reference → Global Products selection normally represents an internal HighLevel product reference, not an arbitrary book-title string. New configurations should therefore use `reference = ghlProductId`. The backend normalizes scalar IDs, arrays, and common HighLevel ID/name object shapes before comparing them. Existing subscriptions with `reference = bookTitle` are also supported: the matcher checks both the exact title and the product ID.

The failure symptom will be a log similar to:

```text
[GHL Trigger] subscription ... skipped because filters did not match payload status=SHIPPED
```

Use one of these approaches:

1. **Preferred:** configure the filter reference as `ghlProductId` with an Internal Reference → Global Products option.
2. **Existing-workflow compatibility:** leave `reference = bookTitle` temporarily; the updated matcher accepts either the exact title or the matching Global Product ID.
3. **Message personalization:** keep `bookTitle` as a custom variable for email/SMS text rather than using it as the stable product identity.

The repository now persists `ghlProductId` on `print_jobs`, falls back to the linked `books.ghl_product_id` for older orders, and includes it in both trigger payloads.

## Lulu status values

Lulu’s current official Print API documentation lists **10 print-job status values**:

| Lulu status | Meaning | Typical category | Tracking normally available? |
| --- | --- | --- | --- |
| `CREATED` | Print-job created | Initial | No |
| `UNPAID` | Print-job accepted and awaiting payment | Payment | No |
| `PAYMENT_IN_PROGRESS` | Payment is in progress | Payment | No |
| `PRODUCTION_DELAYED` | Paid job is waiting through the mandatory production delay | Production wait | No |
| `PRODUCTION_READY` | Production delay ended; job is about to enter production | Production | No |
| `IN_PRODUCTION` | Job submitted to the printer | Production | No |
| `SHIPPED` | All line items have shipped | Fulfillment | **Yes; Lulu documents tracking here** |
| `DELIVERED` | Carrier reports delivery; Lulu documents USPS, FedEx, and UPS support | Fulfillment | Existing tracking may remain available |
| `REJECTED` | Lulu rejected the job because of input/file or fulfillment problems | Error | No |
| `CANCELED` | Job was canceled, normally while unpaid, or canceled by Lulu in an exceptional production failure | Terminal/cancelled | No |
| `ERROR` | **Not listed in the current Lulu status enumeration**; the repository supports it defensively as a fulfillment-error value | Error | No |

The first ten values above are explicitly described in Lulu’s current documentation. The repository also supports `ERROR` in its status map and comments, but that value is **not enumerated on the current Lulu documentation page**. Treat `ERROR` as an application-side defensive mapping unless raw Lulu webhook/status responses from your account confirm that Lulu emits it. Do not silently discard an unknown status.

Lulu’s documented status endpoint is:

```http
GET https://api.lulu.com/print-jobs/{id}/status/
```

The documented webhook topic is:

```text
PRINT_JOB_STATUS_CHANGED
```

Lulu says this webhook is sent whenever an owned print-job status is updated. The webhook payload contains `topic` and `data`, where `data` has the print-job detail shape. Lulu signs the raw payload with `Lulu-HMAC-SHA256`, retries failed submissions five times, and deactivates a webhook after five consecutive failed submissions.

## Important distinction: Lulu statuses vs application-local labels

Some names shown in the repository README are local labels, not Lulu API status values:

- `ORDER_RECEIVED` is local.
- `SENT_TO_PRINT` is local.
- `QUALITY_CHECK` is local/documented in the README but is not in the official Lulu status list or the current `statusService.js` `LULU_STATUSES` array.
- `CANCELLED` is the application’s spelling; Lulu’s API value is `CANCELED`.

The current GHL trigger payload uses the Lulu-style value `SHIPPED`, not the local display label `Shipped` and not a local lifecycle value such as `ORDER_RECEIVED`.

## If the desired behavior is all status changes

There are two sound designs.

### Recommended: add a separate generic status trigger

Keep the existing trigger unchanged:

```text
Lulu Print Job Shipped
key: lulu_print_job_shipped
status: SHIPPED
```

Add a separate Marketplace trigger:

```text
Lulu Print Job Status Changed
key: lulu_print_job_status_changed
```

Its sample payload should use a representative actual value, for example:

```json
{
  "event": "LULU_PRINT_JOB_STATUS_CHANGED",
  "triggerKey": "lulu_print_job_status_changed",
  "status": "IN_PRODUCTION",
  "statusChangedAt": "2026-08-21T12:34:56.000Z",
  "locationId": "ghl_location_id",
  "contactId": "ghl_contact_id",
  "luluPrintJobId": "42776",
  "internalPrintJobId": "local-print-job-uuid",
  "bookTitle": "Example Book"
}
```

Configure its `Status` filter as a **Select** or **Multi-Select** with these constants:

```text
CREATED
UNPAID
PAYMENT_IN_PROGRESS
PRODUCTION_DELAYED
PRODUCTION_READY
IN_PRODUCTION
SHIPPED
DELIVERED
REJECTED
ERROR
CANCELED
```

Required backend changes:

1. Add a generic trigger key and event name.
2. Allow that key in `server/routes/workflowTrigger.js`; the current route rejects keys other than `lulu_print_job_shipped`.
3. Change the generic payload builder to use the actual transition status rather than hardcoding `SHIPPED`.
4. Schedule generic trigger delivery after every newly persisted transition, not only after `luluStatus === 'SHIPPED'`.
5. Keep the existing shipped emitter for backward compatibility.
6. Add a separate definition, setup, and smoke-test path for the generic trigger.
7. Publish the new trigger version and recreate/update workflows after HighLevel approval.

### Alternative: repurpose the existing trigger

You could rename/redefine the current trigger as a generic status trigger, but this is not recommended because:

- its immutable key is already `lulu_print_job_shipped`;
- existing workflows expect the event to mean shipment;
- the existing backend hardcodes the event name and status;
- changing its meaning would silently alter existing automation.

Create a new trigger key instead.

## Recommended current configuration

For the existing shipped notification workflow, use:

- **Trigger name:** `Lulu Print Job Shipped`
- **Trigger key:** `lulu_print_job_shipped`
- **Status filter:** Select → Constants → `Shipped` / `SHIPPED`
- **Book Title filter:** Remove for now
- **Variables:** Keep the current variables; optionally add the tracking arrays and shipping fields
- **Workflow contact handling:** Use `Find Contact` with `contactId` if native Email/SMS actions do not resolve the contact automatically

Then verify the runtime database row created by HighLevel:

```sql
select location_id, workflow_id, trigger_key, active, filters, target_url
from ghl_trigger_subscriptions
where trigger_key = 'lulu_print_job_shipped';
```

For a real shipped event, verify the delivery ledger:

```sql
select subscription_id, event_key, status, attempt_count,
       response_status, last_error, delivered_at
from ghl_trigger_deliveries
order by created_at desc;
```

A successful delivery should have `status = 'delivered'` and a 2xx `response_status`.

## Sources

- [Lulu Print API Documentation](https://api.lulu.com/docs/)
- [HighLevel Creating a Marketplace Workflow Trigger](https://marketplace.gohighlevel.com/docs/marketplace-modules/CustomTriggers/)
- Repository file: `server/services/statusService.js`
- Repository file: `server/services/ghlTriggerService.js`
- Repository file: `server/routes/workflowTrigger.js`
- Repository file: `GHL_PRINT_TRIGGER_DEFINITION.json`
