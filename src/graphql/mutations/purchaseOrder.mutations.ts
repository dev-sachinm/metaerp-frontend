export const CREATE_MANUFACTURED_PO = `
  mutation CreateManufacturedPo($fixtureId: String!, $partIds: [String!]!, $vendorId: String!) {
    createManufacturedPo(fixtureId: $fixtureId, partIds: $partIds, vendorId: $vendorId) {
      id
      poNumber
      title
      poType
      vendorId
      vendorName
      poStatus
    }
  }
`

export const CREATE_STANDARD_PO = `
  mutation CreateStandardPo($fixtureId: String!, $partIds: [String!]!, $supplierId: String!) {
    createStandardPo(fixtureId: $fixtureId, partIds: $partIds, supplierId: $supplierId) {
      id
      poNumber
      title
      poType
      supplierId
      supplierName
      poStatus
    }
  }
`

export const CREATE_PURCHASE_ORDER = `
  mutation CreatePurchaseOrder($input: PurchaseOrderInput!) {
    createPurchaseOrder(input: $input) {
      id
      poNumber
      title
      poType
    }
  }
`

export const UPDATE_PURCHASE_ORDER = `
  mutation UpdatePurchaseOrder($id: String!, $input: PurchaseOrderUpdateInput!) {
    updatePurchaseOrder(id: $id, input: $input) {
      id
      poNumber
      title
      poType
    }
  }
`

export const DELETE_PURCHASE_ORDER = `
  mutation DeletePurchaseOrder($id: String!) {
    deletePurchaseOrder(id: $id)
  }
`
