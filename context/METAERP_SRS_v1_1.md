**METAERP**

Manufacturing ERP Platform

**SOFTWARE REQUIREMENTS SPECIFICATION**

(SRS)

| Document Version | 1.1 |
| --- | --- |
| Date | February 4, 2026 |
| Status | Draft |
| Confidentiality | Internal Use Only |

# Document Control

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| 1.0 | Feb 4, 2026 | Project Team | Initial document creation |
| 1.1 | Feb 4, 2026 | Project Team | Updated to 10 user roles |

# Table of Contents

# 1\. Introduction

## 1.1 Purpose

This Software Requirements Specification (SRS) document provides a complete description of all functional and non-functional requirements for the METAERP Manufacturing ERP Platform. It is intended to be used by the development team, quality assurance team, and stakeholders.

## 1.2 Scope

METAERP is a web-based multi-tenant ERP platform designed for manufacturing companies in the robotics, automation, and mechanical engineering sectors. The system manages the complete project lifecycle including design management, BOM processing, procurement, manufacturing coordination, quality assurance, inventory management, and invoicing.

## 1.3 User Classes

The system supports 10 distinct user roles: Operations Head (Owner), Project Managers, Design Team, Procurement Team, Manufacturing Team, Quality Team, Store/Inventory, Assembly Team, CMM Operators, and Accounts Team.

# 2\. System Overview

## 2.1 User Role Summary

| Role | Scope/Interest | Primary Functions |
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

# 3\. Functional Requirements

## 3.1 Authentication and Authorization

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-AUTH-001 | System shall authenticate users using email/username and password | High | BRD |
| FR-AUTH-002 | System shall enforce role-based access control with 10 distinct roles | High | BRD |
| FR-AUTH-003 | System shall track user login sessions with last login timestamp | Medium | BRD |
| FR-AUTH-004 | System shall allow users to be assigned to one role per account | High | BRD |

## 3.2 Project Management

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-PM-001 | System shall auto-generate project codes in format PRJ-YYYYMMDD-XXX | High | BRD |
| FR-PM-002 | System shall accept project number input during project creation | High | Client |
| FR-PM-003 | System shall track project status: Open, In Progress, On Hold, Completed, Cancelled | High | BRD |
| FR-PM-004 | System shall capture project start date, target date (overall), and actual delivery date | High | Client |
| FR-PM-005 | System shall support role-specific target dates (except CMM and Accounts) | High | Client |
| FR-PM-006 | System shall calculate remaining days as target date minus start date | High | Client |
| FR-PM-007 | System shall display remaining days with color coding: Green (<30), Orange (30-60), Red (>60) | Medium | Client |
| FR-PM-008 | System shall restrict actual delivery date modification to Owner role only | High | Client |
| FR-PM-009 | System shall provide expandable/collapsible project hierarchy view | High | Client |

## 3.3 Fixture Management

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-FX-001 | System shall enforce naming: Project (5 chars) > Fixture (-XXX) > Unit (-XX) > Drawing (-XX) | High | BRD |
| FR-FX-002 | System shall derive fixture number from Drawing No. (first 8 characters) | High | BRD |
| FR-FX-003 | System shall track fixture status through workflow stages | High | BRD |
| FR-FX-004 | System shall record status change timestamps for each transition | High | BRD |
| FR-FX-005 | System shall maintain fixture version starting at 1.0 | High | BRD |
| FR-FX-006 | System shall track dispatch flags: Painting, Packaging, Transportation, Insured | High | BRD |
| FR-FX-007 | System shall display fixture list under Project menu label | High | Client |

## 3.4 Design Package Upload

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-DU-001 | System shall accept ZIP file uploads containing BOM.xlsx and design PDFs | High | BRD |
| FR-DU-002 | System shall support single unit and multiple unit upload structures | High | BRD |
| FR-DU-003 | System shall parse BOM.xlsx with LIST OF MATERIAL and Standard Part List sections | High | BRD |
| FR-DU-004 | System shall flag invalid entries as Wrong Entry with Review Required status | High | BRD |
| FR-DU-005 | System shall block fixture submission if Wrong Entries exist | High | BRD |
| FR-DU-006 | System shall support upload to new or existing fixture | High | BRD |

## 3.5 BOM Management

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-BOM-001 | System shall separate manufactured parts from standard parts | High | BRD |
| FR-BOM-002 | System shall link Standard Part List at project level | High | BRD |
| FR-BOM-003 | System shall track part status: Pending > Inprogress > Quality Checked > Received | High | BRD |
| FR-BOM-004 | System shall store cost breakdown as JSON with multiple labels | High | BRD |
| FR-BOM-005 | System shall calculate Cost Per Piece as sum of all cost labels | High | BRD |
| FR-BOM-006 | System shall calculate Total Cost as (QTY LH + QTY RH) x Cost Per Piece | High | BRD |
| FR-BOM-007 | System shall display hierarchical BOM view: Fixture > Unit > Drawings | High | Client |
| FR-BOM-008 | System shall support revision entries with R1, R2 suffix | High | BRD |
| FR-BOM-009 | System shall support ECN entries with ECN1, ECN2 suffix | High | BRD |
| FR-BOM-0010 | System shall preload all possible product categories | High | BRD |
| FR-BOM-0011 | System shall allow designer to search the Product Master using criteria such as category, product name, description, make, and unit | High | BRD |
| FR-BOM-0012 | After uploading the BOM but before submission System shall provide list of existing similar products and can optionally select one match (single checkbox selection) | High | BRD |
| FR-BOM-0013 | If no existing product matches, the designer must select a product category from the preloaded list dropdown. If a suitable category is not found, the designer can create a new master product category and use it | High | BRD |
| FR-BOM-0014 | Once the designer submits the BOM, all non-matching products will automatically be created in the Product Master with an initial stock of 0. | High | BRD |
| FR-BOM-0015 | Users shall be able to open audit product screen | Medium | BRD |
| FR-BOM-0016 | Users shall be able to correct product details shown on audit product screen | Medium | BRD |
| FR-BOM-0017 | Users shall be able to merge duplicate product entries with the original one | Medium | BRD |

## 3.6 Procurement

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-PR-001 | System shall support bulk selection of parts for PO creation | High | BRD |
| FR-PR-002 | System shall allow vendor/supplier selection at bulk level (not row level) | High | Client |
| FR-PR-003 | System shall allow selection of columns to send to vendor in PO email | High | Client |
| FR-PR-004 | System shall lock qty, cost, vendor fields after PO creation | High | BRD |
| FR-PR-005 | System shall NOT allow Procurement to edit quantity fields | High | Client |
| FR-PR-006 | System shall support Excel export for cost entry offline | High | Client |
| FR-PR-007 | System shall support Excel import with cost breakdown data | High | Client |
| FR-PR-008 | System shall display cost breakdown popup for each row | High | Client |
| FR-PR-009 | System shall record PO Date and PO Received Date | High | Client |
| FR-PR-010 | System shall show PO Created status for Standard Parts | High | Client |

## 3.7 Inventory Management

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-INV-001 | System shall match Part No. from BOM with Store Master | High | BRD |
| FR-INV-002 | System shall calculate Purchase Quantity = BOM QTY - Store Quantity | High | BRD |
| FR-INV-003 | System shall display Store Qty and Purchase Qty for standard parts | High | BRD |
| FR-INV-004 | System shall track minimum stock levels | High | BRD |
| FR-INV-005 | System shall track stock location (Rack/Row/Column) | Medium | BRD |
| FR-INV-006 | System shall allow Store to update stock by Project Code | High | BRD |

## 3.8 Manufacturing Coordination

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-MF-001 | System shall allow Manufacturing Team to track part manufacturing | High | BRD |
| FR-MF-002 | System shall display parts with Inprogress status | High | BRD |
| FR-MF-003 | System shall hide costing information from Manufacturing Team | High | BRD |
| FR-MF-004 | System shall support rework assignment from Assembly/CMM | High | BRD |

## 3.9 Quality Assurance

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-QA-001 | System shall allow Quality Team to track inspection status | High | BRD |
| FR-QA-002 | System shall support bulk marking of parts as Quality Checked | High | BRD |
| FR-QA-003 | System shall hide costing information from Quality Team | High | BRD |

## 3.10 Assembly

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-ASM-001 | System shall allow Assembly Team to track parts availability | High | BRD |
| FR-ASM-002 | System shall enforce prerequisites: All parts Received, Standard parts available | High | BRD |
| FR-ASM-003 | System shall allow Revision parts creation (R1, R2 suffix) | High | BRD |
| FR-ASM-004 | System shall allow assignment back to Design Team for ECN | High | BRD |
| FR-ASM-005 | System shall allow rework assignment to Manufacturing Team | High | BRD |
| FR-ASM-006 | System shall update Fixture status to Assembly Completed | High | BRD |

## 3.11 CMM Inspection

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-CMM-001 | System shall allow CMM Operators to inspect fixtures | High | BRD |
| FR-CMM-002 | System shall enforce prerequisite: Fixture status = Assembly Completed | High | BRD |
| FR-CMM-003 | System shall support issue resolution (Revision, ECN, Rework) | High | BRD |
| FR-CMM-004 | System shall update Fixture status to CMM Confirmed | High | BRD |

## 3.12 Dispatch and Invoice

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-DSP-001 | System shall show dispatch prerequisites to Accounts before invoice | High | BRD |
| FR-DSP-002 | System shall support fixture-level POs for Painting, Packaging, Transport, Insurance | High | BRD |
| FR-DSP-003 | System shall auto-set dispatch flags when fixture-level POs are created | High | BRD |
| FR-DSP-004 | System shall support in-house marking of Painting/Packaging completed | High | BRD |
| FR-DSP-005 | System shall allow single or multiple fixture selection for invoice | High | BRD |
| FR-DSP-006 | System shall update Fixture status to Dispatched after invoice | High | BRD |

## 3.13 Reporting

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| FR-RPT-001 | System shall provide project detailed summary for Owner and Project Managers | High | Client |
| FR-RPT-002 | System shall display budget vs actual tracking for Owner | High | BRD |
| FR-RPT-003 | System shall show complete project timeline for Owner and Project Managers | High | Client |
| FR-RPT-004 | System shall show role-specific timeline for other roles | Medium | Client |
| FR-RPT-005 | System shall support export to Excel and PDF | Medium | BRD |

# 4\. Non-Functional Requirements

## 4.1 Performance

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| NFR-PERF-001 | System shall respond within 3 seconds under normal load | High | BRD |
| NFR-PERF-002 | System shall handle BOM files with up to 500 parts | High | BRD |
| NFR-PERF-003 | System shall support bulk operations on up to 100 parts | High | BRD |

## 4.2 Security

| Req ID | Description | Priority | Source |
| --- | --- | --- | --- |
| NFR-SEC-001 | System shall enforce role-based access control with 10 roles | High | BRD |
| NFR-SEC-002 | System shall restrict cost visibility based on role matrix | High | BRD |
| NFR-SEC-003 | System shall hash and salt all stored passwords | High | BRD |
| NFR-SEC-004 | System shall encrypt data in transit using HTTPS/TLS | High | BRD |

## 4.3 Cost Visibility Matrix

| Role | Total Cost | Purchase Budget | Cost Breakdown | Project Budget |
| --- | --- | --- | --- | --- |
| Operations Head (Owner) | Yes | Yes | Yes | Yes |
| Project Managers | No | Yes | Yes | Yes |
| Design Team | No | No | No | No |
| Procurement Team | No | Yes | Yes | No |
| Manufacturing Team | No | No | No | No |
| Quality Team | No | No | No | No |
| Store/Inventory | No | No | No | No |
| Assembly Team | No | No | No | No |
| CMM Operators | No | No | No | No |
| Accounts Team | Yes | Yes | Yes | Yes |

_\--- End of Document ---_