**METAERP**

**REQUIREMENTS TRACEABILITY MATRIX**

BRD to SRS Mapping

| Document Version | 1.1 |
| --- | --- |
| Date | February 4, 2026 |
| Status | Draft |

# 1\. User Roles (Updated)

The system now supports 10 distinct user roles (updated from original 19 roles):

| Role | Scope/Interest | Key Requirements |
| --- | --- | --- |
| Operations Head (Owner) | Overall business oversight, strategic decisions | Complete visibility, financial tracking, user management |
| Project Managers | Project execution and coordination | Timeline tracking, resource allocation, status updates, project budget tracking |
| Design Team | Create and manage design packages | BOM upload, version control, drawing management |
| Procurement Team | Supplier, Vendor management, PO creation | Cost tracking, vendor/supplier selection, PO creation |
| Manufacturing Team | Production coordination | Track Part manufacturing, vendor coordination, status updates |
| Quality Team | Quality assurance and inspection | Inspection tracking, quality status updates |
| Store/Inventory | Inventory management | Stock levels, receipt tracking, location management |
| Assembly Team | Fixture assembly | Parts availability tracking, assembly tracking, issue reporting |
| CMM Operators | Precision measurement | Inspection workflows, confirmation tracking |
| Accounts Team | Financial operations | Invoice generation, cost visibility, payment tracking |

# 2\. Complete BRD to SRS Mapping

| BRD Code | BRD Requirement | SRS Requirements |
| --- | --- | --- |
| BR-PM-001 | Project Lifecycle Management | FR-PM-003 |
| BR-PM-002 | Project Code Generation | FR-PM-001 |
| BR-PM-003 | Timeline Tracking | FR-PM-004, FR-PM-005, FR-PM-006, FR-PM-007 |
| BR-PM-004 | Role Assignment | FR-PM-009 |
| BR-FX-001 | Hierarchical Naming | FR-FX-001, FR-FX-002 |
| BR-FX-002 | Fixture Status Tracking | FR-FX-003, FR-FX-004 |
| BR-FX-003 | Version Control | FR-FX-005 |
| BR-FX-004 | Dispatch Prerequisites | FR-FX-006, FR-DSP-001 |
| BR-BOM-001 | Design Package Upload | FR-DU-001, FR-DU-002, FR-DU-006 |
| BR-BOM-002 | BOM Structure | FR-DU-003, FR-BOM-001, FR-BOM-002 |
| BR-BOM-003 | Wrong Entry Handling | FR-DU-004, FR-DU-005 |
| BR-BOM-004 | Product Master Management | FR-BOM-0010, FR-BOM-0011, FR-BOM-0012, FR-BOM-0013, FR-BOM-0014 |
| BR-BOM-005 | Data Governance and Auditing | FR-BOM-0015, FR-BOM-0016, FR-BOM-0017 |
| BR-PR-001 | PO Types | FR-PR-001, FR-DSP-002, FR-DSP-003 |
| BR-PR-002 | Bulk Operations | FR-PR-001, FR-PR-002 |
| BR-PR-003 | Cost Breakdown | FR-BOM-004, FR-BOM-005, FR-BOM-006, FR-PR-008 |
| BR-PR-004 | Excel Export/Import | FR-PR-006, FR-PR-007 |
| BR-MF-001 | Part Status Tracking | FR-BOM-003 |
| BR-MF-002 | Vendor Communication | FR-PR-010 |
| BR-QA-001 | Quality Inspection | FR-QA-001, FR-QA-002 |
| BR-QA-002 | CMM Inspection | FR-CMM-001 to FR-CMM-004 |
| BR-INV-001 | Stock Management | FR-INV-001, FR-INV-004, FR-INV-005 |
| BR-INV-002 | Stock Calculation | FR-INV-002, FR-INV-003 |
| BR-IR-001 | Revision Handling | FR-BOM-008, FR-ASM-003 |
| BR-IR-002 | ECN Handling | FR-BOM-009, FR-ASM-004 |
| BR-IR-003 | Rework Handling | FR-MF-004, FR-ASM-005 |
| BR-AR-001 | Assembly status update | FR-ASM-001,FR-ASM-002, FR-ASM-006 |
| BR-AR-002 | Assembly Issue Reporting | FR-ASM-003, FR-ASM-004, FR-ASM-005 |
| BR-CIR-001 | CMM Inspection confirmation status update | FR-CMM-001, FR-CMM-002, FR-CMM-004 |
| BR-CIR-002 | CMM Issue Reporting | FR-CMM-003 |
| BR-DR-001 | Access dispatch prerequisites | FR-DSP-001, FR-DSP-002, FR-DSP-003, FR-DSP-004 |
| BR-DR-002 | Generate Invoice | FR-DSP-005, FR-DSP-006 |

# 3\. Coverage Summary

| Category | BRD Requirements | SRS Requirements |
| --- | --- | --- |
| Project Management | 4 | 9 |
| Fixture Management | 4 | 7 |
| BOM/Design Upload | 5 | 17 |
| Procurement | 4 | 10 |
| Manufacturing Coordination | 2 | 4 |
| Quality Assurance | 2 | 3 |
| Inventory Management | 2 | 6 |
| Issue Resolution | 3 | 6 |
| Assembly | 2 | 6 |
| CMM | 2 | 4 |
| Dispatch/Invoice | 2 | 6 |
| Authentication (10 roles) | - | 4 |
| Reporting | - | 5 |
| TOTAL | 24 | 79 |

_\--- End of Document ---_