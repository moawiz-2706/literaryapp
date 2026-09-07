# LiteraryApp Order-Shipped Trigger Audit

**Repository:** [moawiz-2706/literaryapp](https://github.com/moawiz-2706/literaryapp)  
**Inspected commit:** `19d9635be1b7fb750a5c9e65f5f41379f97661b8` (`workflow trigger`)  
**Scope:** Lulu.com print-job status detection, `SHIPPED` transition handling, GoHighLevel Marketplace custom-trigger delivery, persistence, and sub-account routing.

## Executive conclusion

The repository **does contain an implementation for an “Order Status Changed to Shipped” GoHighLevel Marketplace trigger**. The runtime trigger key is `lulu_print_job_shipped`, and the event is emitted when Lulu reports a print-job status transition whose status name is exactly `SHIPPED`.

However, the repository does **not prove that the trigger is currently configured, published, approved, or active in the GoHighLevel Developer Portal**. The file `GHL_PRINT_TRIGGER_DEFINITION.json` is a copyable definition, not an API call that creates or publishes the Marketplace trigger. The repository’s own implementation report explicitly states that the feature was implemented locally and that no live GHL Marketplace submission or production deployment was performed. The setup guide also instructs an operator to create the trigger manually, submit it for review, and publish it.

Therefore, the most likely explanation for a trigger that is “not working” is **configuration and operational incompleteness**, not absence of the core status-to-trigger code. A second reliability issue is that the delivery is launched with `setImmediate()` after acknowledging Lulu, and there is no persistent worker that re-attempts an event after a process crash or after the three in-process delivery attempts fail.

## Direct answers to the requested questions

| Question | Finding |
| --- | --- |
| Is a custom trigger implemented in the repository? | **Yes.** Key: `lulu_print_job_shipped`; event: `LULU_PRINT_JOB_SHIPPED`. |
| Does it specifically detect `SHIPPED`? | **Yes.** `statusService.recordTransition()` calls the emitter only when `luluStatus === 'SHIPPED'`. |
| Does Lulu status monitoring exist? | **Yes, primarily through Lulu webhooks.** The app registers `PRINT_JOB_STATUS_CHANGED` and also exposes manual status synchronization and reconciliation routes. |
| Is automatic polling running? | **No.** Reconciliation is an authenticated HTTP endpoint; no production cron, heartbeat, queue worker, or continuous poller invokes it automatically. |
| Does it route to the original sub-account? | **Yes in the intended path.** `locationId` is carried by the Lulu webhook URL, used in the Lulu credential lookup and local-job lookup, and used to select GHL trigger subscriptions. |
| Is the Marketplace trigger definitely live in GHL? | **No evidence in the repository.** The app-level definition is a JSON/configuration artifact with a placeholder URL, and the docs require manual Developer Portal creation and approval. |
| Is the end-to-end flow live-tested? | **No.** Local syntax and smoke tests pass, but the repository has no live GHL, Lulu, Supabase, or production deployment proof. |

## Relevant implementation map

| Responsibility | File and location | What it does |
| --- | --- | --- |
| Server wiring | `server/index.js:101-114` | Mounts `/webhooks`, `/workflow-trigger`, and `/workflow-action`. |
| Lulu webhook receiver | `server/routes/webhooks.js:40-103` | Accepts `POST /webhooks/lulu?locationId=...`, verifies `Lulu-HMAC-SHA256`, responds with HTTP 200, then processes asynchronously. |
| Lulu webhook processing | `server/routes/webhooks.js:105-195` | Reads `payload.topic`, `payload.data.id`, `payload.data.status.name`, tracking data, and the location-scoped local job. |
| Lulu API client | `server/services/luluService.js:604-655` | Calls `GET /print-jobs/{id}/`, `GET /print-jobs/{id}/status/`, registers `POST /webhooks/`, lists and patches webhook subscriptions, and sends test submissions. |
| Lulu credentials | `server/routes/luluIntegration.js:54-107` | Saves per-location credentials and registers the Lulu webhook after credentials are saved. |
| Installation lifecycle | `server/routes/oauth.js:95-120` and `145-225` | Registers a Lulu webhook on install when the location already has Lulu credentials. |
| Status transition owner | `server/services/statusService.js:102-185` | Persists the transition, updates `print_jobs`, and schedules the shipped-trigger emission. |
| Trigger emitter | `server/services/ghlTriggerService.js:141-195` | Builds the event payload, loads active subscriptions for one location, applies filters, creates the delivery ledger row, posts to each GHL `targetUrl`, and retries up to three times. |
| GHL subscription callback | `server/routes/workflowTrigger.js:38-95` | Receives HighLevel `CREATED`, `UPDATED`, and `DELETED` trigger-instance callbacks and stores the workflow-specific target URL. |
| Trigger persistence | `server/db/triggerDb.js:12-145` | Reads active subscriptions and maintains idempotent delivery records. |
| Local job lookup | `server/db/database.js:270-285` | Looks up a job by both `lulu_print_job_id` and `location_id`. |
| Schema | `server/db/production_schema.sql:245-302`, `624-695` | Defines local jobs, webhook bookkeeping, trigger subscriptions, delivery ledger, and unique indexes. |
| Marketplace definition | `GHL_PRINT_TRIGGER_DEFINITION.json:1-59` | Describes the trigger key, sample payload, filter, custom variables, and subscription URL placeholder. |
| Operator setup | `GHL_PRINT_TRIGGER_SETUP_GUIDE.md:108-132` | Requires manual Developer Portal configuration, subscription secret, review, approval, and workflow creation. |

## Complete runtime flow

### 1. Order creation in the original sub-account

A GHL workflow invokes the custom action at `POST /workflow-action/create-print-job`. The action extracts `locationId`, `contactId`, workflow identifiers, product data, and the shipping address. It delegates order creation to `placeOrder()` in `server/services/orderService.js`.

`placeOrder()` stores a local `print_jobs` row containing at least:

- `location_id`: the GHL sub-account where the order was created;
- `contact_id`: the buyer’s GHL contact;
- `lulu_print_job_id`: populated after Lulu accepts the job;
- `workflow_id` and `execution_id`;
- shipping address, book, quantity, and shipping level.

It submits the print job through `lulu.createPrintJob({ locationId, ... })`. The Lulu client resolves credentials and access tokens by that `locationId`, so the Lulu account used for the order is also location-scoped.

### 2. Lulu webhook registration

When a sub-account saves Lulu credentials, `server/routes/luluIntegration.js` constructs:

```text
{APP_BASE_URL}/webhooks/lulu?locationId={locationId}
```

It registers that URL with Lulu using:

```http
POST https://api.lulu.com/webhooks/
Content-Type: application/json
Authorization: Bearer <location-scoped Lulu token>

{
  "url": "https://<app>/webhooks/lulu?locationId=<locationId>",
  "topics": ["PRINT_JOB_STATUS_CHANGED"]
}
```

The same registration is attempted during GHL install handling when the location already has Lulu credentials. Registration metadata is stored in `lulu_webhooks`.

### 3. Lulu status event

Lulu’s official documentation states that `PRINT_JOB_STATUS_CHANGED` is sent every time an owned print job’s status changes. The webhook payload contains `topic` and `data`, where `data` has the same shape as the print-job details response. For a shipped job, the status object includes:

```json
{
  "name": "SHIPPED",
  "message": "All line-items were shipped",
  "changed": "2024-04-10T09:28:34.870842Z",
  "line_item_statuses": [
    {
      "name": "SHIPPED",
      "messages": {
        "tracking_id": "...",
        "tracking_urls": ["https://..."],
        "carrier_name": "Carrier"
      },
      "line_item_id": 57999
    }
  ],
  "print_job_id": 42776
}
```

The application receives the event at:

```text
POST /webhooks/lulu?locationId=<original GHL location ID>
```

### 4. Webhook verification and local lookup

The route verifies the raw request body with HMAC-SHA256 using the Lulu client secret stored for the query-string `locationId`. Lulu’s documented signature header is `Lulu-HMAC-SHA256`.

The route then resolves the Lulu job ID from `payload.data.id` or the documented status shape’s `payload.data.print_job_id`, and queries the local database using both values:

```text
lulu_print_job_id = <Lulu job ID>
location_id       = <locationId from webhook URL>
```

This is the main sub-account isolation boundary. A job from another location is not accepted by the lookup, and a found job is checked again against `job.location_id`.

### 5. Status transition persistence

The route calls `statusService.recordTransition()` with:

- local job ID;
- location ID;
- Lulu status name;
- Lulu message and authoritative `changed` timestamp;
- normalized tracking objects;
- raw webhook payload;
- source `webhook`.

`statusDb.recordStatusTransition()` writes `print_job_status_history` and deduplicates on:

```text
(job_id, lulu_status, changed_at, source)
```

The denormalized `print_jobs.status`, `print_jobs.lulu_status`, and tracking fields are then updated.

### 6. Shipped detection

After the transition is accepted, `statusService.recordTransition()` checks:

```javascript
if (luluStatus === 'SHIPPED') {
  scheduleShippedEmission({ jobId, locationId, tracking, changedAt });
}
```

The same scheduling occurs for a repeated `SHIPPED` observation. That is intended to let a later reconciliation retry delivery if the workflow subscription was created after the original status transition.

### 7. GHL Marketplace trigger delivery

`ghlTriggerService.emitPrintJobShipped()`:

1. Loads the local job.
2. Excludes sample jobs whose contact ID is `sample` or empty.
3. Uses the passed location ID, falling back to the job’s stored location ID.
4. Queries `ghl_trigger_subscriptions` by `location_id`, `trigger_key = lulu_print_job_shipped`, and `active = true`.
5. Applies the workflow instance’s saved filters to a payload whose status is `SHIPPED`.
6. Creates or reuses a delivery ledger row keyed by subscription and event key.
7. Sends the payload by HTTP POST to the exact `target_url` HighLevel supplied for that workflow instance.
8. Retries the post up to three times with short exponential backoff.

The event payload includes `locationId`, `contactId`, contact name fields, `status`, `statusChangedAt`, Lulu print-job ID, internal job ID, book title, quantity, carrier, and tracking identifiers/URLs.

### 8. Execution in the correct sub-account

HighLevel’s Subscription URL contract supplies a workflow-specific `targetUrl` together with `extras.locationId` and `extras.workflowId`. The repository stores all of these values in `ghl_trigger_subscriptions`.

When an event is emitted, the query is explicitly scoped to the original order’s `locationId`. Consequently, the implementation does not broadcast a shipped event across all GHL locations. It sends only to subscriptions stored for the originating sub-account.

The workflow itself is then executed by HighLevel at the stored workflow-specific target URL. The repository does not call a generic agency-wide trigger endpoint.

## What is implemented versus what is externally configured

### Implemented in code

The following pieces are present:

- Lulu per-location credential and token resolution.
- Lulu `PRINT_JOB_STATUS_CHANGED` webhook registration.
- Raw-body HMAC verification.
- `SHIPPED` status mapping and tracking extraction.
- Local status-history persistence and deduplication.
- GHL Marketplace trigger subscription lifecycle endpoint.
- Per-location subscription storage.
- Per-subscription delivery ledger and duplicate suppression.
- GHL target-URL delivery with retries.
- Sample-order exclusion.
- Manual status synchronization and reconciliation endpoints.

### Not proven or not completed by this repository

The repository cannot establish that the following have happened in the actual GHL account:

- The trigger was created in the Developer Portal.
- The immutable key `lulu_print_job_shipped` was entered correctly.
- The subscription URL was changed from `YOUR_BACKEND_DOMAIN` to the live Render URL.
- The subscription header matches `GHL_TRIGGER_SUBSCRIPTION_SECRET`.
- The trigger was submitted for review and approved.
- The app is installed in the target sub-account.
- The sub-account has the required workflow-trigger feature access.
- A workflow instance was created and generated a row in `ghl_trigger_subscriptions`.
- The Supabase production schema was executed.
- The live Lulu webhook is active for each location.
- A live sandbox or production event reached the app and delivered to HighLevel.

The repository’s own `IMPLEMENTATION_REPORT.md` states: “Implemented locally; no production deployment or GHL Marketplace submission was performed.” That is the clearest evidence that the trigger is not confirmed as live merely because its code exists.

## Root cause assessment

### Primary root cause: Marketplace trigger registration is manual and may not have been completed

`GHL_PRINT_TRIGGER_DEFINITION.json` is not consumed by application code. It contains a placeholder subscription URL:

```text
https://YOUR_BACKEND_DOMAIN/workflow-trigger/subscription
```

A repository search finds no code that creates, publishes, submits, or approves a Marketplace custom trigger. The custom-action code contains a programmatic `/workflows/actions` registration attempt, but there is no equivalent trigger-registration call. The trigger must be configured in the GHL Developer Portal, submitted for review, and approved before it is available to sub-accounts.

If that portal step was skipped, the trigger will not appear in workflows and no `CREATED` subscription callback will populate `ghl_trigger_subscriptions`. The emitter will log `no_active_subscriptions` and stop without a GHL workflow execution.

### Secondary root cause: No durable post-acknowledgment delivery worker

The Lulu route returns HTTP 200 before processing:

```javascript
res.status(200).json({ received: true });
setImmediate(() => processLuluWebhook(payload, locationId));
```

This is appropriate for Lulu’s response-time requirement, but it creates a failure window. If the process restarts after the 200 response and before `processLuluWebhook()` or `emitPrintJobShipped()` completes, Lulu is unlikely to retry the event because it already received a success response.

The current delivery ledger is durable only after the emitter creates a delivery row. There is no outbox row created atomically with the accepted `SHIPPED` transition, and no background worker scans for missing or failed shipped deliveries. The three retries occur only within the original in-memory call.

### Secondary root cause: Polling is only a manual fallback

The code contains:

- `GET /print-jobs/:jobId/status` for a request-time status refresh;
- `POST /print-jobs/:jobId/sync` for manual synchronization;
- `GET /print-jobs/reconcile/:locationId?secret=...` for a full location reconciliation;
- `GET /print-jobs/webhook-health/:locationId?secret=...` for local webhook health reporting;
- `listPrintJobsModifiedAfter()` in the Lulu service.

But there is no automatic production invocation of reconciliation. If a Lulu webhook is missed or deactivated, the application will not detect the change until a user or an external scheduler calls the reconcile endpoint.

### Configuration mismatch: documented manual registration endpoint is not present

`README.md` documents a manual endpoint at `POST /webhooks/lulu/register`, but `server/routes/webhooks.js` does not define that route. The actual registration logic exists inside the credential-save and OAuth-install routes. This can cause operators to believe they manually registered a webhook when the documented endpoint returns 404.

### Configuration mismatch: webhook reactivation depends on different environment names

Initial registration uses `APP_BASE_URL`. The restoration helper uses `PUBLIC_API_URL` or `RENDER_EXTERNAL_URL`. `render.yaml` defines neither `PUBLIC_API_URL` nor a dedicated `RENDER_EXTERNAL_URL` variable. Therefore, the reactivation route can fail with “PUBLIC_API_URL is not configured” even though initial webhook registration worked through `APP_BASE_URL`.

### Database prerequisite: trigger tables are manual-migration dependent

The application does not execute SQL migrations at startup. `server/db/production_schema.sql` must be run in Supabase. Without `ghl_trigger_subscriptions` and `ghl_trigger_deliveries`, subscription persistence or delivery will fail. The route’s validation smoke test does not prove that the production schema exists.

## Recommended changes for reliable operation

### Priority 1: Complete and verify the GHL Marketplace configuration

1. Create the Marketplace trigger in the GHL Developer Portal using the definition in `GHL_PRINT_TRIGGER_DEFINITION.json`.
2. Set the immutable key exactly to `lulu_print_job_shipped`.
3. Replace the placeholder subscription URL with the live backend URL:

   ```text
   https://<live-backend-domain>/workflow-trigger/subscription
   ```

4. Configure the exact header:

   ```text
   X-LiteraryApp-Trigger-Secret: <same value as GHL_TRIGGER_SUBSCRIPTION_SECRET>
   ```

5. Confirm the required workflow-trigger scope/feature access.
6. Submit the trigger for review and confirm approval.
7. Install the app in the target sub-account.
8. Create a test workflow using “Lulu Print Job Shipped.”
9. Confirm that HighLevel sends a `CREATED` callback and that a row appears in `ghl_trigger_subscriptions` with the expected `location_id`, `workflow_id`, `trigger_key`, and `target_url`.

### Priority 2: Apply and verify the production schema

Run `server/db/production_schema.sql` in Supabase, then verify:

```sql
select location_id, workflow_id, trigger_key, active, target_url
from ghl_trigger_subscriptions
where trigger_key = 'lulu_print_job_shipped';

select subscription_id, event_key, status, attempt_count, response_status, last_error
from ghl_trigger_deliveries
order by created_at desc;
```

Also verify that `print_jobs` contains the original order’s `location_id`, `contact_id`, and `lulu_print_job_id`.

### Priority 3: Verify or re-register each Lulu webhook

For every location:

1. Confirm the location has a row in `lulu_credentials`.
2. Confirm the Lulu webhook URL is exactly `/webhooks/lulu?locationId=<that location>`, not a shared URL without the location identifier.
3. Use Lulu’s webhook list/test facilities to confirm the remote subscription is active and includes `PRINT_JOB_STATUS_CHANGED`.
4. Confirm the local `lulu_webhooks` row contains the remote webhook ID and active state.
5. Update the restoration helper to use the same canonical base URL as registration, preferably `APP_BASE_URL`, or add an explicit `PUBLIC_API_URL` environment variable and document it.
6. Either implement the documented `/webhooks/lulu/register` route or remove that stale README step.

### Priority 4: Add a durable shipped-event outbox and worker

The reliable architecture should be:

1. Accept and authenticate Lulu’s webhook.
2. Persist the status transition and a pending shipped-event/outbox row in one database transaction, or make the transition record itself sufficient for deterministic outbox reconstruction.
3. Return HTTP 200 to Lulu.
4. Run a persistent worker or scheduled background job that scans for:
   - shipped transitions without a delivery row;
   - pending deliveries;
   - failed deliveries whose retry time has arrived;
   - subscriptions created after a prior shipped transition.
5. Deliver to each location-scoped HighLevel `targetUrl`.
6. Mark successful deliveries as delivered and retain failure diagnostics.

The existing `ghl_trigger_deliveries` table is a good starting point, but the emitter should not be the only component that creates its rows. A worker must be able to recover after process termination.

### Priority 5: Add automatic reconciliation as a fallback

Lulu officially supports webhooks, so webhooks should remain the primary event source. Add a low-frequency background reconciliation job as a safety net. It should use `modified_after` or a list endpoint where possible, rather than fetching every print job sequentially on every run.

A good policy is:

- webhook delivery: near real time;
- reconciliation: every 10–15 minutes per active location, with rate limiting;
- manual sync: retained for support and operator diagnostics;
- webhook health check: alert when a subscription is inactive or has not delivered within an expected interval.

## Implementation options

| Approach | Tradeoffs | Cost | Setup complexity |
| --- | --- | --- | --- |
| **Lulu webhook + durable delivery worker + periodic reconciliation** **(recommended)** | Near-real-time shipment notifications, recovery after missed webhooks or process restarts, and correct per-location routing. Requires a persistent worker and database outbox logic. | Lulu API/webhook usage plus hosting/database resources; no per-check AI execution. | Medium to high. |
| Lulu webhook + current in-process delivery only | Smallest change because the current code already implements it. It remains vulnerable to process crashes after Lulu receives HTTP 200 and does not retry failed deliveries after the original request finishes. | Low incremental cost. | Low. |
| Scheduled polling without Lulu webhooks | Easier to reason about in some environments, but slower, more API-intensive, and unnecessary because Lulu officially supports `PRINT_JOB_STATUS_CHANGED`. It also requires careful rate limiting and status deduplication. | Higher Lulu API traffic and hosting cost. | Medium. |

## Verification checklist for the actual incident

Use the following order of checks because each one isolates a different stage:

| Check | Expected evidence | Failure meaning |
| --- | --- | --- |
| Trigger visible in GHL workflow builder | “Lulu Print Job Shipped” appears | Marketplace trigger was not published/approved, app not installed, or feature access is missing. |
| Subscription callback | HTTP 200 from `/workflow-trigger/subscription` | Secret mismatch, invalid payload, or missing route. |
| Subscription row | Active row for the correct `location_id` and `trigger_key` | Workflow was not created successfully or database migration is missing. |
| Lulu webhook health | Active remote subscription with `PRINT_JOB_STATUS_CHANGED` | Lulu registration failed, was never performed, or was auto-deactivated. |
| Webhook log | `PRINT_JOB_STATUS_CHANGED` record with the expected location | Lulu did not reach the app, URL is wrong, HMAC failed, or location query parameter is wrong. |
| Status history | A `SHIPPED` row for the local job | Job-ID mapping, status parsing, schema, or transition persistence failed. |
| Delivery ledger | `delivered` row with HTTP 2xx | No active subscription, filter mismatch, GHL target failure, or worker loss. |
| GHL workflow execution | Workflow run in the same sub-account | HighLevel target delivery or workflow/contact association failed. |

## Validation performed during this audit

The following local checks passed after installing the repository’s declared server dependencies:

- `node --check` across all backend JavaScript files;
- `npm run test:trigger` — shipped payload, tracking normalization, and filter tests;
- `node smoketest.js` — 10/10 route and validation checks;
- repository working tree remained unchanged;
- external contract review against Lulu’s official API documentation;
- external contract review against HighLevel’s official Marketplace custom-trigger documentation.

These checks do not replace a live end-to-end test because no live credentials, Supabase project, Lulu webhook submission, GHL workflow, or production deployment was available in the repository clone.

## References

[1]: https://api.lulu.com/docs/ "LULU Print API Documentation"

[2]: https://marketplace.gohighlevel.com/docs/marketplace-modules/CustomTriggers/ "Creating a Marketplace Workflow Trigger | HighLevel API"

[3]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/server/routes/webhooks.js "LiteraryApp Lulu webhook route at the inspected commit"

[4]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/server/services/statusService.js "LiteraryApp status transition service at the inspected commit"

[5]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/server/services/ghlTriggerService.js "LiteraryApp GHL shipped-trigger emitter at the inspected commit"

[6]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/server/routes/workflowTrigger.js "LiteraryApp GHL trigger subscription route at the inspected commit"

[7]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/GHL_PRINT_TRIGGER_DEFINITION.json "LiteraryApp Marketplace trigger definition artifact"

[8]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/IMPLEMENTATION_REPORT.md "LiteraryApp shipped-trigger implementation report"

[9]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/GHL_PRINT_TRIGGER_SETUP_GUIDE.md "LiteraryApp shipped-trigger setup guide"

[10]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/server/db/production_schema.sql "LiteraryApp production database schema at the inspected commit"

[11]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/server/routes/printJobs.js "LiteraryApp print-job synchronization and reconciliation routes"

[12]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/server/routes/luluIntegration.js "LiteraryApp per-location Lulu credential and webhook registration route"

[13]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/server/services/luluService.js "LiteraryApp Lulu API client at the inspected commit"

[14]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/README.md "LiteraryApp deployment and architecture documentation"

[15]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/server/db/triggerDb.js "LiteraryApp trigger subscription and delivery persistence"

[16]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/server/db/database.js "LiteraryApp local job and credential persistence"

[17]: https://github.com/moawiz-2706/literaryapp/blob/19d9635be1b7fb750a5c9e65f5f41379f97661b8/render.yaml "LiteraryApp Render deployment configuration"

[18]: https://help.gohighlevel.com/support/solutions/articles/155000001024-marketplace-workflow-triggers "Marketplace Workflow Triggers | HighLevel Support Portal"

*Report prepared by Manus AI.*

