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
        id fixtureId drawingNo description qty lhRh unitPrice status productId
        vendorId vendorName
        fixtureSeq unitSeq partSeq drawingFileS3Key
      }
      standardParts {
        id fixtureId productId unitId supplierId supplierName
        uom lhRh
        itemCode productName productMake
        qty expectedQty
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
        bomFixtureSeq
        fixtureMismatchCount
      }
      manufacturedParts {
        drawingNo
        description
        qty
        lhRh
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
        drawingNo
        itemCode
        description
        qty
        lhRh
        productFound
        productId
        isWrongEntry
        wrongEntryReason
        fixtureSeq
        unitSeq
      }
      wrongEntries { rowNum rawValue reason }
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
        drawingNo
        description
        qty
        lhRh
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
        drawingNo
        itemCode
        description
        qty
        lhRh
        productFound
        productId
        isWrongEntry
        wrongEntryReason
        fixtureSeq
        unitSeq
      }
      wrongEntries { rowNum rawValue reason }
    }
  }
`

