# LiteraryApp Repository Audit and GHL Print-Completion Trigger Proposal

**Repository:** `https://github.com/moawiz-2706/literaryapp.git`  
**Audited revision:** `bcf651c` (`error calculator 3`)  
**Author:** **Manus AI**  
**Scope:** Repository functionality review, Lulu API verification, and a no-code-change design for a GoHighLevel Marketplace Workflow Trigger that sends contact and tracking data into native GHL email/SMS actions.

## Executive conclusion

The requested integration is feasible and can be added without replacing the existing Lulu webhook, order-creation custom action, CRM synchronization, or reconciliation functionality. The safest design is a **new GoHighLevel Marketplace Workflow Trigger** named, for example, **Lulu Print Job Shipped**. Lulu’s `PRINT_JOB_STATUS_CHANGED` webhook remains the event source. When a local order makes a new transition to `SHIPPED`, LiteraryApp extracts the tracking identifier, contact identity, and job metadata, then posts that payload to the `targetUrl` that GoHighLevel provided when the workflow trigger was configured. The workflow can then continue with native GHL Email and SMS actions.

The key semantic point is that Lulu documents tracking information on the shipped response. Therefore, the trigger should normally fire at **`SHIPPED`**, not `IN_PRODUCTION`. `DELIVERED` can be supported as a separate optional trigger or as a filter if a second customer notification is desired. [1]

The repository already has most of the necessary infrastructure: per-location Lulu credentials, HMAC-verified Lulu webhooks, status-history persistence, idempotent order creation, CRM stage synchronization, and reconciliation paths. It does **not** yet have GHL trigger subscription storage or an outbound trigger delivery service. There is also a tracking-shape gap in the current Lulu parser that should be corrected before relying on the trigger.

## Repository functionality audit

The application is a React/Vite frontend plus a Node.js/Express backend. The backend uses Supabase for token, book, print-job, status-history, and webhook persistence, while Lulu is used for validation, pricing, print-job creation, status, shipping, and tracking. GHL is used for OAuth, products, contacts, opportunities, custom fields, tags, menu links, and the existing custom workflow action.

| Area | Current behavior | Assessment for the requested trigger |
| --- | --- | --- |
| GHL OAuth/install | Stores location-scoped tokens, injects menu links, best-effort registers the existing custom action, and registers the Lulu webhook when credentials are available. | Reusable. The trigger itself should be defined at the Marketplace app level; subscription instances must be stored when GHL calls the new Subscription URL. |
| Book setup | Uploads book PDFs to Supabase Storage, validates/normalizes files through Lulu, calculates cover dimensions, and stores book/product metadata. | Unchanged. |
| Quote calculator | Uses real destination data and Lulu cost-calculation APIs. | Unchanged. |
| Existing GHL custom action | `POST /workflow-action/create-print-job` accepts product, quantity, shipping, and mapped contact/address data; it calls the canonical idempotent `placeOrder` service and returns job/cost variables. | Must remain unchanged. The new trigger is a separate Marketplace module, not a modification of this action. |
| Order creation | `orderService.placeOrder()` validates, calculates costs, persists the order, submits to Lulu, stores the Lulu ID, and records the initial `CREATED` transition. | Reusable as-is. The completion trigger must not be placed in this creation path. |
| Lulu status webhook | `POST /webhooks/lulu` verifies `Lulu-HMAC-SHA256` with the location’s Lulu client secret, acknowledges quickly, and processes the event asynchronously. | Primary event source. The new trigger should be emitted only after a new status transition is accepted. |
| Status history | `statusService.recordTransition()` is the central status writer and deduplicates transitions using job, Lulu status, changed time, and source. | Best lifecycle hook. It is reached by webhook, manual sync, and reconciliation paths. |
| CRM sync | Moves the opportunity through the configured per-location pipeline and writes fulfillment fields/tags after status changes. | Preserve as a separate side effect. Trigger delivery must not prevent CRM sync. |
| Reconciliation | Refetches Lulu jobs and calls `statusService.syncJobStatus()`, allowing missed webhooks to be recovered. | Important. Trigger emission must also work when reconciliation discovers `SHIPPED`. |
| Samples | Uses the same canonical order service but identifies sample orders with `contactId: 'sample'`. | Exclude sample jobs from the customer notification trigger. |
| Frontend | Provides pages for book setup, quote calculation, royalty/dashboard views, Lulu integration, orders, analytics, settings, and CRM pipeline mapping. | No frontend change is required for the first trigger version. |

The codebase is syntactically valid across the server JavaScript files. The server smoke test passed 9/9 checks, and the client production build completed successfully. The repository’s `test_install_gate.sh` does not currently start the server and reported HTTP status `000` for all checks while still exiting with code `0`; that is a test-harness weakness rather than evidence that the application routes are broken.

## Important findings before implementation

### Tracking extraction must be hardened first

Lulu documents a shipped status response containing `status.line_item_statuses[].messages.tracking_id`, `tracking_urls`, and `carrier_name`. [1] The current `luluService.extractTracking()` primarily walks `jobDetail.line_items[].status.messages` and does not handle the documented `status.line_item_statuses` shape. The Lulu webhook handler also passes a wrapper object containing `status`, which means the current parser can acknowledge a valid webhook but persist an empty tracking array.

This should be fixed before adding the trigger. The parser should accept both shapes and normalize them to one internal form:

```json
[
  {
    "id": "3d4a53da-cc42-44c2-b47b-c3da8fa37491_1",
    "url": "https://api.lulu.com/...",
    "carrier": "Carrier",
    "lineItemId": 57999
  }
]
```

The change is backward-compatible because existing callers already expect tracking objects or tracking URLs. It improves the current Orders page, CSV export, status history, CRM data, and the new trigger simultaneously.

### Existing order custom-field write has a contained defect

In `server/routes/workflowAction.js`, the order-creation action attempts to write `orderTotalCost: totalCost.toFixed(2)`, but `totalCost` is not declared in that scope. The reference is inside a `try/catch`, so it does not stop the Lulu order from being created; it only causes that custom-field write to be skipped and logged as non-critical. This should be corrected separately to use the already available `costBreakdown.totalCost`, but it is not necessary to redesign the order-creation action for the new trigger.

### No trigger subscription or delivery persistence exists yet

The current database has `ghl_tokens`, `print_jobs`, `print_job_status_history`, `lulu_webhooks`, and pipeline-stage tables. It has no table for GHL trigger instances, their `targetUrl` values, filters, or delivery attempts. The new feature should add dedicated tables rather than overloading `lulu_webhooks` or `print_job_status_history`.

## Verified Lulu API behavior

Lulu’s API uses OAuth client credentials and supports print-job creation, status lookup, and webhook subscriptions. The documented webhook topic is `PRINT_JOB_STATUS_CHANGED`. Lulu sends a payload containing `topic` and `data`, and the data is the print-job data returned by the print-job details endpoint. Lulu signs the raw request body with `Lulu-HMAC-SHA256`; the application already follows this model using each location’s stored client secret. [1]

Lulu retries failed webhook submissions five times and can deactivate a webhook after five consecutive failed submissions. The current application already stores webhook health information and includes reactivation tooling. The new trigger must therefore acknowledge Lulu quickly and perform GHL delivery asynchronously or through a durable outbox/retry mechanism. [1]

## Verified GoHighLevel trigger behavior

HighLevel Marketplace Workflow Triggers are designed to push data from an application/API into a workflow. The Developer Portal trigger definition includes an immutable key, sample JSON, filters, custom variables, and a Subscription URL. [2]

When a workflow user creates, updates, or deletes a trigger instance, HighLevel POSTs configuration data to the Subscription URL. The payload includes `triggerData.id`, `triggerData.key`, `triggerData.filters`, `triggerData.eventType`, and `triggerData.targetUrl`, plus `extras.locationId`, `extras.workflowId`, and `extras.companyId`. The application must persist these values, especially `targetUrl`, because that is the per-workflow execution endpoint to call later. [2] [3]

HighLevel states that Marketplace triggers can run without a contact, but the requested native email/SMS actions need contact context. The event payload should therefore include `contactId`, `contactName`, `firstName`, and `lastName`. If a particular workflow does not automatically attach the contact from the trigger payload, the workflow can use the contact ID with a Find Contact action before the native email/SMS step. [2]

The official HighLevel overview also says that Marketplace workflow triggers/actions require the app to be installed in the sub-account and that LC Premium Triggers & Actions must be enabled; executions are chargeable per execution. The existing app’s GHL scope list should be reviewed to include the documented `workflows.readonly` scope before publishing the trigger. [4]

## Recommended architecture

The recommended event flow is:

```text
Lulu PRINT_JOB_STATUS_CHANGED
        |
        v
POST /webhooks/lulu?locationId=...
        |
        +--> HMAC verification and fast 200 response
        |
        v
statusService.recordTransition()
        |
        +--> existing CRM stage/custom-field/tag synchronization
        |
        +--> if new transition is SHIPPED and job is a customer order:
                 create idempotent GHL trigger delivery
                         |
                         v
                 POST payload to each subscribed targetUrl
                         |
                         v
                 GHL workflow
                   -> native Email action
                   -> native SMS action
```

The transition hook should be centralized so it covers the Lulu webhook path, manual sync, detail polling, and reconciliation. The trigger must fire only when `recordTransition()` returns `changed: true`; otherwise duplicate Lulu deliveries and repeated reconciliation runs will not send duplicate customer notifications.

### Marketplace trigger definition

| Portal field | Proposed value |
| --- | --- |
| Name | `Lulu Print Job Shipped` |
| Key | `lulu_print_job_shipped` |
| Description | Fires when a customer’s Lulu print job reaches `SHIPPED` and tracking data is available. |
| Sample trigger status | `SHIPPED` |
| Subscription URL | `https://<backend>/workflow-trigger/subscription` |
| Filters | Optional status, book, carrier, or shipping-level filters. The first version can expose `status` with constant value `SHIPPED`. |
| Custom variables | `contactId`, `contactName`, `firstName`, `lastName`, `trackingId`, `trackingUrl`, `carrierName`, `luluPrintJobId`, `internalPrintJobId`, `bookTitle`, `status`, `statusChangedAt`, and `locationId`. |

A separate `Lulu Print Job Delivered` trigger can be added later if a delivery-confirmation message is needed. Combining both into one trigger is possible, but a separate trigger is clearer and avoids sending a shipped message when the workflow is intended to communicate delivery.

### Subscription endpoint and storage

Add a new route that is not protected by the existing `requireInstalled` middleware because HighLevel must be able to create, update, or delete a workflow trigger configuration using the location and workflow metadata in the request body. The endpoint should authenticate the request with a secret header configured in the Developer Portal, validate the presence of `locationId`, `workflowId`, trigger instance ID, event type, and `targetUrl`, then return a fast 2xx response.

Add a dedicated `ghl_trigger_subscriptions` table with fields equivalent to:

| Field | Purpose |
| --- | --- |
| `id` | Internal UUID. |
| `location_id` | GHL sub-account. |
| `company_id` | Optional agency/company identifier. |
| `workflow_id` | Workflow containing the trigger. |
| `trigger_instance_id` | HighLevel `triggerData.id`; unique within the location. |
| `trigger_key` | Immutable Marketplace trigger key. |
| `target_url` | HighLevel execution URL. |
| `filters` | JSONB copy of configured filters. |
| `active` | False after a DELETE event. |
| `created_at`, `updated_at` | Audit timestamps. |

On `CREATED`, insert or upsert the subscription. On `UPDATED`, replace the target URL and filters. On `DELETED`, mark the row inactive rather than immediately deleting it, preserving an audit trail and preventing accidental delivery to an old workflow URL.

### Delivery and idempotency

Add a `ghl_trigger_deliveries` outbox/ledger table. Its uniqueness key should represent the business event, for example `(subscription_id, job_id, lulu_status, changed_at)`. Store the payload, attempt count, response status, last error, and delivered timestamp. This protects against all of the following: Lulu retrying a webhook, reconciliation finding the same status repeatedly, the GHL endpoint timing out after accepting the request, or the backend restarting between delivery and acknowledgement.

The delivery worker should POST JSON to each active subscription’s `target_url` with a short timeout. Successful 2xx responses are marked delivered. Non-2xx responses and network timeouts remain pending for exponential retry. The Lulu webhook request should never wait for GHL delivery, because Lulu can retry or deactivate the subscription when the endpoint is slow or fails. [1]

### Event payload

The trigger should send a stable, explicit payload rather than the raw Lulu object alone:

```json
{
  "event": "LULU_PRINT_JOB_SHIPPED",
  "status": "SHIPPED",
  "locationId": "ghl_location_id",
  "contactId": "ghl_contact_id",
  "contactName": "Jane Doe",
  "firstName": "Jane",
  "lastName": "Doe",
  "trackingId": "3d4a53da-cc42-44c2-b47b-c3da8fa37491_1",
  "trackingUrl": "https://api.lulu.com/tracking/...",
  "carrierName": "USPS",
  "luluPrintJobId": "42776",
  "internalPrintJobId": "local-print-job-uuid",
  "bookTitle": "Example Book",
  "statusChangedAt": "2026-08-21T12:34:56.000Z"
}
```

The native GHL workflow should use the trigger variables through the workflow builder’s variable picker. The recommended action sequence is to use the trigger’s contact context directly, or use `contactId` in a Find Contact action if the account does not automatically bind the contact. The email/SMS body can then include the contact name and tracking ID supplied by the trigger.

## What must not change

The implementation should be additive. It should not replace the existing `/workflow-action/create-print-job` action, change `placeOrder()`, remove or repurpose `/webhooks/lulu`, alter per-location Lulu credentials, bypass HMAC verification, or make CRM synchronization depend on successful GHL trigger delivery. Trigger delivery failures should be recorded and retried independently while the existing status, CRM, Orders page, and reconciliation behavior continues.

Sample jobs should be excluded by an explicit rule, at minimum `contact_id !== 'sample'`, because the sample route currently calls the canonical order service with the literal contact ID `sample`. If the product later needs a more formal distinction, add an `order_source` column and persist `workflow`, `api`, `sample`, or `reorder`; do not infer the source from arbitrary contact values indefinitely.

## Implementation options

| Approach | Tradeoffs | Cost | Setup complexity |
| --- | --- | --- | --- |
| **Native Marketplace Workflow Trigger with Lulu webhook and durable delivery ledger** | Best user experience. The trigger appears in the GHL workflow builder, exposes custom variables, and lets users use native Email/SMS actions. Requires Developer Portal review, a subscription endpoint, database migration, delivery retries, and careful testing. | Lulu webhook/API costs depend on the Lulu account; HighLevel Marketplace trigger executions are subject to HighLevel’s LC Premium Triggers & Actions pricing. [4] | Medium to high. |
| **Lighter-weight GHL inbound webhook workflow** | Faster to launch: create a normal GHL workflow with an inbound webhook URL and have LiteraryApp POST the same payload. Avoids Marketplace trigger publication and subscription lifecycle storage, but it is less native, harder to distribute across sub-accounts, and may require separate contact lookup/configuration. | No custom Marketplace trigger publication; normal GHL workflow/account plan limits still apply. | Low to medium. |

The native trigger is the appropriate long-term implementation for a Marketplace application. The inbound webhook is a sensible proof-of-concept if you want to validate the Lulu-to-GHL payload and notification copy before going through Marketplace trigger review.

## Recommended implementation phases

1. **Correct and test tracking normalization.** Extend the Lulu parser for both documented tracking response shapes and add tests for shipped webhook payloads, print-job detail payloads, and missing tracking data.
2. **Add the Marketplace trigger definition.** Configure the immutable key, sample data, custom variables, optional filters, subscription URL, secret header, and the required workflow scope in the Developer Portal.
3. **Add subscription persistence.** Implement the `CREATED`, `UPDATED`, and `DELETED` Subscription URL handler and the dedicated subscription table.
4. **Add the delivery ledger and emitter.** Emit only for new `SHIPPED` transitions on customer orders, send to active `targetUrl` subscriptions, and retry failed deliveries.
5. **Preserve and separately fix current issues.** Correct the contained `totalCost` variable defect in the existing action and avoid mixing that fix with the trigger’s lifecycle logic.
6. **Validate end to end.** Test Lulu Sandbox webhook delivery, duplicate webhook delivery, missed-webhook reconciliation, multiple workflows per location, deleted workflows, sample-order exclusion, native GHL email/SMS actions, and the existing order-creation custom action.

## Decision needed before coding

The only product decision that materially changes the trigger contract is the event timing. My recommendation is **trigger on `SHIPPED`**, because that is the Lulu status at which the tracking ID is documented and available. If by “printing is done” you instead mean “the printer has completed production but the package has not shipped,” then the trigger should be based on `PRODUCTION_READY` or `IN_PRODUCTION`, but those statuses generally do not provide a tracking ID. The implementation can support both later, but the first trigger should have one unambiguous meaning.

## References

[1]: https://api.lulu.com/docs/ "LULU Print API Documentation"
[2]: https://marketplace.gohighlevel.com/docs/marketplace-modules/CustomTriggers/ "Creating a Marketplace Workflow Trigger | HighLevel API"
[3]: https://help.gohighlevel.com/support/solutions/articles/155000001024-marketplace-workflow-triggers "Marketplace Workflow Triggers | HighLevel Support Portal"
[4]: https://marketplace.gohighlevel.com/docs/marketplace-modules/WorkflowActionsAndTriggers/ "HighLevel Marketplace Workflow Triggers & Actions | HighLevel API"
