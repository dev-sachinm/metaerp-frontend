/**
 * Master Data GraphQL queries
 * Require module master_data enabled. Aligned with BACKEND_IMPLEMENTATION_STATE.md
 */

const LIST_FIELDS = 'id total skip limit page totalPages hasMore'

export const PRODUCT_CATEGORIES = `
  query ProductCategories($skip: Int!, $limit: Int!, $activeOnly: Boolean) {
    productCategories(skip: $skip, limit: $limit, activeOnly: $activeOnly) {
      items { id categoryName parentId isActive createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const PRODUCT_CATEGORY = `
  query ProductCategory($id: String!) {
    productCategory(id: $id) {
      id categoryName parentId isActive
    }
  }
`

export const CUSTOMERS = `
  query Customers($skip: Int!, $limit: Int!, $activeOnly: Boolean) {
    customers(skip: $skip, limit: $limit, activeOnly: $activeOnly) {
      items { id name code address contactInfo primaryContactName primaryContactEmail primaryContactMobile secondaryContactName secondaryContactEmail secondaryContactMobile isActive createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const CUSTOMER = `
  query Customer($id: String!) {
    customer(id: $id) {
      id name code address contactInfo primaryContactName primaryContactEmail primaryContactMobile secondaryContactName secondaryContactEmail secondaryContactMobile isActive
    }
  }
`

export const UOM_LIST = `
  query UOMList($skip: Int!, $limit: Int!, $activeOnly: Boolean) {
    uomList(skip: $skip, limit: $limit, activeOnly: $activeOnly) {
      items { id code name isActive createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const UOM = `
  query UOM($id: String!) {
    uom(id: $id) {
      id code name isActive
    }
  }
`

export const TAX_LIST = `
  query TaxList($skip: Int!, $limit: Int!, $activeOnly: Boolean) {
    taxList(skip: $skip, limit: $limit, activeOnly: $activeOnly) {
      items { id name code ratePercent isActive createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const TAX = `
  query Tax($id: String!) {
    tax(id: $id) {
      id name code ratePercent isActive
    }
  }
`

export const PAYMENT_TERMS_LIST = `
  query PaymentTermsList($skip: Int!, $limit: Int!, $activeOnly: Boolean) {
    paymentTermsList(skip: $skip, limit: $limit, activeOnly: $activeOnly) {
      items { id name code days isActive createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const PAYMENT_TERM = `
  query PaymentTerm($id: String!) {
    paymentTerm(id: $id) {
      id name code days isActive
    }
  }
`

export const EXPENSE_CATEGORIES_LIST = `
  query ExpenseCategoriesList($skip: Int!, $limit: Int!, $activeOnly: Boolean) {
    expenseCategoriesList(skip: $skip, limit: $limit, activeOnly: $activeOnly) {
      items { id name code isActive createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const EXPENSE_CATEGORY = `
  query ExpenseCategory($id: String!) {
    expenseCategory(id: $id) {
      id name code isActive
    }
  }
`

export const SUPPLIERS = `
  query Suppliers($skip: Int!, $limit: Int!, $activeOnly: Boolean) {
    suppliers(skip: $skip, limit: $limit, activeOnly: $activeOnly) {
      items { id name code contactInfo email phone address isActive createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const SUPPLIER = `
  query Supplier($id: String!) {
    supplier(id: $id) {
      id name code contactInfo email phone address isActive
    }
  }
`

export const VENDORS = `
  query Vendors($skip: Int!, $limit: Int!, $activeOnly: Boolean) {
    vendors(skip: $skip, limit: $limit, activeOnly: $activeOnly) {
      items { id name code contactInfo email phone address isActive createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const VENDOR = `
  query Vendor($id: String!) {
    vendor(id: $id) {
      id name code contactInfo email phone address isActive
    }
  }
`

export const PRODUCTS = `
  query Products($skip: Int!, $limit: Int!, $categoryId: String, $activeOnly: Boolean) {
    products(skip: $skip, limit: $limit, categoryId: $categoryId, activeOnly: $activeOnly) {
      items { id name categoryId partNo description make unitId initialStock isActive createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const PRODUCT = `
  query Product($id: String!) {
    product(id: $id) {
      id name categoryId partNo description make unitId initialStock isActive
    }
  }
`
