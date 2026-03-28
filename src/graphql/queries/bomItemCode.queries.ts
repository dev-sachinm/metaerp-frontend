export const GET_BOM_VIEW_ITEM_CODE = `
  query BomView(
    $fixtureId: String!,
    $drawingNo: String,
    $drawingDesc: String,
    $stdPartNo: String,
    $stdName: String,
    $stdMake: String
  ) {
    bomView(
      fixtureId: $fixtureId
      drawingNoContains: $drawingNo
      drawingDescriptionContains: $drawingDesc
      standardPartItemCodeContains: $stdPartNo
      standardPartNameContains: $stdName
      standardPartMakeContains: $stdMake
    ) {
      fixture { id fixtureNumber status }
      manufacturedParts {
        id fixtureId srNo drawingNo description qtyLh qtyRh unitPrice status
        vendorId vendorName receivedLhQty receivedRhQty
        fixtureSeq unitSeq partSeq drawingFileS3Key
      }
      standardParts {
        id fixtureId productId srNo unitId supplierId supplierName
        uom
        partNo productName productMake
        expectedQty
        currentStock
        purchaseQty
        purchaseUnitPrice
      }
    }
  }
`

export const PARSE_PROJECT_BOM_FILE_ITEM_CODE = `
  query ParseProjectBomFile($projectId: String!, $s3Key: String!) {
    parseProjectBomFile(projectId: $projectId, s3Key: $s3Key) {
      summary {
        totalManufactured
        totalStandard
        wrongEntryCount
        duplicateDrawingCount
        newFixtureSeqs
        existingFixtureSeqs
      }
      manufacturedParts {
        srNo
        drawingNo
        description
        qtyLh
        qtyRh
        isWrongEntry
        wrongEntryReason
        fixtureSeq
        unitSeq
        partSeq
        parsedDrawingNo
        hasDrawing
        isDuplicateInProject
        duplicateFixtures { id fixtureNumber }
        fixtureExists
        existingFixtureId
        existingFixtureNumber
      }
      standardParts {
        srNo
        drawingNo
        itemCode
        description
        make
        qty
        unit
        fixtureSeq
        similarProducts { id itemCode name make }
      }
      wrongEntries { rowNum srNo rawValue reason }
    }
  }
`

export const PARSE_BOM_FILE_ITEM_CODE = `
  query ParseBomFile($fixtureId: String!, $s3Key: String!) {
    parseBomFile(fixtureId: $fixtureId, s3Key: $s3Key) {
      summary {
        totalManufactured
        totalStandard
        wrongEntryCount
        duplicateDrawingCount
      }
      manufacturedParts {
        srNo
        drawingNo
        description
        qtyLh
        qtyRh
        isWrongEntry
        wrongEntryReason
        fixtureSeq
        unitSeq
        partSeq
        parsedDrawingNo
        hasDrawing
        isDuplicateInProject
        duplicateFixtures { id fixtureNumber }
      }
      standardParts {
        srNo
        drawingNo
        itemCode
        description
        make
        qty
        unit
        fixtureSeq
        similarProducts { id itemCode name make }
      }
      wrongEntries { rowNum srNo rawValue reason }
    }
  }
`

