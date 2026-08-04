# GHL Internal Reference Field Types

## Available Internal Reference Modules for Select Fields
GHL supports "Internal Reference" option type for Select, Multi Select, and Radio field types.

Supported GHL Internal Modules include:
- **Products** — loads all products from the sub-account
- **Contacts** — loads contacts from the sub-account
- **Tags** — loads available tags
- **Pipelines** — loads available pipelines
- And others

## Key Finding
For our custom action, we can use:
1. **Select field with Internal Reference → Products** — This will show all GHL products in a dropdown
2. **Select field with Internal Reference → Contacts** — This won't work well for our case because we need the contact's full address

## Better Approach
Since the workflow action fires in the context of a contact (the workflow is triggered for a specific contact), the `extras.contactId` is automatically sent by GHL during live execution. So we DON'T need a contact field at all — the contact is already known from the workflow context.

For products, we use:
- **Field Type:** Select
- **Option Type:** Internal Reference → Products
- This will automatically populate the dropdown with all GHL products

## The Simplified Plan
1. Field 1: "Select Product" — Select type, Internal Reference: Products, Required: On, Reference: `product_name`
2. Field 2: "Quantity" — Numerical type, Required: On, Reference: `quantity`, Default: 1
3. Field 3: "Shipping Speed" — Select type, Constants, Required: On, Reference: `shipping_level`
4. NO Dynamic field needed
5. NO dynamic-fields endpoint needed
6. Backend matches product_name to book.title, gets the book ID, and submits to Lulu
7. Contact info (including full address) is auto-resolved from extras.contactId
