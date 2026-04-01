export const RECEIVE_STANDARD_PARTS = `
  mutation ReceiveStandardParts($receipts: [StandardPartReceiptInput!]!) {
    receiveStandardParts(receipts: $receipts)
  }
`

export const UPDATE_MANUFACTURED_STATUS_BULK = `
  mutation UpdateManufacturedStatusBulk($fixtureId: String!, $partIds: [String!]!, $status: String!) {
    updateManufacturedStatusBulk(fixtureId: $fixtureId, partIds: $partIds, status: $status)
  }
`

export const UPDATE_MANUFACTURED_RECEIVED_QTY = `
  mutation UpdateManufacturedReceivedQty($partId: String!, $receivedQty: Float) {
    updateManufacturedReceivedQty(partId: $partId, receivedQty: $receivedQty) {
      id
      qty
      receivedQuantity
      lhRh
      status
    }
  }
`

export const UPDATE_STANDARD_PART_PURCHASE_UNIT_PRICE = `
  mutation UpdateStandardPartPurchaseUnitPrice($standardPartId: String!, $purchaseUnitPrice: Float) {
    updateStandardPartPurchaseUnitPrice(standardPartId: $standardPartId, purchaseUnitPrice: $purchaseUnitPrice) {
      id
      purchaseUnitPrice
    }
  }
`
