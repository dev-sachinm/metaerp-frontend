/**
 * Master Data GraphQL queries
 * Require module master_data enabled. Aligned with BACKEND_IMPLEMENTATION_STATE.md
 */

const LIST_FIELDS = 'id total skip limit page totalPages hasMore'

export const PRODUCT_CATEGORIES = `
  query ProductCategories($skip: Int!, $limit: Int!, $isActive: Boolean) {
    productCategories(skip: $skip, limit: $limit, isActive: $isActive) {
      items { id categoryName parentId parentName isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const PRODUCT_CATEGORY = `
  query ProductCategory($id: String!) {
    productCategory(id: $id) {
      id categoryName parentId parentName isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt
    }
  }
`

/** Customers list (aligned with BACKEND_IMPLEMENTATION_STATE.md §16) */
export const CUSTOMERS = `
  query Customers($skip: Int!, $limit: Int!, $isActive: Boolean) {
    customers(skip: $skip, limit: $limit, isActive: $isActive) {
      items { id name code address contactInfo primaryContactName primaryContactEmail primaryContactMobile secondaryContactName secondaryContactEmail secondaryContactMobile isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

/** Get single customer by id (aligned with BACKEND_IMPLEMENTATION_STATE.md §16b GetCustomer) */
export const CUSTOMER = `
  query GetCustomer($id: String!) {
    customer(id: $id) {
      id name code address contactInfo primaryContactName primaryContactEmail primaryContactMobile secondaryContactName secondaryContactEmail secondaryContactMobile isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt
    }
  }
`

export const UOM_LIST = `
  query UOMList($skip: Int!, $limit: Int!, $isActive: Boolean) {
    uomList(skip: $skip, limit: $limit, isActive: $isActive) {
      items { id code name isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const UOM = `
  query UOM($id: String!) {
    uom(id: $id) {
      id code name isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt
    }
  }
`

export const TAX_LIST = `
  query TaxList($skip: Int!, $limit: Int!, $isActive: Boolean) {
    taxList(skip: $skip, limit: $limit, isActive: $isActive) {
      items { id name code ratePercent isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const TAX = `
  query Tax($id: String!) {
    tax(id: $id) {
      id name code ratePercent isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt
    }
  }
`

export const PAYMENT_TERMS_LIST = `
  query PaymentTermsList($skip: Int!, $limit: Int!, $isActive: Boolean) {
    paymentTermsList(skip: $skip, limit: $limit, isActive: $isActive) {
      items { id name code days isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const PAYMENT_TERM = `
  query PaymentTerm($id: String!) {
    paymentTerm(id: $id) {
      id name code days isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt
    }
  }
`

export const EXPENSE_CATEGORIES_LIST = `
  query ExpenseCategoriesList($skip: Int!, $limit: Int!, $isActive: Boolean) {
    expenseCategoriesList(skip: $skip, limit: $limit, isActive: $isActive) {
      items { id name parentId parentName code isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const EXPENSE_CATEGORY = `
  query ExpenseCategory($id: String!) {
    expenseCategory(id: $id) {
      id name parentId parentName code isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt
    }
  }
`

export const SUPPLIERS = `
  query Suppliers($skip: Int!, $limit: Int!, $isActive: Boolean) {
    suppliers(skip: $skip, limit: $limit, isActive: $isActive) {
      items { id name code contactPerson email phone address isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const SUPPLIER = `
  query Supplier($id: String!) {
    supplier(id: $id) {
      id name code contactPerson email phone address isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt
    }
  }
`

export const VENDORS = `
  query Vendors($skip: Int!, $limit: Int!, $isActive: Boolean) {
    vendors(skip: $skip, limit: $limit, isActive: $isActive) {
      items { id name code contactPerson email phone address isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      ${LIST_FIELDS}
    }
  }
`

export const VENDOR = `
  query Vendor($id: String!) {
    vendor(id: $id) {
      id name code contactPerson email phone address isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt
    }
  }
`

export const PRODUCTS = `
  query Products(
    $skip: Int!
    $limit: Int!
    $categoryId: String
    $isActive: Boolean
    $itemCodeContains: String
    $nameContains: String
    $descriptionContains: String
    $makeContains: String
    $puUnitId: String
    $stkUnitId: String
    $locationInStoreContains: String
  ) {
    products(
      skip: $skip
      limit: $limit
      categoryId: $categoryId
      isActive: $isActive
      itemCodeContains: $itemCodeContains
      nameContains: $nameContains
      descriptionContains: $descriptionContains
      makeContains: $makeContains
      puUnitId: $puUnitId
      stkUnitId: $stkUnitId
      locationInStoreContains: $locationInStoreContains
    ) {
      items {
        id itemCode name description make
        puUnitId stkUnitId puUnitName stkUnitName
        procMtd locationInStore quantity isActive categoryId
        createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt
      }
      ${LIST_FIELDS}
    }
  }
`

export const PRODUCT = `
  query GetProduct($id: String!) {
    product(id: $id) {
      id
      categoryId
      itemCode
      name
      description
      make
      puUnitId
      stkUnitId
      puUnitName
      stkUnitName
      procMtd
      locationInStore
      quantity
      isActive
      createdAt
      modifiedAt
      createdBy
      createdByUsername
      modifiedBy
      modifiedByUsername
    }
  }
`
