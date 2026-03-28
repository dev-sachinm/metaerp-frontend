export const EXPORT_BOM_VIEW_EXCEL_ITEM_CODE = `
  mutation ExportBomViewExcel(
    $fixtureId: String!
    $drawingNoContains: String
    $drawingDescriptionContains: String
    $standardPartItemCodeContains: String
    $standardPartNameContains: String
    $standardPartMakeContains: String
  ) {
    exportBomViewExcel(
      fixtureId: $fixtureId
      drawingNoContains: $drawingNoContains
      drawingDescriptionContains: $drawingDescriptionContains
      standardPartItemCodeContains: $standardPartItemCodeContains
      standardPartNameContains: $standardPartNameContains
      standardPartMakeContains: $standardPartMakeContains
    ) {
      s3Key
      downloadUrl
    }
  }
`

