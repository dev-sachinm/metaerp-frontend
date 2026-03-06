**METAERP**

Manufacturing ERP Platform

**BUSINESS REQUIREMENTS DOCUMENT**

(BRD)

A Multi-Tenant ERP Platform for

Robotics, Automation & Mechanical Engineering

Manufacturing Companies

| Document Version | 1.1 |
| --- | --- |
| Date | February 4, 2026 |
| Status | Draft |
| Confidentiality | Internal Use Only |

# Document Control

## Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| 1.0 | Feb 4, 2026 | Project Team | Initial document creation |
| 1.1 | Feb 4, 2026 | Project Team | Updated user roles to 10 roles |

## Approval

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| Project Sponsor |  |  |  |
| Business Owner |  |  |  |
| Technical Lead |  |  |  |

# Table of Contents

# 1\. Executive Summary

## 1.1 Purpose

This Business Requirements Document (BRD) defines the business requirements for METAERP, a comprehensive multi-tenant Enterprise Resource Planning platform designed specifically for manufacturing companies in the robotics, automation, and mechanical engineering sectors. The document outlines the business needs, stakeholder requirements, and expected outcomes that will guide the development and implementation of the system.

## 1.2 Project Overview

METAERP addresses the unique challenges faced by fixture manufacturing companies that handle complex projects involving multiple components, vendors, and quality processes. The platform will manage the complete project lifecycle from design through delivery, with specialized workflows for manufacturing coordination, quality assurance, procurement, and inventory management.

## 1.3 Business Objectives

*   Streamline project management from design to dispatch for fixture manufacturing
*   Centralize Bill of Materials (BOM) management with version control and traceability
*   Automate procurement workflows for both manufactured and standard parts
*   Enable real-time tracking of manufacturing progress and quality inspections
*   Provide role-based access control with 10 distinct user roles
*   Support multi-tenant architecture for future scalability
*   Reduce manual data entry and eliminate paper-based tracking
*   Improve visibility into project costs, timelines, and resource allocation

# 2\. Business Context

## 2.1 Current State Analysis

Manufacturing companies in the robotics and automation sector currently face significant challenges in managing their operations effectively. Common pain points include fragmented data across multiple systems, lack of real-time visibility into project status, manual tracking of parts through manufacturing and quality processes, and difficulty in managing costs and timelines across complex projects with hundreds of components.

## 2.2 Target Industry

The target market includes manufacturing companies specializing in custom fixtures, jigs, and tooling for the robotics, automation, and mechanical engineering sectors. These companies typically handle project-based work where each fixture is unique and consists of both manufactured parts (produced by external vendors) and standard parts (purchased from suppliers).

## 2.3 Business Drivers

*   Need for end-to-end project visibility from design to dispatch
*   Requirement to track costs at granular level (material, labor, overhead, transport)
*   Complex quality assurance requirements including CMM inspections
*   Need to manage multiple vendors and suppliers efficiently
*   Requirement for role-specific access to protect sensitive cost information

# 3\. Stakeholder Analysis

## 3.1 Primary Stakeholders

| Stakeholder | Role/Interest | Key Requirements |
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

# 4\. Business Requirements

## 4.1 Project Management Requirements

### BR-PM-001: Project Lifecycle Management

The system shall support complete project lifecycle management from creation through completion or cancellation. Projects shall have statuses: Open, In Progress, On Hold, Completed, and Cancelled.

### BR-PM-002: Project Code Generation

The system shall automatically generate unique project codes in the format PRJ-YYYYMMDD-XXX where XXX is a sequential number.

### BR-PM-003: Timeline Tracking

The system shall track project timelines with overall target dates and role-specific target dates. Timeline calculations shall show remaining days with color-coded indicators (Green: <30 days, Orange: 30-60 days, Red: >60 days).

### BR-PM-004: Role Assignment

The system shall allow assignment of users to projects based on their roles, including Designer, Procurement, Manufacturing, Quality, Store, Assembly, CMM, and Accounts personnel.

## 4.2 Fixture Management Requirements

### BR-FX-001: Hierarchical Naming Convention

The system shall enforce a hierarchical naming convention: Project (5 chars) > Fixture (Project-XXX) > Unit (Fixture-XX) > Drawing (Unit-XX).

### BR-FX-002: Fixture Status Tracking

The system shall track fixture status through the workflow: Design Pending > Design In Progress > Procurement In Progress > Assembly Completed > CMM Confirmed > Dispatched.

### BR-FX-003: Version Control

The system shall maintain version history for fixtures. Initial upload creates Version 1.0. Revisions (R1, R2) and ECNs (ECN1, ECN2) increment version by 1.0. Rework does not change version.

### BR-FX-004: Dispatch Prerequisites

The system shall enforce dispatch prerequisites: Painting Completed, Packaging Completed, Transportation Booked, and Insurance booking are optional but Accountant shall see all prerequisites before generating invoice.

## 4.3 BOM Management Requirements

### BR-BOM-001: Design Package Upload

The system shall accept design packages as ZIP files containing BOM.xlsx and associated drawing files (PDFs). Files may be uploaded for new fixtures or against existing fixtures.

### BR-BOM-002: BOM Structure

The system shall support two BOM sections: LIST OF MATERIAL (manufactured parts with Drawing No.) and Standard Part List (bought-out parts with Part No.). Standard parts are linked at project level.

### BR-BOM-003: Wrong Entry Handling

The system shall identify and flag invalid BOM entries (missing or invalid Drawing No.) as Wrong Entry with status Review Required. Fixture submission shall be blocked until all invalid entries are resolved.

**BR-BOM-004: Product Master Management**

1.  **Preloaded Categories:** The system shall provide a predefined list of product categories for users to select when creating products.
2.  **Designer Product Search:** The Project Designer will search the Product Master using criteria such as category, product name, description, make, and unit.
3.  **Product Selection:**
    *   If the product is found in the Product Master, the designer will use it in the design/drawing.
    *   If the product is not found, the designer will search externally (e.g., Google) to select a product for the design.
4.  **BOM Submission Process:**
    *   **Pre-Submit Matching:** After uploading the BOM but before submission, for any products in the BOM that do not exist in the Product Master, the designer will be shown existing similar products and can optionally select one match (single checkbox selection).
    *   **Category Assignment (Mandatory):** If no existing product matches, the designer _must_ select a product category from the preloaded list dropdown. If a suitable category is not found, the designer can create a new master product category and use it.
5.  **Product Master Creation:** Once the designer submits the BOM, all non-matching products will automatically be created in the Product Master with an initial stock of 0.

**BR-BOM-005: Data Governance and Auditing**

*   *   A monthly audit will be performed on newly created product categories and products to correct any wrong information.
    *   Users will have the ability to merge duplicate product entries with the original one.

## 4.4 Procurement Requirements

### BR-PR-001: PO Types

The system shall support eight PO types: Manufacturing PO, Standard Part PO, Transport Materials PO, Paint Materials PO, and Painting PO, Packaging PO, Transportation PO, Insurance PO.

### BR-PR-002: Bulk Operations

The system shall support bulk selection of parts/fixtures and bulk assignment of vendors/suppliers for PO creation.

### BR-PR-003: Cost Breakdown

The system shall support detailed cost breakdown with multiple labels. Cost per piece equals the sum of all labels. Total cost equals quantity multiplied by cost per piece.

### BR-PR-004: Excel Export/Import

The system shall allow procurement to export parts to Excel, set costs offline with cost breakdown, and import back into the system.

## 4.5 Manufacturing Coordination Requirements

### BR-MF-001: Part Status Tracking

The system shall track manufacturing part status: Pending > Inprogress > Quality Checked > Received.

### BR-MF-002: Vendor Communication

The system shall generate emails to vendors with selected Excel data columns when POs are created.

## 4.6 Quality Assurance Requirements

### BR-QA-001: Quality Inspection

The system shall support quality inspection workflows where Quality team marks parts as Quality Checked after supplier site inspection.

### BR-QA-002: CMM Inspection

The system shall support CMM inspection workflows after assembly completion, with ability to mark fixtures as CMM Confirmed.

## 4.7 Inventory Management Requirements

### BR-INV-001: Stock Management

The system shall maintain stock quantities in Store Master with minimum stock levels and location tracking (Rack/Row/Column).

### BR-INV-002: Automatic Stock Calculation

The system shall automatically calculate Purchase Quantity as BOM Quantity minus Store Quantity for standard parts.

## 4.8 Issue Resolution Requirements

### BR-IR-001: Revision Handling

The system shall support Revisions for design problems by copying faulty parts with R1, R2 suffix and routing through manufacturing cycle.

### BR-IR-002: Enhancement/ECN Handling

The system shall support ECN (Engineering Change Notes) for missing parts by allowing designers to upload new BOM entries with ECN1, ECN2 suffix.

### BR-IR-003: Rework Handling

The system shall support Rework for manufacturing faults by routing the same part back through manufacturing without changing part number.

## 4.9 Assembly Requirements

### BR-AR-001: Assembly status update

The system shall support Assembly status update.

**BR-AR-002: Issue Reporting**

The system shall support Revision, Enhancement/ECN & Rework reporting during assembly

## 4.10 CMM Inspection Requirements

### BR-CIR-001: CMM Inspection confirmation status update

The system shall support CMM Inspection confirmation status update.

**BR-CIR-002: Issue Reporting**

The system shall support Revision, Enhancement/ECN & Rework reporting during CMM Inspection

## 4.10 Dispatch Requirements

**BR-DR-001: Access dispatch prerequisites  
**Accountant shall be able to access dispatch prerequisites

**BR-DR-002: Generate Invoice  
**Accountant shall be able to generate invoice(s) for selected fixtures

# 5\. User Role Requirements

## 5.1 Role Overview

The system shall implement a role-based access control system with 10 distinct user roles. Each role has specific responsibilities and access levels designed to support the manufacturing workflow from design to dispatch.

## 5.2 Role Matrix

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

## 5.3 Role Responsibilities

### Operations Head (Owner)

*   Organization-wide operations oversight
*   Customer Master management (Create/Update/Delete)
*   Project creation and management
*   User management (Create/Update/Delete, Role assignments)
*   View all organization data with budget vs actual tracking
*   Full access to costing information and financial details

### Project Managers

*   Oversee assigned projects
*   Timeline tracking and resource allocation
*   Status updates and coordination
*   Project budget tracking and monitoring

### Design Team

*   Upload design packages (New or Existing Fixture)
*   Upload revised designs and ECN designs
*   Version control for design documents

### Procurement Team

*   View all fixtures organization-wide
*   Export parts to Excel and set costs with breakdown
*   Import Excel with costs
*   Select parts and vendor/supplier in bulk for PO creation
*   Send email to vendor with selected columns
*   Manage Vendor and Supplier Masters
*   Create Manufacturing PO, Standard Part PO, Transport Materials PO, Paint Materials PO, and Painting PO, Packaging PO, Transportation PO, Insurance PO

### Manufacturing Team

*   Track part manufacturing progress
*   Monitor Inprogress parts
*   Coordinate with vendors
*   Receive rework assignments

### Quality Team

*   Monitor Inprogress parts
*   Contact supplier for readiness
*   Visit supplier for quality inspection
*   Mark parts as Quality Checked in bulk

### Store/Inventory

*   Receive manufacturing parts (verify Quality Checked status)
*   Mark status as Received and record PO Received Date
*   Receive standard parts and update stock by Project Code
*   Inventory management and stock corrections for all type of purchased parts

### Assembly Team

*   Track all types of required parts availability for the fixture to be assembled
*   Assembly of fixtures
*   Issue reporting (Revision, ECN, Rework, Stock Correction)
*   Mark Assembly Completed when done

### CMM Operators

*   Inspect assembled fixtures
*   Issue reporting (Revision, ECN, Rework)
*   Mark CMM Confirmed when inspection passes

### Accounts Team

*   View fixtures ready for dispatch by looking at status of prerequisites Painting Completed, Packaging Completed, Transportation Booked, and Insurance booking flags
*   Generate invoices
*   Project and non-project invoice management
*   Vendor payment tracking
*   Full access to costing information

## 5.4 Cost Visibility Matrix

| Role | Project Value | Total Cost | Project Budget | Purchase Budget | Cost Breakdown |
| --- | --- | --- | --- | --- | --- |
| Operations Head (Owner) | Yes | Yes | Yes | Yes | Yes |
| Project Managers | No | No | Yes | Yes | Yes |
| Design Team | No | No | No | No | No |
| Procurement Team | No | No | No | Yes | Yes |
| Manufacturing Team | No | No | No | No | No |
| Quality Team | No | No | No | No | No |
| Store/Inventory | No | No | No | No | No |
| Assembly Team | No | No | No | No | No |
| CMM Operators | No | No | No | No | No |
| Accounts Team | Yes | No | No | No | No |

# 6\. Data Requirements

## 6.1 Master Data Entities

*   Project Master: Project information, assignments, timelines, budgets
*   User Master: Employee information, roles, authentication
*   Customer Master: Customer details, contact information
*   Fixture Master: Fixture details, versions, status tracking
*   Fixture Table (BOM): Part entries with costs and status
*   Product Master: Standard part definitions, categories, HSN codes
*   Store Master: Inventory levels, locations, minimum stock
*   Supplier Master: Standard part supplier details, pricing
*   Vendor Master: Manufacturing vendor capabilities, ratings
*   UOM Master: Unit of measurement definitions
*   Tax Master: GST rates, HSN code mappings (Indian context)
*   Payment Terms Master: Payment term definitions
*   Expense Category Master: Two-level expense hierarchy

# 7\. Non-Functional Requirements

## 7.1 Usability Requirements

*   Desktop-first design with responsive support for tablets and mobile devices
*   Intuitive navigation with expandable/collapsible project hierarchy
*   PDF viewing capability on all devices
*   Pagination and filter ability for all tables(row listings)

## 7.2 Performance Requirements

*   Support concurrent users across all roles
*   Handle large BOM files with thousands of parts
*   Support bulk operations on multiple parts/fixtures

## 7.3 Security Requirements

*   Role-based access control with 10 distinct permission sets
*   Cost visibility restrictions based on role
*   Future: Multi-tenant data isolation

## 7.4 Browser Compatibility

*   Chrome (latest)
*   Firefox (latest)
*   Edge (latest)
*   Safari (latest)

# 8\. Implementation Approach

## 8.1 Phased Implementation

### Phase 1: Demo/MVP (Current)

*   Single organization/tenant
*   All 10 user roles implemented
*   Local filesystem storage
*   Basic email templates
*   Basic list views

### Phase 2: Production Enhancement

*   Multi-tenant architecture with database-per-tenant isolation
*   Cloud storage (AWS S3 or Azure Blob)
*   Configurable email templates
*   KPI dashboards and advanced reporting

## 8.2 Future Enhancements

*   Warranty/AMC Module for post-delivery support
*   Quotation/Estimation Module for customer inquiries
*   Approval Workflows for high-value POs and budget overruns
*   Complete Audit Trail with change tracking
*   Notification System with configurable alerts
*   External Integrations (Tally, CAD tools)

# 9\. Success Criteria

## 9.1 Business Success Metrics

*   Reduction in project tracking time by 50%
*   Elimination of manual BOM and Fixture tracking
*   Real-time visibility into project status across all roles
*   Accurate cost tracking at part level
*   Improved on-time delivery rates

## 9.2 Technical Success Metrics

*   System availability of 99.5% during business hours
*   Response time under 3 seconds for standard operations
*   Zero data loss for critical business data
*   Successful BOM upload processing rate of 99%

# 10\. Glossary

| Term | Definition |
| --- | --- |
| BOM | Bill of Materials - List of parts and components required for a fixture |
| CMM | Coordinate Measuring Machine - Precision measurement equipment for quality inspection |
| ECN | Engineering Change Note - Formal documentation of design changes |
| Fixture | Custom manufacturing tool or jig produced for a project |
| HSN | Harmonized System of Nomenclature - Standard product classification code |
| LIST OF MATERIAL | Manufactured parts section of BOM requiring external vendor production |
| PO | Purchase Order - Formal order document sent to vendors/suppliers |
| Standard Part | Off-the-shelf component purchased from suppliers |
| UOM | Unit of Measurement |

_\--- End of Document ---_