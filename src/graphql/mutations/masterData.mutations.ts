/**
 * Master Data GraphQL mutations
 * Require module master_data enabled. Aligned with BACKEND_IMPLEMENTATION_STATE.md
 */

const PC_FIELDS = 'id categoryName parentId isActive'
const CUST_FIELDS = 'id name code address contactInfo primaryContactName primaryContactEmail primaryContactMobile secondaryContactName secondaryContactEmail secondaryContactMobile isActive createdAt modifiedAt'
const UOM_FIELDS = 'id code name isActive'
const TAX_FIELDS = 'id name code ratePercent isActive'
const PT_FIELDS = 'id name code days isActive'
const EC_FIELDS = 'id name parentId code isActive'
const SUP_FIELDS = 'id name code contactPerson email phone address isActive'
const VEND_FIELDS = 'id name code contactPerson email phone address isActive'
const PROD_FIELDS = 'id itemCode name description make puUnitId stkUnitId puUnitName stkUnitName procMtd locationInStore quantity isActive categoryId'

export const CREATE_PRODUCT_CATEGORY = `
  mutation CreateProductCategory($input: ProductCategoryInput!) {
    createProductCategory(input: $input) { ${PC_FIELDS} }
  }
`
export const UPDATE_PRODUCT_CATEGORY = `
  mutation UpdateProductCategory($id: String!, $input: ProductCategoryInput!) {
    updateProductCategory(id: $id, input: $input) { ${PC_FIELDS} }
  }
`
export const DELETE_PRODUCT_CATEGORY = `
  mutation DeleteProductCategory($id: String!) {
    deleteProductCategory(id: $id)
  }
`

/** Create customer (BACKEND_IMPLEMENTATION_STATE.md §15 createCustomer) */
export const CREATE_CUSTOMER = `
  mutation CreateCustomer($input: CustomerInput!) {
    createCustomer(input: $input) { ${CUST_FIELDS} }
  }
`
/** Update customer by id (BACKEND_IMPLEMENTATION_STATE.md updateCustomer) */
export const UPDATE_CUSTOMER = `
  mutation UpdateCustomer($id: String!, $input: CustomerInput!) {
    updateCustomer(id: $id, input: $input) { ${CUST_FIELDS} }
  }
`
/** Delete customer by id; returns Boolean! (BACKEND_IMPLEMENTATION_STATE.md deleteCustomer) */
export const DELETE_CUSTOMER = `
  mutation DeleteCustomer($id: String!) {
    deleteCustomer(id: $id)
  }
`

export const CREATE_UOM = `
  mutation CreateUOM($input: UOMInput!) {
    createUOM(input: $input) { ${UOM_FIELDS} }
  }
`
export const UPDATE_UOM = `
  mutation UpdateUOM($id: String!, $input: UOMInput!) {
    updateUOM(id: $id, input: $input) { ${UOM_FIELDS} }
  }
`
export const DELETE_UOM = `
  mutation DeleteUOM($id: String!) {
    deleteUOM(id: $id)
  }
`

export const CREATE_TAX = `
  mutation CreateTax($input: TaxInput!) {
    createTax(input: $input) { ${TAX_FIELDS} }
  }
`
export const UPDATE_TAX = `
  mutation UpdateTax($id: String!, $input: TaxInput!) {
    updateTax(id: $id, input: $input) { ${TAX_FIELDS} }
  }
`
export const DELETE_TAX = `
  mutation DeleteTax($id: String!) {
    deleteTax(id: $id)
  }
`

export const CREATE_PAYMENT_TERM = `
  mutation CreatePaymentTerm($input: PaymentTermInput!) {
    createPaymentTerm(input: $input) { ${PT_FIELDS} }
  }
`
export const UPDATE_PAYMENT_TERM = `
  mutation UpdatePaymentTerm($id: String!, $input: PaymentTermInput!) {
    updatePaymentTerm(id: $id, input: $input) { ${PT_FIELDS} }
  }
`
export const DELETE_PAYMENT_TERM = `
  mutation DeletePaymentTerm($id: String!) {
    deletePaymentTerm(id: $id)
  }
`

export const CREATE_EXPENSE_CATEGORY = `
  mutation CreateExpenseCategory($input: ExpenseCategoryInput!) {
    createExpenseCategory(input: $input) { ${EC_FIELDS} }
  }
`
export const UPDATE_EXPENSE_CATEGORY = `
  mutation UpdateExpenseCategory($id: String!, $input: ExpenseCategoryInput!) {
    updateExpenseCategory(id: $id, input: $input) { ${EC_FIELDS} }
  }
`
export const DELETE_EXPENSE_CATEGORY = `
  mutation DeleteExpenseCategory($id: String!) {
    deleteExpenseCategory(id: $id)
  }
`

export const CREATE_SUPPLIER = `
  mutation CreateSupplier($input: SupplierInput!) {
    createSupplier(input: $input) { ${SUP_FIELDS} }
  }
`
export const UPDATE_SUPPLIER = `
  mutation UpdateSupplier($id: String!, $input: SupplierInput!) {
    updateSupplier(id: $id, input: $input) { ${SUP_FIELDS} }
  }
`
export const DELETE_SUPPLIER = `
  mutation DeleteSupplier($id: String!) {
    deleteSupplier(id: $id)
  }
`

export const CREATE_VENDOR = `
  mutation CreateVendor($input: VendorInput!) {
    createVendor(input: $input) { ${VEND_FIELDS} }
  }
`
export const UPDATE_VENDOR = `
  mutation UpdateVendor($id: String!, $input: VendorInput!) {
    updateVendor(id: $id, input: $input) { ${VEND_FIELDS} }
  }
`
export const DELETE_VENDOR = `
  mutation DeleteVendor($id: String!) {
    deleteVendor(id: $id)
  }
`

export const CREATE_PRODUCT = `
  mutation CreateProduct($input: ProductInput!) {
    createProduct(input: $input) { ${PROD_FIELDS} }
  }
`
export const UPDATE_PRODUCT = `
  mutation UpdateProduct($id: String!, $input: ProductInput!) {
    updateProduct(id: $id, input: $input) { ${PROD_FIELDS} }
  }
`
export const DELETE_PRODUCT = `
  mutation DeleteProduct($id: String!) {
    deleteProduct(id: $id)
  }
`
