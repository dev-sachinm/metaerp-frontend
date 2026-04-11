export const GET_EMAILS = `
  query Emails($contextType: String, $contextId: String) {
    emails(contextType: $contextType, contextId: $contextId) {
      id
      subject
      body
      toAddress
      ccAddress
      bccAddress
      contextType
      contextId
      attachments
      createdAt
      createdBy
    }
  }
`

