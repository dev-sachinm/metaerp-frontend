// GraphQL mutation documents (generated/maintained manually)
export const CREATE_FIXTURE = `
  mutation CreateFixture($input: CreateFixtureInput!) {
    createFixture(input: $input) { id fixtureNumber fixtureSeq status }
  }
`

export const UPDATE_FIXTURE = `
  mutation UpdateFixture($id: String!, $input: UpdateFixtureInput!) {
    updateFixture(id: $id, input: $input) { id status description isActive }
  }
`

export const DELETE_FIXTURE = `
  mutation DeleteFixture($id: String!) { deleteFixture(id: $id) }
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
      id fixtureNumber fixtureSeq status s3BomKey bomFilename bomUploadedAt
    }
  }
`
