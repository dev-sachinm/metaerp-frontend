export const GET_FIXTURES = `
  query Fixtures($projectId: String!, $skip: Int, $limit: Int, $status: String) {
    fixtures(projectId: $projectId, skip: $skip, limit: $limit, status: $status) {
      items {
        id fixtureNumber fixtureSeq status isActive
        bomFilename bomUploadedAt
      }
      total
    }
  }
`

export const GET_FIXTURE = `
  query Fixture($id: String!) {
    fixture(id: $id) {
      id fixtureNumber fixtureSeq description status isActive
      bomFilename bomUploadedAt bomUploadedBy createdAt
    }
  }
`

export const GET_BOM_VIEW = `
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
      standardPartPartNoContains: $stdPartNo
      standardPartNameContains: $stdName
      standardPartMakeContains: $stdMake
    ) {
      fixture { id fixtureNumber status }
      manufacturedParts {
        id drawingNo description qtyLh qtyRh status
        fixtureSeq unitSeq partSeq drawingFileS3Key
      }
      standardParts {
        id productId partNo productName productMake
        srNo qty unitId
        currentStock expectedQty purchaseQty
      }
    }
  }
`

export const GET_DRAWING_VIEW_URL = `
  query GetDrawingViewUrl($partId: String!) {
    getDrawingViewUrl(partId: $partId) { viewUrl partId drawingNo }
  }
`

export const GET_DESIGN_UPLOAD_URL = `
  query GetDesignUploadUrl($fixtureId: String!, $filename: String!) {
    getDesignUploadUrl(fixtureId: $fixtureId, filename: $filename) {
      uploadUrl s3Key fixtureId
    }
  }
`

export const GET_PROJECT_BOM_UPLOAD_URL = `
  query GetProjectBomUploadUrl($projectId: String!, $filename: String!) {
    getProjectBomUploadUrl(projectId: $projectId, filename: $filename) {
      uploadUrl s3Key projectId
    }
  }
`

export const PARSE_PROJECT_BOM_FILE = `
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
        partNumber
        description
        make
        qty
        unit
        similarProducts { id partNo name make }
      }
      wrongEntries { rowNum srNo rawValue reason }
    }
  }
`

export const PARSE_BOM_FILE = `
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
        partNumber
        description
        make
        qty
        unit
        similarProducts { id partNo name make }
      }
      wrongEntries { rowNum srNo rawValue reason }
    }
  }
`
