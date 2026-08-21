# Integration research findings

## Lulu Print API

Source: https://api.lulu.com/docs/

- Lulu uses OAuth 2.0 client credentials via the OpenID Connect token endpoint. Access tokens are sent as Bearer tokens.
- Print jobs are created with `line_items`, `shipping_address`, `contact_email`, and `shipping_level`; `external_id` is available for linking a Lulu job to an internal order.
- Lulu documents the lifecycle statuses `CREATED`, `UNPAID`, `PAYMENT_IN_PROGRESS`, `PRODUCTION_DELAYED`, `PRODUCTION_READY`, `IN_PRODUCTION`, `SHIPPED`, `DELIVERED`, plus failure/cancellation statuses.
- On shipment, Lulu exposes `line_item_statuses[].messages.tracking_id`, `tracking_urls`, and `carrier_name`; the status response also contains `print_job_id`.
- Lulu supports a webhook topic named `PRINT_JOB_STATUS_CHANGED`. A webhook subscription is configured with a URL and topic, and the payload contains `topic` and `data`; the `data` is the print-job object described by the print-job details endpoint.
- Lulu signs webhook requests with the `Lulu-HMAC-SHA256` header. The HMAC is SHA-256 over the raw request body using the API secret as the key. Lulu retries failed submissions five times and can deactivate a subscription after five consecutive failures. Webhook submissions from the last 30 days can be retrieved.
- The documentation notes a POD package identifier migration to the dotted format beginning March 31, 2026, with legacy non-dotted support ending February 1, 2027; existing code should not rewrite stored package IDs blindly.

## GoHighLevel Marketplace Workflow Trigger

Sources:
- https://marketplace.gohighlevel.com/docs/marketplace-modules/CustomTriggers/
- https://help.gohighlevel.com/support/solutions/articles/155000001024-marketplace-workflow-triggers
- https://marketplace.gohighlevel.com/docs/marketplace-modules/WorkflowActionsAndTriggers/

- A Marketplace Workflow Trigger pushes data from an application/API into a workflow.
- The Developer Portal trigger has an immutable key, sample JSON used to define filters/custom variables, optional filters, custom variables bound to payload keys, and a Subscription URL.
- The Subscription URL receives POST notifications when a trigger is created, updated, or deleted in a workflow. The payload contains `triggerData` (including `id`, `key`, `filters`, `eventType`, and `targetUrl`), `meta`, and `extras` containing `locationId`, `workflowId`, and `companyId`.
- `targetUrl` is the HighLevel execution URL for that configured workflow trigger instance. The app should persist it per location/workflow/trigger instance and POST the business-event payload to it when the event occurs.
- HighLevel documents that Marketplace Workflow Triggers can execute without a contact, but this integration needs a contact for native email/SMS actions. The payload should therefore include `contactId` and contact identity fields, and the workflow should be configured in a contact context or use a Find/Create Contact action if required by the account’s workflow behavior.
- Marketplace triggers/actions require the sub-account to have the app installed and LC Premium Triggers & Actions enabled; executions are chargeable per execution according to the official overview/support material.

## Repository observations relevant to the change

- Lulu status ingestion already exists at `POST /webhooks/lulu` and is HMAC-verified per location using the stored Lulu client secret.
- All status changes are persisted through `statusService.recordTransition`; webhook, manual sync, and reconcile paths all use the status service.
- The repository has a native GHL custom action (`Create Lulu Print Job`) but no Marketplace custom trigger, no trigger subscription table, and no outbound trigger delivery service.
- The safest trigger hook is after a transition is accepted as new (`result.changed === true`) and after tracking is extracted. A separate idempotent delivery ledger is still recommended because a trigger delivery may succeed in HighLevel while the local process fails before recording success.
