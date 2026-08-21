# LiteraryApp SHIPPED Trigger Implementation Report

**Repository:** `https://github.com/moawiz-2706/literaryapp.git`  
**Implemented event:** Lulu `SHIPPED`  
**Marketplace trigger key:** `lulu_print_job_shipped`  
**Status:** Implemented locally; no production deployment or GHL Marketplace submission was performed.

## What was implemented

LiteraryApp now has an additive GoHighLevel Marketplace Workflow Trigger integration for Lulu shipments. The existing `Create Lulu Print Job` custom action remains in place and continues to create orders through the canonical idempotent order service. The existing Lulu HMAC webhook remains the event source. When a new `SHIPPED` transition is recorded, the application asynchronously sends a structured payload to each active GHL workflow subscription for that location.

The trigger payload includes the contact ID and name, first name, last name, tracking ID, tracking URL, carrier, Lulu print-job ID, internal print-job ID, book title, quantity, shipping level, status, and transition timestamp. Native GHL Email and SMS actions can use those variables through the workflow variable picker.

## Files added

| File | Purpose |
| --- | --- |
| `server/routes/workflowTrigger.js` | Receives GHL Marketplace trigger `CREATED`, `UPDATED`, and `DELETED` subscription callbacks. |
| `server/db/triggerDb.js` | Persists trigger subscriptions and the idempotent delivery ledger in Supabase. |
| `server/services/ghlTriggerService.js` | Builds SHIPPED payloads, applies filters, delivers to GHL target URLs, and retries transient failures. |
| `server/trigger_smoketest.js` | Deterministic tests for Lulu tracking normalization and GHL payload/filter behavior. |
| `GHL_PRINT_TRIGGER_SETUP_GUIDE.md` | Complete GHL Marketplace setup and workflow guide. |
| `GHL_PRINT_TRIGGER_DEFINITION.json` | Copyable machine-readable trigger definition, sample data, filters, and variables. |

## Files modified

| File | Change |
| --- | --- |
| `server/index.js` | Mounted `/workflow-trigger` outside the normal installed-location middleware. |
| `server/services/luluService.js` | Added support for Lulu’s `status.line_item_statuses[].messages` tracking shape and filtered null URLs. |
| `server/services/statusService.js` | Emits the SHIPPED trigger only after a new transition is persisted; supports full tracking objects during sync. |
| `server/routes/webhooks.js` | Passes the complete Lulu webhook data object into the tracking parser. |
| `server/routes/printJobs.js` | Preserves tracking IDs through manual sync, detail polling, bulk sync, and reconciliation. |
| `server/db/statusDb.js` | Corrected status-history upsert behavior so duplicate transitions are ignored instead of returned as new rows. |
| `server/db/production_schema.sql` | Added `ghl_trigger_subscriptions` and `ghl_trigger_deliveries` with unique idempotency indexes. |
| `server/routes/workflowAction.js` | Corrected the existing non-critical `totalCost` variable-scope defect in the contact-field update. |
| `server/package.json` | Added `npm run test:trigger`. |
| `server/smoketest.js` | Added a route-registration and malformed-payload test for the new subscription endpoint. |
| `render.yaml` | Added `GHL_TRIGGER_SUBSCRIPTION_SECRET`. |
| `README.md` | Documented the new scope, endpoint, environment variable, and setup guide. |

## Runtime flow

```text
Lulu PRINT_JOB_STATUS_CHANGED
        |
        v
POST /webhooks/lulu?locationId=...
        |
        +--> verify Lulu-HMAC-SHA256
        +--> acknowledge Lulu with HTTP 200
        |
        v
statusService.recordTransition()
        |
        +--> existing CRM sync continues independently
        +--> if new status is SHIPPED:
                 find active GHL subscriptions
                 build contact/tracking payload
                 create delivery ledger row
                 POST to each GHL targetUrl
                 retry up to three times on failure
```

Lulu documents `PRINT_JOB_STATUS_CHANGED` as the webhook topic and exposes tracking IDs, tracking URLs, and carrier information on shipped status data. [1] HighLevel’s Marketplace trigger model provides a Subscription URL for workflow-instance lifecycle events and a workflow-specific `targetUrl` for trigger execution. [2] [3]

## Database migration

Run the complete `server/db/production_schema.sql` in Supabase. The new tables are:

| Table | Role |
| --- | --- |
| `ghl_trigger_subscriptions` | Stores each active/inactive GHL workflow trigger instance and its `target_url`. |
| `ghl_trigger_deliveries` | Stores one delivery row per subscription and business-event key, preventing duplicate workflow executions. |

The new delivery uniqueness key is `(subscription_id, event_key)`. The event key is based on the local job ID, `SHIPPED`, and Lulu’s status-change timestamp. Duplicate Lulu webhook delivery and reconciliation runs therefore do not create duplicate GHL workflow executions.

## Environment configuration

Add the following Render variable before using the trigger in production:

```text
GHL_TRIGGER_SUBSCRIPTION_SECRET=<long-random-secret>
```

In GHL, configure the Subscription URL header as:

```text
X-LiteraryApp-Trigger-Secret: <same-long-random-secret>
```

The GHL app also needs the `workflows.readonly` scope, and the target sub-account must have LiteraryApp installed with LC Premium Triggers & Actions enabled. [3] [4]

## Validation completed

The following checks passed after implementation:

| Check | Result |
| --- | --- |
| JavaScript syntax check across all server files | Passed |
| Lulu tracking normalization smoke test | Passed |
| SHIPPED payload construction and filter matching | Passed |
| Existing server smoke test | **10/10 passed** |
| Client production build | Passed |

The implementation was not connected to a live GHL account, did not submit a production Lulu job, and did not deploy to Render. Those steps require the user’s actual credentials, Marketplace app access, Supabase database, and environment configuration.

## Important operational note

Sample print jobs are excluded from customer notifications because the existing sample-order route uses the literal contact ID `sample`. Customer orders with a real contact ID can emit the trigger. The trigger fires on `SHIPPED`, which is the correct state for a tracking-ID notification; production states such as `IN_PRODUCTION` generally do not contain shipment tracking data.

## References

[1]: https://api.lulu.com/docs/ "LULU Print API Documentation"
[2]: https://marketplace.gohighlevel.com/docs/marketplace-modules/CustomTriggers/ "Creating a Marketplace Workflow Trigger | HighLevel API"
[3]: https://help.gohighlevel.com/support/solutions/articles/155000001024-marketplace-workflow-triggers "Marketplace Workflow Triggers | HighLevel Support Portal"
[4]: https://marketplace.gohighlevel.com/docs/marketplace-modules/WorkflowActionsAndTriggers/ "HighLevel Marketplace Workflow Triggers & Actions | HighLevel API"
