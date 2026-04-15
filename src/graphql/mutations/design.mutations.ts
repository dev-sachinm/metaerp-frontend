// GraphQL mutation documents (generated/maintained manually)
export const CREATE_FIXTURE = `
  mutation CreateFixture($input: CreateFixtureInput!) {
    createFixture(input: $input) {
      id fixtureNumber fixtureSeq stage
      stageInfo { stage label displayStatus enteredAt }
    }
  }
`

export const UPDATE_FIXTURE = `
  mutation UpdateFixture($id: String!, $input: UpdateFixtureInput!) {
    updateFixture(id: $id, input: $input) {
      id stage description isActive
      stageInfo { stage label displayStatus enteredAt }
    }
  }
`

export const DELETE_FIXTURE = `
  mutation DeleteFixture($id: String!) { deleteFixture(id: $id) }
`

export const MARK_ASSEMBLY_COMPLETE = `
  mutation MarkAssemblyComplete($fixtureId: String!) {
    markAssemblyComplete(fixtureId: $fixtureId) {
      id stage stageAssemblyCompletedAt
      stageInfo { stage label displayStatus enteredAt }
    }
  }
`

export const MARK_CMM_COMPLETE = `
  mutation MarkCmmComplete($fixtureId: String!) {
    markCmmComplete(fixtureId: $fixtureId) {
      id stage stageCmmCompletedAt
      stageInfo { stage label displayStatus enteredAt }
    }
  }
`

export const MARK_DISPATCH_COMPLETE = `
  mutation MarkDispatchComplete($fixtureId: String!) {
    markDispatchComplete(fixtureId: $fixtureId) {
      id stage stageDispatchAt
      stageInfo { stage label displayStatus enteredAt }
    }
  }
`

export const FORCE_FIXTURE_STAGE = `
  mutation ForceFixtureStage($fixtureId: String!, $stage: String!) {
    forceFixtureStage(fixtureId: $fixtureId, stage: $stage) {
      id stage
      stageInfo { stage label displayStatus enteredAt }
    }
  }
`

export const SUBMIT_BOM_UPLOAD = `
  mutation SubmitBomUpload($input: BomSubmitInput!) {
    submitBomUpload(input: $input) {
      id fixtureNumber s3BomKey bomFilename bomUploadedAt
    }
  }
`

export const SUBMIT_PROJECT_BOM_UPLOAD = `
  mutation SubmitProjectBomUpload($input: ProjectBomSubmitInput!) {
    submitProjectBomUpload(input: $input) {
      id fixtureNumber fixtureSeq stage s3BomKey bomFilename bomUploadedAt
    }
  }
`
