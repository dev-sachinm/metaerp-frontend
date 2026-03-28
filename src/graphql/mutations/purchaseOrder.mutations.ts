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
