/**
 * Master Data GraphQL queries
 * Require module master_data enabled. Aligned with BACKEND_IMPLEMENTATION_STATE.md
 */

const LIST_FIELDS = 'total page totalPages hasMore firstPage lastPage'

export const PRODUCT_CATEGORIES = `
  query ProductCategories($page: Int, $pageSize: Int, $isActive: Boolean, $nameContains: String, $parentId: String) {
    productCategories(page: $page, pageSize: $pageSize, isActive: $isActive, nameContains: $nameContains, parentId: $parentId) {
      items { id categoryName parentId parentName isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      total page totalPages hasMore firstPage lastPage
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
  query Customers($page: Int, $pageSize: Int, $isActive: Boolean, $nameContains: String, $codeContains: String, $contactNameContains: String, $emailContains: String) {
    customers(page: $page, pageSize: $pageSize, isActive: $isActive, nameContains: $nameContains, codeContains: $codeContains, contactNameContains: $contactNameContains, emailContains: $emailContains) {
      items { id name code address contactInfo primaryContactName primaryContactEmail primaryContactMobile secondaryContactName secondaryContactEmail secondaryContactMobile isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      total page totalPages hasMore firstPage lastPage
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
  query UOMList($page: Int, $pageSize: Int, $isActive: Boolean, $searchContains: String) {
    uomList(page: $page, pageSize: $pageSize, isActive: $isActive, searchContains: $searchContains) {
      items { id code name isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      total page totalPages hasMore firstPage lastPage
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
  query TaxList($page: Int, $pageSize: Int, $isActive: Boolean, $nameContains: String, $codeContains: String, $rateMin: Float, $rateMax: Float) {
    taxList(page: $page, pageSize: $pageSize, isActive: $isActive, nameContains: $nameContains, codeContains: $codeContains, rateMin: $rateMin, rateMax: $rateMax) {
      items { id name code ratePercent isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      total page totalPages hasMore firstPage lastPage
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
  query PaymentTermsList($page: Int, $pageSize: Int, $isActive: Boolean, $nameContains: String, $codeContains: String, $daysMin: Int, $daysMax: Int) {
    paymentTermsList(page: $page, pageSize: $pageSize, isActive: $isActive, nameContains: $nameContains, codeContains: $codeContains, daysMin: $daysMin, daysMax: $daysMax) {
      items { id name code days isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      total page totalPages hasMore firstPage lastPage
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
  query ExpenseCategoriesList($page: Int, $pageSize: Int, $isActive: Boolean, $nameContains: String, $codeContains: String, $parentId: String) {
    expenseCategoriesList(page: $page, pageSize: $pageSize, isActive: $isActive, nameContains: $nameContains, codeContains: $codeContains, parentId: $parentId) {
      items { id name parentId parentName code isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      total page totalPages hasMore firstPage lastPage
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
  query Suppliers($page: Int, $pageSize: Int, $isActive: Boolean, $nameContains: String, $codeContains: String, $contactPersonContains: String, $emailContains: String) {
    suppliers(page: $page, pageSize: $pageSize, isActive: $isActive, nameContains: $nameContains, codeContains: $codeContains, contactPersonContains: $contactPersonContains, emailContains: $emailContains) {
      items { id name code contactPerson email phone address isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      total page totalPages hasMore firstPage lastPage
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
  query Vendors($page: Int, $pageSize: Int, $isActive: Boolean, $nameContains: String, $codeContains: String, $contactPersonContains: String, $emailContains: String) {
    vendors(page: $page, pageSize: $pageSize, isActive: $isActive, nameContains: $nameContains, codeContains: $codeContains, contactPersonContains: $contactPersonContains, emailContains: $emailContains) {
      items { id name code contactPerson email phone address isActive createdBy createdByUsername modifiedBy modifiedByUsername createdAt modifiedAt }
      total page totalPages hasMore firstPage lastPage
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
    $page: Int
    $pageSize: Int
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
      page: $page
      pageSize: $pageSize
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
