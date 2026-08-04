# GHL Custom Workflow Action — Research Notes

## Key Findings from GHL Documentation

### How Custom Actions Work
- Custom actions are **manually registered in the GHL Developer Portal** (Marketplace > Modules > Workflow > Create Action).
- There is **NO API endpoint** to programmatically create/register a custom action into a sub-account.
- Custom actions are defined at the **app level** (in the Developer Portal) and automatically become available in **all sub-accounts** where the app is installed.
- So: once the action is registered in the Developer Portal, every sub-account that installs the app gets the action automatically.

### Action Configuration
The action has these configuration sections:
1. **Action Information** — Name, Key (immutable), Icon, Description
2. **Manage Fields** — Form fields users see when configuring the action in a workflow
3. **Action Execution** — POST URL that GHL calls when the action fires
4. **Output Variables** — Keys that get returned and can be used in subsequent workflow steps

### Payload Structure When Action Fires
```json
{
  "data": { /* all mapped field values */ },
  "extras": {
    "locationId": "xyz",
    "contactId": "abc",
    "workflowId": "def",
    "executionId": "ghi"
  },
  "meta": {
    "key": "custom_action_key",
    "version": "1.0"
  }
}
```

### Field Types Available
- String, Numerical, Textarea, Select, Multiple Select, Radio, Toggle, Checkbox, Attachment, Hidden, Dynamic

### Dynamic Fields (POST endpoint)
- Returns `{"inputs": [{"section": "...", "fields": [{"field": "key", "title": "...", "fieldType": "string", "required": true}]}]}`
- Used to dynamically build the form UI from the app's data (e.g., list of books)

### Response Format
- API response should return data that maps to the defined Output Variables
- Can also include `branchId` for multi-branch routing

### Important: No Programmatic Registration
- The custom action is registered **once** in the Developer Portal
- It appears automatically in **all sub-accounts** that have the app installed
- This is the correct behavior — it's a marketplace app feature, not a per-install configuration

## Implications for Our Implementation
1. We need to create the action in the Developer Portal (one-time setup)
2. The action uses a POST endpoint on our backend
3. The endpoint receives the payload with `data`, `extras`, and `meta`
4. We need to:
   - Create a `/workflow-action/create-print-job` endpoint that matches the expected payload shape
   - Create a `/workflow-action/dynamic-fields` endpoint that returns the book list + shipping options
   - The existing `/workflow-action/print` endpoint can be adapted or replaced
5. The action should automatically appear in all sub-accounts once registered in the Developer Portal
