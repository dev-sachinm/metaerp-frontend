export const PARSE_COSTING_EXCEL = `
  mutation ParseCostingExcel($poId: String!, $fileBase64: String!, $filename: String!) {
    parseCostingExcel(poId: $poId, fileBase64: $fileBase64, filename: $filename) {
      s3Key
      rows {
        drawingNumber
        purchaseUnitPrice
        qtyLh
        qtyRh
        totalCost
        matched
        quantityMismatch
      }
      unmatchedDrawingNumbers
    }
  }
`

export const CONFIRM_COSTING = `
  mutation ConfirmCosting($poId: String!, $s3Key: String!) {
    confirmCosting(poId: $poId, s3Key: $s3Key) {
      poId
      updatedCount
    }
  }
`
