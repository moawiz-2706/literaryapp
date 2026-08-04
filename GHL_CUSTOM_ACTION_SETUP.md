# GHL Custom Workflow Action Setup Guide

## Create Lulu Print Job — Step-by-Step

This guide walks you through configuring the custom workflow action in the GoHighLevel Developer Portal. Once saved, this action appears automatically in every sub-account that installs your app.

---

## How It Works

The action uses **GHL's built-in Product catalog** for book selection and **mapped contact variables** for shipping address. When a book is **approved** in the Literary App, the system automatically creates a **GHL Product** in the sub-account's product catalog. The product name matches the book title exactly.

When a workflow fires:

1. The user selects a **Product (Book)** from their GHL product catalog.
2. The user sets **Quantity** and **Shipping Speed**.
3. The user **maps each shipping address field** to the corresponding GHL contact variable (e.g., `{{contact.firstName}}`, `{{contact.address1}}`).
4. The backend receives all 12 fields, **builds the shipping address**, validates it, and submits to Lulu.
5. The contact is **tagged** and an **opportunity** is created automatically.
6. Output variables are returned for use in downstream workflow steps (SMS, email, etc.).

**The backend also acts as a safety net** — if any mapped variable is empty, it tries to fetch the actual GHL contact data to fill in the missing fields.

---

## Step 1: Open the Configuration Tab

1. In the GHL Developer Portal, open your app.
2. Go to **Modules** → **Workflow** → **Create Lulu Print Job**.
3. Click the **Configuration** tab.

---

## Step 2: Action Information (Top Section)

Fill in the fields at the top of the Configuration tab:

| Field | Value |
| :--- | :--- |
| **Name** | Create Lulu Print Job |
| **Key** | `create_lulu_print_job` |
| **Description** | Place a print order on Lulu.com directly from a GHL workflow. Select a product, set quantity and shipping speed, and map the contact's shipping address from GHL contact variables. |
| **Icon** | Book or Printer icon |
| **Category** | External Communications (or create "Print on Demand") |

---

## Step 3: Manage Fields

Click **Add Field** for each of the following. The form should have exactly **12 fields**:

### Field 1: Select Product (Book)

| Property | Value |
| :--- | :--- |
| **Name** | Select Product (Book) |
| **Type** | `Select` |
| **Required** | On |
| **Reference** | `product_name` |
| **Option Type** | `Internal Reference` |
| **Internal Reference Type** | `Products` |

> This field tells GHL to show a dropdown of all products in the sub-account's product catalog. When the user selects a product, GHL sends the **product name** to your endpoint. The backend matches the product name to the book title.

### Field 2: Quantity

| Property | Value |
| :--- | :--- |
| **Name** | Quantity |
| **Type** | `Numerical` |
| **Required** | On |
| **Reference** | `quantity` |

> Default value is 1. User can set any number from 1 to 1000.

### Field 3: Shipping Speed

| Property | Value |
| :--- | :--- |
| **Name** | Shipping Speed |
| **Type** | `Select` |
| **Required** | On |
| **Reference** | `shipping_level` |
| **Option Type** | `Constants` |

Click **Add Option** for each:

| Label | Value |
| :--- | :--- |
| Standard Mail (3-10 business days) | `MAIL` |
| Priority Mail (1-3 business days) | `PRIORITY_MAIL` |
| Ground (3-5 business days) | `GROUND` |
| Ground HD (2-4 business days) | `GROUND_HD` |
| Ground Business (3-5 business days) | `GROUND_BUS` |
| Expedited (2-3 business days) | `EXPEDITED` |
| Express (1-2 business days) | `EXPRESS` |

---

## Step 4: Contact Shipping Address Fields (Input Variables)

These fields are **required**. When the user configures the workflow action, they map each field to the corresponding GHL contact variable using the variable picker in the workflow builder.

### Field 4: Recipient First Name

| Property | Value |
| :--- | :--- |
| **Name** | Recipient First Name |
| **Type** | `Text` |
| **Required** | On |
| **Reference** | `first_name` |
| **Description** | Map to `{{contact.firstName}}` |

### Field 5: Recipient Last Name

| Property | Value |
| :--- | :--- |
| **Name** | Recipient Last Name |
| **Type** | `Text` |
| **Required** | On |
| **Reference** | `last_name` |
| **Description** | Map to `{{contact.lastName}}` |

### Field 6: Recipient Email

| Property | Value |
| :--- | :--- |
| **Name** | Recipient Email |
| **Type** | `Text` |
| **Required** | On |
| **Reference** | `email` |
| **Description** | Map to `{{contact.email}}` |

### Field 7: Recipient Phone

| Property | Value |
| :--- | :--- |
| **Name** | Recipient Phone |
| **Type** | `Text` |
| **Required** | On |
| **Reference** | `phone` |
| **Description** | Map to `{{contact.phone}}` |

### Field 8: Street Address

| Property | Value |
| :--- | :--- |
| **Name** | Street Address |
| **Type** | `Text` |
| **Required** | On |
| **Reference** | `street1` |
| **Description** | Map to `{{contact.address1}}` |

### Field 9: City

| Property | Value |
| :--- | :--- |
| **Name** | City |
| **Type** | `Text` |
| **Required** | On |
| **Reference** | `city` |
| **Description** | Map to `{{contact.city}}` |

### Field 10: State Code

| Property | Value |
| :--- | :--- |
| **Name** | State Code |
| **Type** | `Text` |
| **Required** | On |
| **Reference** | `state_code` |
| **Description** | Map to `{{contact.state}}` |

### Field 11: Postal Code

| Property | Value |
| :--- | :--- |
| **Name** | Postal Code |
| **Type** | `Text` |
| **Required** | On |
| **Reference** | `postal_code` |
| **Description** | Map to `{{contact.postalCode}}` |

### Field 12: Country Code

| Property | Value |
| :--- | :--- |
| **Name** | Country Code |
| **Type** | `Text` |
| **Required** | On |
| **Reference** | `country_code` |
| **Description** | Map to `{{contact.country}}` |

---

## Complete Fields Summary Table

| # | Field Name | Type | Required | Reference | GHL Variable to Map |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Select Product (Book) | Select → Internal Reference → Products | Yes | `product_name` | User selects from dropdown |
| 2 | Quantity | Numeric | Yes | `quantity` | Static value |
| 3 | Shipping Speed | Select → Constants | Yes | `shipping_level` | Static value |
| 4 | Recipient First Name | Text | Yes | `first_name` | `{{contact.firstName}}` |
| 5 | Recipient Last Name | Text | Yes | `last_name` | `{{contact.lastName}}` |
| 6 | Recipient Email | Text | Yes | `email` | `{{contact.email}}` |
| 7 | Recipient Phone | Text | Yes | `phone` | `{{contact.phone}}` |
| 8 | Street Address | Text | Yes | `street1` | `{{contact.address1}}` |
| 9 | City | Text | Yes | `city` | `{{contact.city}}` |
| 10 | State Code | Text | Yes | `state_code` | `{{contact.state}}` |
| 11 | Postal Code | Text | Yes | `postal_code` | `{{contact.postalCode}}` |
| 12 | Country Code | Text | Yes | `country_code` | `{{contact.country}}` |

---

## Step 5: Action Execution

Scroll down to the **Action execution** section.

| Field | Value |
| :--- | :--- |
| **URL** | `https://literaryapp.onrender.com/workflow-action/create-print-job` |
| **Headers** | Leave empty |
| **Body** | Leave empty |
| **Pause execution** | Off |

> The backend automatically receives all 12 field values from the form in `req.body.data`.

---

## Step 6: Manage Custom Variables (Output Variables)

Scroll down to the **Manage custom variables** section. Click **Add Variable** for each:

| Name | Type | Reference |
| :--- | :--- | :--- |
| Internal Print Job ID | String | `jobId` |
| Lulu Print Job ID | String | `luluPrintJobId` |
| Print Job Status | String | `status` |
| Total Cost | Numeric | `totalCost` |
| Print Cost | Numeric | `printCost` |
| Shipping Cost | Numeric | `shippingCost` |
| Markup | Numeric | `markup` |
| Retail Price | Numeric | `retailPrice` |
| Reader Name | String | `readerName` |
| Reader Email | String | `readerEmail` |
| Shipping Street | String | `shippingStreet` |
| Shipping City | String | `shippingCity` |
| Shipping State | String | `shippingState` |
| Shipping Country | String | `shippingCountry` |
| Shipping Postal Code | String | `shippingPostalCode` |
| Result Message | String | `message` |

---

## Step 7: Test

Scroll down to the **Test section**:

1. **Location ID:** Enter a valid sub-account Location ID that has installed your app.
2. **Test setup** — enter sample data for all 12 fields:

| Field | Sample Value |
| :--- | :--- |
| `product_name` | The exact name of an approved book product in GHL |
| `quantity` | `1` |
| `shipping_level` | `MAIL` |
| `first_name` | `John` |
| `last_name` | `Doe` |
| `email` | `john@example.com` |
| `phone` | `5551234567` |
| `street1` | `123 Main St` |
| `city` | `New York` |
| `state_code` | `NY` |
| `postal_code` | `10001` |
| `country_code` | `US` |

3. Click **Run test**.
4. If successful, the **Response** section shows the output variables populated.

### Expected Success Response

```json
{
  "jobId": "abc123-uuid-...",
  "luluPrintJobId": "PJ-12345678",
  "status": "Submitted",
  "totalCost": 12.50,
  "printCost": 8.75,
  "shippingCost": 3.00,
  "markup": 0.75,
  "retailPrice": 15.99,
  "readerName": "John Doe",
  "readerEmail": "john@example.com",
  "shippingStreet": "123 Main St",
  "shippingCity": "New York",
  "shippingState": "NY",
  "shippingCountry": "US",
  "shippingPostalCode": "10001",
  "message": "Print job created successfully. Order submitted to Lulu for \"My Book Title\"."
}
```

---

## Step 8: Save

Click **Save** in the top right corner.

> **Important Notes:**
> - After saving, it may take 5-10 minutes for the action to propagate to all sub-accounts.
> - The sub-account must have "LC Premium Triggers & Actions" enabled in billing settings.
> - The action appears in workflows under the category you selected (e.g., "Print on Demand").
> - To use it: In the Workflow Builder, add a new action → find "Create Lulu Print Job" → configure the 12 fields → map each shipping field to the corresponding `{{contact.*}}` variable → save the workflow.

---

## How the Contact Address Mapping Works

When the user configures the workflow action in the Workflow Builder, they see 12 fields. For the shipping address fields (4-12), the user clicks each field and selects the corresponding GHL contact variable from the picker:

| Workflow Action Field | User Maps To |
| :--- | :--- |
| Recipient First Name | `{{contact.firstName}}` |
| Recipient Last Name | `{{contact.lastName}}` |
| Recipient Email | `{{contact.email}}` |
| Recipient Phone | `{{contact.phone}}` |
| Street Address | `{{contact.address1}}` |
| City | `{{contact.city}}` |
| State Code | `{{contact.state}}` |
| Postal Code | `{{contact.postalCode}}` |
| Country Code | `{{contact.country}}` |

**Safety net:** If any mapped variable resolves to empty (e.g., the contact doesn't have a phone number), the backend tries to fetch the actual GHL contact data and fills in any missing fields. If required fields are still missing, the action returns a clear error with specific instructions on what to fix.

---

## How the Book/Product Matching Works

When a user selects a GHL product in the workflow, the backend receives the product name. It then matches it to a book using a 5-step strategy:

1. **Exact match:** `book.title === productName`
2. **Case-insensitive match:** `book.title.toLowerCase() === productName.toLowerCase()`
3. **Partial match:** Checks if either string contains the other
4. **LULU_META parsing:** Extracts book_id from the product description comment
5. **GHL Product ID match:** Matches by `ghl_product_id` if the product name looks like an ID

**Important:** Books must be **approved** in the Literary App before they appear as GHL products. The approval process:
1. Creates a GHL Product with name = book title
2. Embeds Lulu metadata in the product description: `<!--LULU_META:{"book_id":"...","pod_package_id":"...",...}:LULU_META-->`
3. Saves `ghl_product_id` to the book record
4. Sets book status to "Ready"

---

## What Happens When the Workflow Fires

```
GHL Workflow Trigger (e.g., Tag Added, Appointment Confirmed)
    |
    v
User maps contact variables in workflow builder:
  first_name    → {{contact.firstName}}
  last_name     → {{contact.lastName}}
  email         → {{contact.email}}
  phone         → {{contact.phone}}
  street1       → {{contact.address1}}
  city          → {{contact.city}}
  state_code    → {{contact.state}}
  postal_code   → {{contact.postalCode}}
  country_code  → {{contact.country}}
    |
    v
GHL sends to your endpoint:
{
  data: {
    product_name: "My Book",
    quantity: 1,
    shipping_level: "MAIL",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    phone: "5551234567",
    street1: "123 Main St",
    city: "New York",
    state_code: "NY",
    postal_code: "10001",
    country_code: "US"
  },
  extras: { locationId: "...", contactId: "...", workflowId: "..." }
}
    |
    v
YOUR BACKEND:
  1. Find book by matching product name to book title
  2. Build shipping address from all 12 data fields
  3. Safety net: if any field is empty, fetch actual GHL contact to fill it
  4. Validate all required address fields
  5. Calculate print + shipping cost
  6. Create print job record in database
  7. Submit order to Lulu.com API
  8. Create GHL opportunity for the order
  9. Tag contact with "Lulu Order" + "Order: [Book Title]"
  10. Update contact custom fields (fulfillment status, Lulu job ID, total cost)
  11. Return output variables to GHL
    |
    v
GHL receives:
{
  jobId, luluPrintJobId, status, totalCost,
  printCost, shippingCost, markup, retailPrice,
  readerName, readerEmail,
  shippingStreet, shippingCity, shippingState,
  shippingCountry, shippingPostalCode, message
}
    |
    v
Downstream workflow steps can use:
{{workflow.order.jobId}}, {{workflow.order.totalCost}},
{{workflow.order.shippingStreet}}, etc.
```

---

## Troubleshooting

| Problem | Cause | Fix |
| :--- | :--- | :--- |
| "locationId is missing" | Location ID not entered in test field | Enter your 24-character Location ID |
| "product_name is required" | No product selected in the dropdown | Select a product from the GHL product catalog |
| "Incomplete shipping information" | A mapped variable is empty | Check that the contact has all fields filled and mapped correctly |
| "No book matches the product" | The product name doesn't match any book title | Make sure the book is **approved** in the Literary App first |
| "Lulu not configured" | No Lulu API credentials for this location | Go to Settings → Lulu Integration and add credentials |
| "Book is not ready for printing" | Book status is not "Ready" | Approve the book in the Lulu Integration page |

---

## Deployment Checklist

- [ ] Backend deployed to Render at `https://literaryapp.onrender.com`
- [ ] `VITE_API_BASE_URL` set in Vercel environment variables
- [ ] Lulu API credentials configured for the sub-account
- [ ] At least one book approved in the Literary App (creates GHL product)
- [ ] Contact has a complete shipping address in GHL
- [ ] Custom action configured in Developer Portal with 12 fields
- [ ] 16 custom variables added
- [ ] Test run successful
- [ ] Action saved and propagated to sub-accounts
