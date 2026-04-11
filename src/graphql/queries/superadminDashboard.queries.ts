export const SUPERADMIN_PROJECT_COMPLETION_QUERY = `
  query SuperadminProjectCompletionChart {
    superadminProjectCompletionChart {
      total
      items {
        projectId
        projectNumber
        name
        customerName
        status
        totalFixtures
        completionPercentage
      }
    }
  }
`

export const SUPERADMIN_MANUFACTURING_RECEIVED_QUERY = `
  query SuperadminManufacturingReceivedChart {
    superadminManufacturingReceivedChart {
      total
      items {
        projectId
        projectNumber
        projectName
        fixtureId
        fixtureNumber
        fixtureDescription
        totalManufactured
        receivedManufactured
        receivedPercentage
      }
    }
  }
`

export const SUPERADMIN_PROJECT_DEADLINE_QUERY = `
  query SuperadminProjectDeadlineTable {
    superadminProjectDeadlineTable {
      total
      overdueCount
      items {
        projectId
        projectNumber
        name
        customerName
        targetDate
        remainingDays
        status
        isOverdue
      }
    }
  }
`
