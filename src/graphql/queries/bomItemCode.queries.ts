export const GET_BOM_VIEW_ITEM_CODE = `
  query BomView(
    $fixtureId: String!,
    $drawingNo: String,
    $drawingDesc: String,
    $stdPartNo: String,
    $stdName: String,
    $stdMake: String,
    $pendingDateFrom: DateTime,
    $pendingDateTo: DateTime,
    $inprogressDateFrom: DateTime,
    $inprogressDateTo: DateTime,
    $qcDateFrom: DateTime,
    $qcDateTo: DateTime,
    $receivedDateFrom: DateTime,
    $receivedDateTo: DateTime
  ) {
    bomView(
      fixtureId: $fixtureId
      drawingNoContains: $drawingNo
      drawingDescriptionContains: $drawingDesc
      standardPartItemCodeContains: $stdPartNo
      standardPartNameContains: $stdName
      standardPartMakeContains: $stdMake
      pendingDateFrom: $pendingDateFrom
      pendingDateTo: $pendingDateTo
      inprogressDateFrom: $inprogressDateFrom
      inprogressDateTo: $inprogressDateTo
      qcDateFrom: $qcDateFrom
      qcDateTo: $qcDateTo
      receivedDateFrom: $receivedDateFrom
      receivedDateTo: $receivedDateTo
    ) {
      fixture { id fixtureNumber status }
      manufacturedParts {
        id fixtureId drawingNo description qty receivedQuantity lhRh unitPrice status productId
        vendorId vendorName
        fixtureSeq unitSeq partSeq drawingFileS3Key
        pendingAt inprogressAt qualityCheckedAt receivedAt
        collectedByassemblyQuantity collectedByUserId collectedAt
      }
      standardParts {
        id fixtureId productId unitId supplierId supplierName
        uom lhRh
        itemCode productName productMake
        qty expectedQty
        currentStock
        purchaseQty
        purchaseUnitPrice
        fixtureSeq unitSeq partSeq
        collectedByassemblyQuantity collectedByUserId collectedAt
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
        errorCount
        warningCount
        duplicateDrawingCount
        newFixtureSeqs
        existingFixtureSeqs
        bomFixtureSeq
        fixtureMismatchCount
        changedCount
        unchangedCount
        newCount
        notUpdatableCount
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
        duplicateFixtures { id fixtureNumber qty }
        fixtureExists
        existingFixtureId
        existingFixtureNumber
        changeStatus
        changes { field oldValue newValue }
        existingStatus
        existingRowId
        drawingFileChanged
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
        changeStatus
        changes { field oldValue newValue }
        existingRowId
      }
      wrongEntries { rowNum rawValue reason }
      errors { rowNum rawValue reason }
      warnings { drawingNo description qty note }
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
        errorCount
        warningCount
        duplicateDrawingCount
        changedCount
        unchangedCount
        newCount
        notUpdatableCount
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
        duplicateFixtures { id fixtureNumber qty }
        changeStatus
        changes { field oldValue newValue }
        existingStatus
        existingRowId
        drawingFileChanged
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
        changeStatus
        changes { field oldValue newValue }
        existingRowId
      }
      wrongEntries { rowNum rawValue reason }
      errors { rowNum rawValue reason }
      warnings { drawingNo description qty note }
    }
  }
`

