> Product baseline for Tuma. In this document **TransX = Tuma** (user, 2026-11-03).

# TRANSX
# MASTER PRODUCT DEFINITION & SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

**Product:** TransX  
**Organization:** Hudumika  
**Product Category:** Logistics & Supply Chain Management  
**Document Type:** Master Product Definition and Software Requirements Specification  
**Version:** 4.0  
**Status:** Proposed Baseline for Product Design and Engineering  
**Date:** 3 November 2026

---

# PART I — PRODUCT STRATEGY AND DEFINITION

## 1. Executive Summary

TransX is Hudumika's comprehensive Logistics and Supply Chain solution. It provides a unified digital platform for connecting, coordinating, managing and optimizing logistics and supply-chain activities across individuals, SMEs, enterprises, logistics providers, freight operators, transporters, warehouse owners, clearing companies and other supply-chain participants.

TransX is not simply a parcel-delivery application or a courier marketplace. It is the central logistics orchestration platform within the Hudumika ecosystem.

It provides capabilities for:

- Logistics marketplace and service-provider discovery.
- Shipment requests, assessments, quotations and bookings.
- Parcel and cargo transportation.
- Freight and forwarding coordination.
- Customs-clearance coordination.
- Warehousing and distribution coordination.
- Transportation and fleet operations.
- Cargo and shipment tracking.
- Waybill integration.
- Corporate logistics and supply-chain management.
- Multi-provider and multi-leg shipment coordination.
- Supply-chain visibility, reporting and intelligence.
- Financial and commercial coordination.

TransX integrates with Hudumika's specialist platforms:

| Platform | Domain responsibility |
|---|---|
| TransX | End-to-end logistics and supply-chain orchestration |
| HuduFreight | Freight management |
| ClearOS | Customs clearance and clearing-company operations |
| Track | Waybills and cargo tracking |
| SEAL | Warehouse management |
| ONDI | Identity, authentication and SSO |
| ComplyOS | KYC, KYB, compliance and verification |
| FinOps | Wallets, payments, financial ledger and settlements |
| Bliss | Support, disputes and case management |
| CRM | Shared customer and business relationship management |
| Feed | Notifications and activity distribution |
| Moovit | Routing and location intelligence, subject to available capabilities |

The architecture must allow these platforms to operate independently while sharing the information necessary to coordinate a complete logistics journey.

### 1.1 Product Vision

To build a connected logistics and supply-chain ecosystem that enables goods and cargo to move efficiently, transparently and reliably from origin to destination through an integrated network of customers, logistics providers, transporters, freight operators, warehouses, clearing companies and businesses.

### 1.2 Product Mission

To digitize and connect logistics and supply-chain operations by providing:

1. Accessible logistics services for individuals and businesses.
2. Commercial opportunities for logistics service providers.
3. Operational tools for transporters, couriers, freight operators and warehouse providers.
4. End-to-end shipment coordination and visibility.
5. Integrated specialist systems for freight, customs, tracking and warehousing.
6. Corporate supply-chain management capabilities.
7. Reliable operational and financial information for decision-making.

### 1.3 Product Positioning

**TransX — Hudumika's Logistics & Supply Chain Management Platform.**

TransX is the unified orchestration and marketplace layer connecting the demand for logistics services with the providers, facilities, systems and resources required to fulfil that demand.

---

## 2. Product Philosophy and Design Principles

### 2.1 Provider-Led Logistics

TransX must support markets where customers may not know the technical specifications required to transport their cargo.

A customer should not be forced to determine:

- Exact cargo weight.
- Exact dimensions.
- Packaging category.
- Appropriate vehicle.
- Transportation mode.
- Cargo classification.
- Special handling requirements.
- Customs requirements.
- Warehouse requirements.

Instead, customers should be able to describe what they need moved in ordinary language.

They can provide:

- Pickup location.
- Destination.
- Cargo description.
- Approximate quantity, if known.
- Photographs.
- Videos, where supported.
- Voice notes, where supported.
- Preferred collection or delivery time.
- Special instructions.
- Contact details.

Qualified providers assess the cargo and determine the appropriate operational requirements.

The system should allow providers to request additional information, arrange physical inspection and submit quotations.

### 2.2 Professional Provider Assessment

TransX should make professional logistics expertise accessible to customers.

Providers may:

- Review submitted requests.
- Request additional information.
- Conduct virtual assessments.
- Arrange physical inspections.
- Determine weight and dimensions.
- Identify packaging requirements.
- Determine suitable vehicles and transport modes.
- Identify customs or storage requirements.
- Estimate costs and delivery timelines.
- Submit quotations.

### 2.3 Multi-Provider Logistics

A shipment must not be restricted to one provider.

A shipment may involve:

- A freight forwarder.
- A clearing company.
- A warehouse operator.
- A truck owner.
- A courier company.
- An individual driver.
- A delivery agent.
- A destination collection point.

TransX must coordinate these participants without requiring them to share the same operational application or database.

### 2.4 Specialist System Ownership

TransX must not duplicate the operational responsibilities of Hudumika specialist platforms.

The ownership principle is:

- TransX owns logistics orchestration.
- HuduFreight owns its freight-management domain.
- ClearOS owns its customs-clearance domain.
- Track owns its waybill and tracking domain.
- SEAL owns its warehouse-management domain.
- FinOps owns financial records and transactions.
- ONDI owns authentication and identity services.
- Bliss owns support cases and disputes.

### 2.5 Unified Experience

Customers and corporate users should experience one coherent logistics journey, even when several independent platforms are involved.

### 2.6 Configurable Operations

TransX must support different business models, countries, cargo categories, provider types, routes and operational policies through configuration rather than extensive code changes.

### 2.7 Mobile-First Execution

Drivers, couriers, agents and operational staff must be able to execute their assigned activities using mobile devices, including limited-connectivity environments.

---

## 3. Product Scope

### 3.1 In Scope

TransX includes the following functional domains:

1. User and organization onboarding.
2. Logistics provider onboarding and profiles.
3. Logistics marketplace.
4. Shipment request management.
5. Cargo assessment.
6. Quotation management.
7. Booking and commercial coordination.
8. Courier and parcel delivery.
9. Freight and forwarding coordination.
10. Customs-clearance coordination.
11. Waybill integration.
12. Cargo tracking visibility.
13. Transportation and fleet coordination.
14. Driver and courier operations.
15. Agent and logistics hub operations.
16. Warehouse service discovery and coordination.
17. SEAL integration.
18. Corporate logistics.
19. Supply-chain coordination.
20. Shipment and consignment management.
21. Multi-leg transportation.
22. Proof of pickup and delivery.
23. Exceptions and operational incidents.
24. Financial integration with FinOps.
25. Support and dispute integration with Bliss.
26. Reporting and analytics.
27. Administration and governance.

### 3.2 Out of Scope for TransX Core

The following remain the responsibility of specialist systems unless explicitly assigned through an approved future architecture decision:

- Full freight-management execution within HuduFreight.
- Customs declarations and specialist clearance execution within ClearOS.
- Authoritative waybill creation and tracking-event management within Track.
- Warehouse inventory, bin locations and warehouse execution within SEAL.
- Authentication and identity credential management within ONDI.
- Financial ledger and settlement accounting within FinOps.
- Support ticket lifecycle and dispute-case management within Bliss.
- Full CRM relationship management within CRM.
- Specialist routing functionality not available through approved Moovit interfaces.

TransX may initiate, coordinate, reference, display and consume these services.

### 3.3 Future Scope Candidates

Subject to business validation and implementation planning:

- Procurement and supplier collaboration.
- Demand forecasting.
- Inventory planning across multiple organizations.
- Advanced distribution planning.
- Cold-chain monitoring.
- Cross-border trade coordination.
- Supply-chain risk management.
- Returns and reverse logistics.
- Manufacturing logistics.
- Product traceability.
- Advanced supply-chain optimization.
- Automated provider matching and intelligent recommendations.

These are strategic extension areas, not assumed first-release commitments.

---

# PART II — STAKEHOLDERS AND OPERATING MODEL

## 4. Stakeholders and User Categories

TransX must support different participant categories and allow an individual or organization to participate in multiple capacities.

### 4.1 Demand-Side Users

#### 4.1.1 Individual Customers

Individuals use TransX to:

- Send parcels.
- Move personal cargo.
- Request collection and delivery.
- Request local or intercity transportation.
- Request international freight services.
- Compare provider quotations.
- Track shipments.
- Receive delivery confirmations.
- Raise support requests.

#### 4.1.2 Corporate Customers

Businesses use TransX to:

- Manage organizational shipments.
- Coordinate inbound and outbound cargo.
- Manage multiple branches.
- Submit bulk shipment requests.
- Manage distribution activities.
- Manage logistics budgets.
- Allocate shipment costs to departments or cost centres.
- Approve shipment requests.
- Select preferred providers.
- Monitor logistics performance.
- Access reports and invoices.

### 4.2 Supply-Side Users

#### 4.2.1 Individual/Freelance Couriers

They can:

- Register as individual providers.
- Submit verification documents.
- Define operating areas.
- Define service categories.
- Set availability.
- Receive job offers.
- Accept or decline assignments.
- Execute collections and deliveries.
- Submit proof of delivery.
- View earnings and settlements.

#### 4.2.2 Courier Companies

They can:

- Register their business.
- Manage branches.
- Manage employees and drivers.
- Manage vehicles.
- Receive shipment requests.
- Submit quotations.
- Manage dispatch.
- Assign drivers and couriers.
- Monitor delivery performance.
- Manage customer relationships.

#### 4.2.3 Freight Forwarders

They can:

- Register as freight-service providers.
- Receive freight requests.
- Assess cargo.
- Prepare freight quotations.
- Coordinate transport arrangements.
- Coordinate clearing companies.
- Coordinate warehouses.
- Manage relevant freight workflows through HuduFreight.
- Coordinate multiple transportation legs.
- Monitor cargo movement.
- Manage customer communication.

HuduFreight remains the specialist freight-management system.

#### 4.2.4 Truck Owners and Fleet Companies

They can:

- Register vehicles and fleets.
- Register drivers.
- Define transport capacity.
- Publish transport availability.
- Receive transport requests.
- Quote for transportation.
- Accept assignments.
- Manage trips.
- Submit pickup and delivery evidence.
- Monitor vehicle utilization.
- View earnings and settlements.

#### 4.2.5 Delivery and Dispatch Agents

They can:

- Register an agent business.
- Manage collection points.
- Receive parcels and cargo.
- Record incoming cargo handovers.
- Sort and prepare dispatch batches.
- Coordinate onward transportation.
- Manage customer collections.
- Record outgoing handovers.
- Monitor custody events.

#### 4.2.6 Warehouse Owners and Operators

Warehouse owners make warehouse services and capacity available to the logistics network.

They can:

- Register or link a warehouse business.
- Publish warehouse services.
- Publish available capacity.
- Define supported cargo categories.
- Receive storage requests.
- Submit commercial offers.
- Review incoming and outgoing logistics bookings.
- Manage relationships with logistics providers.
- Monitor warehouse-related shipment movements.

Warehouse operators and staff use SEAL for warehouse execution.

Ownership and operation must be independently modelled. A warehouse owner may appoint a different organization to operate the facility.

#### 4.2.7 Clearing Companies

Clearing companies are specialist trade-service providers whose operational work is managed through ClearOS.

TransX may:

- Discover eligible clearing providers.
- Link a clearing company to a shipment.
- Initiate a clearance request.
- Reference the ClearOS clearance job.
- Display clearance milestones.
- Coordinate shipment dependencies.
- Prevent onward movement when required clearance conditions are not met.

ClearOS remains authoritative for clearance operations.

### 4.3 Internal Platform Users

- Platform super administrator.
- TransX administrator.
- Marketplace administrator.
- Provider verification officer.
- Operations controller.
- Dispatch controller.
- Finance operations viewer.
- Compliance officer.
- Customer support agent.
- Reporting and analytics user.
- Integration administrator.
- Corporate account administrator.

---

## 5. Organization and Multi-Role Model

TransX must support individuals and organizations with multiple roles.

### 5.1 Organization Capabilities

An organization may have one or more of the following capabilities:

- Customer.
- Courier company.
- Freight forwarder.
- Truck/fleet operator.
- Delivery agent.
- Warehouse owner.
- Warehouse operator.
- Clearing company.
- Logistics hub operator.
- Other approved logistics service provider.

The platform must not assume that one organization has only one business type.

### 5.2 Organization Structure

An organization may contain:

- Head office.
- Branches.
- Departments.
- Operational units.
- Warehouses or facilities.
- Employees.
- Drivers.
- Dispatchers.
- Managers.
- Finance users.
- Customer service users.

### 5.3 Organization Membership

An ONDI identity may be linked to multiple organizations.

Authorization must be evaluated using:

- User identity.
- Organization membership.
- Organization role.
- Resource ownership.
- Assigned operational responsibility.
- Permission scope.
- Branch or department restrictions.

TransX owns logistics-specific authorization and organization-scoped permissions. ONDI owns authentication and identity.

---

# PART III — HUDUMIKA ECOSYSTEM ARCHITECTURE

## 6. Overall Architecture

TransX is the logistics orchestration platform within Hudumika.

The architecture comprises three layers:

### 6.1 TransX Core

Owns:

- Logistics marketplace.
- Shipment requests.
- Assessments.
- Quotations.
- Bookings.
- Assignments.
- Trips.
- Consignments.
- Logistics service coordination.
- Provider relationships within logistics.
- Operational shipment lifecycle.
- Corporate logistics workflows.
- Unified shipment visibility.
- Logistics-specific reporting.

### 6.2 Specialist Domain Platforms

| Platform | Authoritative domain |
|---|---|
| HuduFreight | Freight management |
| ClearOS | Customs clearance |
| Track | Waybills and cargo tracking |
| SEAL | Warehouse management |

### 6.3 Shared Hudumika Services

| Platform | Responsibility |
|---|---|
| ONDI | Identity, authentication and SSO |
| ComplyOS | KYC, KYB, compliance and verification |
| FinOps | Wallets, payments, ledger and settlements |
| Bliss | Support and dispute management |
| CRM | Customer and business relationships |
| Feed | Notifications and activity |
| Moovit | Routing and location intelligence, subject to supported APIs |

---

## 7. Integration Specifications

### 7.1 ONDI — Identity and Authentication

ONDI is authoritative for:

- User identity.
- Authentication.
- Sessions.
- Token issuance.
- Token validation.
- SSO.
- Identity lifecycle.

TransX is responsible for:

- Logistics user profiles.
- Provider profiles.
- Organization memberships.
- Logistics roles.
- Logistics permissions.
- Operational access restrictions.

Requirements:

- All protected TransX interfaces must validate identity through approved ONDI mechanisms.
- TransX must support organization switching where users belong to multiple organizations.
- Access tokens must not be treated as substitutes for TransX resource-level authorization.
- User deactivation and relevant identity changes must be reflected in TransX access decisions.

### 7.2 ComplyOS — Compliance and Verification

ComplyOS provides compliance and verification services.

TransX must support:

- Individual verification references.
- Business verification references.
- Provider compliance status.
- Document verification status.
- Document expiry references.
- Compliance review outcomes.
- Risk-related restrictions where provided.
- Country-specific eligibility rules.

TransX must enforce configurable eligibility rules before allowing restricted activities.

Examples:

- A provider may browse opportunities before verification but cannot accept regulated or restricted assignments.
- A clearing company may require additional business verification.
- A vehicle may require relevant documentation before being eligible for assignments.

TransX must not independently override authoritative ComplyOS decisions.

### 7.3 HuduFreight — Freight Management

HuduFreight is the specialist freight-management platform.

TransX must provide a connected experience for customers and freight providers.

Target integration capabilities:

- Link TransX shipment requests to HuduFreight freight records.
- Link TransX bookings to freight-management records.
- Initiate or reference freight-management workflows.
- Exchange agreed cargo and shipment details.
- Receive relevant freight milestones.
- Display freight status in TransX.
- Link freight records to consignments and transport legs.
- Reconcile freight completion with overall shipment completion.

Proposed integration references:

- HuduFreight customer reference.
- Freight operation reference.
- Freight job reference.
- Freight quotation reference, if applicable.
- Freight consignment reference.
- Freight leg reference.
- Freight document references.

**Important ownership decision:** TransX owns marketplace quotations and bookings created within TransX. HuduFreight owns its specialist freight-management records. If HuduFreight also supports quotations and bookings, the systems must agree which commercial transaction is authoritative in each use case. The same quotation or booking must not be independently created as two conflicting authoritative records.

The precise HuduFreight modules, APIs, event names and existing data model must be reviewed before finalizing the adapter.

### 7.4 ClearOS — Customs Clearance

ClearOS owns customs-clearance operations and clearing-company workflows.

TransX must support:

- Identifying clearance requirements.
- Discovering or selecting clearing providers.
- Creating a clearance coordination request.
- Linking shipments to ClearOS clearance jobs.
- Displaying clearance status.
- Displaying relevant clearance milestones.
- Linking clearance documents and references.
- Receiving clearance exceptions.
- Recording clearance completion.
- Applying configurable movement restrictions where required.

Proposed TransX references:

- Clearing company reference.
- ClearOS clearance job reference.
- Declaration reference, if supplied.
- Clearance document references.
- Inspection reference.
- Customs release reference.
- Clearance completion timestamp.

Proposed event concepts:

- `clearance.requested`
- `clearance.accepted`
- `clearance.documents_required`
- `clearance.submitted`
- `clearance.inspection_required`
- `clearance.exception`
- `clearance.released`
- `clearance.completed`

These are proposed integration event names, not claims about current ClearOS event contracts.

TransX must not create duplicate customs declaration records or attempt to replace ClearOS operational processes.

### 7.5 Track — Waybills and Cargo Tracking

Track is authoritative for waybills and its cargo-tracking records and events.

TransX must support:

- Requesting or initiating waybill creation through approved Track interfaces.
- Linking waybills to shipments.
- Linking waybills to bookings, consignments and transportation legs.
- Displaying tracking identifiers.
- Retrieving tracking history.
- Displaying current tracking status.
- Displaying relevant carrier events.
- Linking multiple waybills to one shipment.
- Linking one waybill to multiple cargo units where Track supports that model.
- Supporting multiple carriers and transportation legs.

**Shipment and waybill are different entities.**

One TransX shipment may have:

- One waybill.
- Multiple waybills.
- Different waybills for different transportation legs.
- Separate waybills for different carriers.
- Different waybills for split consignments.

TransX must not assume a one-to-one relationship.

Proposed event concepts:

- `waybill.created`
- `waybill.updated`
- `tracking.event.received`
- `tracking.status.changed`
- `tracking.exception.reported`
- `tracking.delivery.confirmed`

Track remains authoritative for waybill and tracking records. TransX maintains a logistics-level event timeline that may combine Track events with TransX, SEAL and ClearOS milestones.

### 7.6 SEAL — Warehouse Management

SEAL owns warehouse operations.

TransX owns the logistics coordination and commercial relationship associated with warehouse services.

TransX must support:

- Warehouse discovery.
- Warehouse service listings.
- Storage requests.
- Warehouse capacity inquiries.
- Reservation coordination.
- Inbound shipment coordination.
- Cargo admission references.
- Warehouse custody references.
- Storage status visibility.
- Release requests.
- Outbound dispatch coordination.
- Warehouse-related exception handling.
- Storage service commercial references.

SEAL owns, subject to its implemented capabilities:

- Warehouse inventory.
- Storage locations.
- Bins and zones.
- Receiving.
- Admission records.
- Stock movements.
- Picking.
- Packing.
- Warehouse dispatch.
- Detailed warehouse execution.

TransX must not reproduce these operational functions.

Proposed integration commands:

- `warehouse.capacity.requested`
- `warehouse.reservation.requested`
- `warehouse.inbound.expected`
- `warehouse.release.requested`
- `warehouse.dispatch.requested`
- `warehouse.reservation.cancelled`

Proposed events:

- `warehouse.capacity.updated`
- `warehouse.reservation.confirmed`
- `warehouse.reservation.rejected`
- `warehouse.cargo.received`
- `warehouse.inspection.completed`
- `warehouse.cargo.stored`
- `warehouse.cargo.moved`
- `warehouse.release.approved`
- `warehouse.cargo.picked`
- `warehouse.cargo.dispatched`
- `warehouse.cargo.exception`
- `warehouse.storage.completed`

Actual API operations and event names must be agreed with SEAL.

### 7.7 FinOps — Financial Operations

FinOps is the financial system of record.

TransX owns logistics-specific commercial rules, including:

- Logistics pricing models.
- Provider quotations.
- Platform commissions.
- Service charges.
- Agreed customer charges.
- Cancellation rules.
- Logistics-related charge breakdowns.
- Commercial calculations before posting.

FinOps owns:

- Wallet balances.
- Payment transactions.
- Ledger entries.
- Payment allocation.
- Refund transactions.
- Provider earnings balances.
- Settlement execution.
- Financial reconciliation.
- Accounting records.

Requirements:

- TransX must never directly modify authoritative wallet balances.
- Payment confirmation must be obtained from FinOps.
- Booking payment conditions must be configurable.
- Provider earnings must be reconciled with completed services and applicable financial rules.
- Financial operations must be idempotent.
- Refunds and reversals must reference original financial transactions.

### 7.8 Bliss — Support and Disputes

Bliss owns support cases and dispute workflows.

TransX must:

- Create support cases linked to shipments, bookings, assignments and providers.
- Supply relevant logistics references.
- Display case status.
- Receive relevant resolution milestones.
- Display escalation status.
- Respect Bliss ownership of case lifecycle.

TransX owns logistics operational states. Bliss must not independently alter shipment, assignment or trip state.

### 7.9 CRM — Customer Relationships

CRM owns shared customer and business relationship records.

TransX owns logistics-specific operational records and references the appropriate CRM entities.

### 7.10 Feed — Notifications and Activity

TransX publishes business events to Feed.

Feed distributes notifications and activities according to its capabilities and user preferences.

TransX must not duplicate Feed's notification-distribution responsibility.

### 7.11 Moovit — Routing and Location Intelligence

Moovit may support:

- Distance estimates.
- Route estimates.
- Journey duration.
- Location intelligence.
- Route optimization.
- Geospatial assistance.

The actual available API and licensing must be validated.

TransX must use an adapter so that routing services can be changed or extended without redesigning the shipment domain.

---

# PART IV — TRANSX FUNCTIONAL REQUIREMENTS

## 8. User Onboarding and Profiles

### 8.1 Individual Onboarding

Users authenticate through ONDI.

TransX collects logistics-specific profile information:

- Display name.
- Contact information.
- Preferred communication channels.
- Default pickup information, where applicable.
- Service preferences.
- Customer or provider role.
- Relevant verification references.

### 8.2 Organization Onboarding

Organizations must provide:

- Legal/business name.
- Registration details where applicable.
- Country.
- Business category.
- Contact information.
- Address.
- Authorized representatives.
- Branch information.
- Service capabilities.
- Compliance references.

### 8.3 Provider Onboarding

Providers must provide:

- Provider type.
- Business or individual profile.
- Service categories.
- Operating locations.
- Service coverage.
- Availability.
- Capacity information.
- Pricing preferences.
- Relevant licences and documents.
- Compliance references.
- Payment/settlement configuration references.

### 8.4 Provider Eligibility

Eligibility must be configurable by:

- Country.
- Provider type.
- Cargo category.
- Service type.
- Transportation mode.
- Regulatory requirement.
- Compliance status.
- Document validity.
- Operational capability.

### 8.5 Multiple Provider Capabilities

An organization must be able to register multiple provider capabilities under one organization profile.

For example, one organization may operate:

- A freight-forwarding business.
- A fleet of trucks.
- A warehouse.
- A delivery-agent network.

The organization should not need multiple unrelated business accounts.

---

## 9. Logistics Marketplace

The marketplace connects customers and businesses with suitable logistics service providers.

### 9.1 Provider Categories

- Individual couriers.
- Courier companies.
- Freight forwarders.
- Truck owners.
- Fleet operators.
- Delivery agents.
- Dispatch companies.
- Warehouse owners.
- Warehouse operators.
- Clearing companies.
- Other approved logistics providers.

### 9.2 Provider Listings

Provider listings should contain:

- Provider identity.
- Provider category.
- Services.
- Operating regions.
- Service coverage.
- Cargo categories.
- Capacity.
- Availability.
- Operating hours.
- Service restrictions.
- Verification status.
- Relevant service ratings.
- Commercial information where published.

### 9.3 Search and Discovery

Customers and authorized users should be able to search using:

- Origin.
- Destination.
- Service type.
- Provider type.
- Cargo category.
- Delivery timeframe.
- Capacity.
- Service availability.
- Provider rating, where applicable.

### 9.4 Matching

TransX should support:

- Rule-based matching.
- Manual provider selection.
- Automated provider recommendations.
- Provider invitation.
- Targeted request distribution.
- Provider eligibility filtering.

Matching factors may include:

- Route compatibility.
- Service capability.
- Cargo compatibility.
- Available capacity.
- Provider availability.
- Compliance eligibility.
- Historical performance.
- Customer preferences.
- Commercial constraints.

Matching recommendations must not override eligibility restrictions.

---

## 10. Shipment Request Management

### 10.1 Purpose

A Shipment Request is the original customer request to move cargo.

It is not yet a confirmed booking or verified cargo assessment.

### 10.2 Request Fields

Required fields should include:

- Requester.
- Pickup location.
- Destination.
- Cargo description.
- Contact details.
- Service intent or requested outcome.

Optional fields:

- Cargo photographs.
- Video attachments.
- Voice notes.
- Approximate quantity.
- Approximate weight.
- Approximate dimensions.
- Preferred pickup date.
- Preferred delivery date.
- Special instructions.
- Declared cargo value.
- Cargo category.
- Handling requirements.
- Preferred providers.

The system must not require technical cargo specifications when the customer does not know them.

### 10.3 Request Types

- Parcel delivery.
- Cargo transportation.
- Local delivery.
- Intercity delivery.
- Domestic freight.
- International freight.
- Import cargo movement.
- Export cargo movement.
- Warehouse-assisted movement.
- Distribution request.
- Bulk shipment request.
- Reverse logistics request.

### 10.4 Request Lifecycle

Proposed states:

- Draft.
- Submitted.
- Under Review.
- Published to Providers.
- Provider Response Received.
- Assessment Required.
- Quotation Available.
- Accepted.
- Converted to Booking.
- Cancelled.
- Expired.
- Rejected.

The implementation must define permitted transitions and audit all changes.

---

## 11. Cargo Assessment

### 11.1 Purpose

Cargo assessment converts an incomplete customer description into verified operational information.

### 11.2 Assessment Methods

- Remote assessment.
- Photo/video assessment.
- Physical inspection.
- Provider-estimated assessment.
- Customer-supplied technical assessment.
- Corporate preconfigured cargo profile.

### 11.3 Assessment Information

- Cargo category.
- Package count.
- Weight.
- Dimensions.
- Volume.
- Packaging condition.
- Fragility.
- Hazard classification, where relevant.
- Handling requirements.
- Temperature requirements, where relevant.
- Loading requirements.
- Vehicle requirements.
- Transportation mode.
- Insurance requirements.
- Clearance requirements.
- Storage requirements.
- Supporting evidence.

### 11.4 Assessment Ownership

The provider performing the assessment is responsible for the submitted assessment, subject to the applicable platform rules.

TransX must preserve assessment history and revisions.

---

## 12. Quotation Management

### 12.1 Quotation Sources

Quotations may originate from:

- Courier providers.
- Courier companies.
- Freight forwarders.
- Truck owners.
- Delivery agents.
- Warehouse providers.
- Other authorized logistics providers.

### 12.2 Quotation Structure

A quotation should support:

- Provider.
- Service offered.
- Cargo assessment reference.
- Origin and destination.
- Estimated delivery time.
- Price.
- Currency.
- Tax treatment.
- Additional charges.
- Storage charges.
- Clearance charges.
- Insurance charges.
- Handling charges.
- Pickup charges.
- Delivery charges.
- Exclusions.
- Assumptions.
- Validity period.
- Payment conditions.
- Cancellation terms.

### 12.3 Quotation Types

- Fixed quotation.
- Estimated quotation.
- Provisional quotation.
- Itemized quotation.
- Multi-service quotation.
- Multi-leg quotation.
- Revised quotation.

### 12.4 Customer Comparison

Customers should be able to compare:

- Provider.
- Service description.
- Price.
- Estimated delivery time.
- Included services.
- Exclusions.
- Relevant ratings.
- Provider verification status.

The platform must clearly distinguish provisional estimates from final offers.

### 12.5 Quotation Lifecycle

- Draft.
- Submitted.
- Under Review.
- Revised.
- Accepted.
- Rejected.
- Expired.
- Withdrawn.

---

## 13. Booking Management

A Booking represents the accepted commercial arrangement between the customer and the relevant service provider or providers.

### 13.1 Booking Creation

A booking may be created when:

- The customer accepts a quotation.
- Required approvals are complete.
- Applicable compliance conditions are satisfied.
- Required payment conditions are met or explicitly deferred under configured terms.

### 13.2 Booking Information

- Booking reference.
- Customer.
- Provider or providers.
- Accepted quotation.
- Shipment reference.
- Service scope.
- Agreed price.
- Payment terms.
- Expected milestones.
- Service-level commitments.
- Cancellation terms.
- Relevant external references.

### 13.3 Booking Types

- Single-provider booking.
- Multi-provider booking.
- Transportation booking.
- Freight booking.
- Warehouse service booking.
- Clearance coordination booking.
- Distribution booking.
- Corporate bulk booking.

### 13.4 Booking Lifecycle

- Pending Confirmation.
- Confirmed.
- Awaiting Payment.
- Ready for Execution.
- In Progress.
- Completed.
- Cancelled.
- Disputed.
- Closed.

A booking must not be marked paid or financially settled based solely on a client-side action.

---

## 14. Transportation and Fleet Management

### 14.1 Vehicle Management

The system must support:

- Vehicle registration.
- Vehicle category.
- Registration number.
- Capacity.
- Cargo compatibility.
- Operating region.
- Availability.
- Insurance references.
- Relevant licences.
- Compliance references.
- Vehicle ownership.
- Fleet association.

### 14.2 Driver Management

- Driver profile.
- Organization membership.
- Verification references.
- Licence information.
- Assigned vehicles.
- Availability.
- Performance.
- Assignment history.

### 14.3 Transportation Modes

TransX should be extensible to support:

- Road.
- Air.
- Sea.
- Rail.
- Multimodal transportation.

Available modes must be configurable according to actual provider capabilities and routes.

### 14.4 Trip Management

A Trip represents an actual transportation journey.

It should contain:

- Trip reference.
- Assignment or assignments.
- Vehicle.
- Driver.
- Origin.
- Destination.
- Planned route.
- Actual route, where available.
- Planned departure.
- Actual departure.
- Estimated arrival.
- Actual arrival.
- Cargo references.
- Trip events.
- Evidence.
- Exceptions.

### 14.5 Fleet Operations

Authorized fleet operators must be able to:

- Manage vehicles.
- Assign drivers.
- Review vehicle availability.
- Receive transportation jobs.
- Plan trips.
- Monitor execution.
- Review completed trips.
- Access operational performance.

---

## 15. Driver and Courier Application

The driver/courier experience is a first-class part of TransX.

A unified mobile application should provide role-based experiences for customers, providers, drivers, agents and other participants.

### 15.1 Driver Dashboard

Display:

- Availability status.
- New job offers.
- Accepted jobs.
- Active assignments.
- Upcoming trips.
- Completed jobs.
- Earnings summary.
- Performance indicators.
- Support access.

### 15.2 Job Discovery

Drivers and couriers may:

- View eligible jobs.
- Review pickup and destination information.
- Review cargo summaries.
- Review required vehicle or handling conditions.
- Review estimated earnings where available.
- Accept or decline offers.

### 15.3 Atomic Assignment Acceptance

The server must prevent two drivers from accepting the same exclusive assignment.

The acceptance process must:

1. Validate assignment eligibility.
2. Validate driver availability.
3. Validate provider authorization.
4. Validate assignment status.
5. Atomically reserve the assignment.
6. Return the confirmed result.

### 15.4 Pickup Execution

The driver must be able to:

- View pickup instructions.
- Navigate to pickup.
- Confirm arrival.
- Record pickup.
- Capture photographs.
- Capture signatures where required.
- Record package count.
- Record exceptions.
- Confirm custody transfer.

### 15.5 Delivery Execution

The driver must be able to:

- View delivery instructions.
- Navigate to destination.
- Confirm arrival.
- Capture recipient details.
- Capture delivery evidence.
- Capture signature where required.
- Record unsuccessful delivery.
- Record delivery exceptions.

### 15.6 Earnings

Drivers may view:

- Completed jobs.
- Pending earnings.
- Confirmed earnings.
- Settlement status.
- Payment history.

FinOps remains authoritative for balances and financial transactions.

### 15.7 Offline Support

The application should support controlled offline capture of operational evidence.

Offline evidence must be:

- Timestamped.
- Associated with the correct assignment.
- Stored securely on the device.
- Queued for synchronization.
- Submitted to the server when connectivity returns.

Offline evidence must not become authoritative until server validation and acceptance.

### 15.8 Safety and Privacy

- Location sharing must be restricted to legitimate operational purposes.
- Location collection must respect applicable consent, privacy and retention rules.
- Drivers must not access unrelated customer information.
- Evidence must be access-controlled.
- Sensitive customer details must be minimized.

---

## 16. Courier Company Operations

Courier companies must be able to manage their internal logistics operations.

Capabilities:

- Company profile.
- Branch management.
- Staff management.
- Driver management.
- Vehicle management.
- Service coverage.
- Service availability.
- Shipment request management.
- Cargo assessment.
- Quotations.
- Bookings.
- Dispatch.
- Assignment.
- Delivery monitoring.
- Failed delivery handling.
- Customer communication.
- Performance reports.

A courier company may allocate jobs to employees or approved subcontractors according to configured policies.

---

## 17. Freight and Forwarding Coordination

### 17.1 Purpose

TransX connects customers and freight forwarders and coordinates freight-related shipment journeys.

### 17.2 Freight Request

Customers must be able to request:

- Import freight.
- Export freight.
- Domestic freight.
- International freight.
- Consolidated cargo.
- Full-container or less-than-container arrangements, where supported.
- Air freight.
- Sea freight.
- Road freight.
- Multimodal freight.

### 17.3 Freight Provider Workflow

1. Receive freight request.
2. Review cargo description.
3. Request additional details.
4. Assess cargo.
5. Prepare or coordinate a quotation.
6. Link specialist freight records in HuduFreight.
7. Coordinate required clearance.
8. Coordinate warehouse requirements.
9. Coordinate transport providers.
10. Monitor freight milestones.
11. Coordinate final delivery.

### 17.4 HuduFreight Integration

TransX must provide reference-based connectivity to HuduFreight.

Freight-management records must remain authoritative in HuduFreight.

The exact split of quotation, booking, consignment and operational records must be agreed after reviewing HuduFreight's existing data model.

---

## 18. Customs and Clearing Coordination

### 18.1 Purpose

TransX coordinates customs-clearance dependencies within the shipment journey.

### 18.2 Capabilities

- Identify clearance requirements.
- Discover eligible clearing companies.
- Assign or select a clearing provider.
- Initiate a ClearOS clearance request.
- Link the clearance case to shipment and consignment records.
- Display clearance progress.
- Display missing-document requests where supplied.
- Display inspection and exception milestones.
- Record clearance completion references.
- Apply configurable movement restrictions.

### 18.3 Clearance Dependency

Where clearance is a required prerequisite, TransX must prevent the affected transportation leg from being released until the relevant clearance condition is satisfied or an authorized exception is recorded.

TransX must not independently determine legal customs release.

ClearOS provides the authoritative clearance result.

---

## 19. Waybills and Cargo Tracking

### 19.1 Track Integration

Track owns waybill and cargo-tracking records.

TransX provides the unified logistics journey view.

### 19.2 Waybill Relationships

A TransX shipment may link to multiple waybills.

A waybill may be associated with a transportation leg or a defined group of cargo units, according to Track's model.

### 19.3 Tracking Timeline

The TransX timeline may combine:

- Shipment request submitted.
- Assessment completed.
- Booking confirmed.
- Pickup scheduled.
- Cargo collected.
- Waybill issued.
- Departed origin.
- Arrived at transit facility.
- Customs clearance started.
- Customs released.
- Received at warehouse.
- Stored.
- Released from warehouse.
- Loaded.
- Departed transit facility.
- Arrived at destination.
- Out for delivery.
- Delivered.
- Delivery exception.

These milestones may originate from different systems.

### 19.4 Event Provenance

Every displayed milestone must retain:

- Source system.
- Source event reference.
- Source timestamp.
- Received timestamp.
- Event type.
- Related shipment.
- Related cargo or package.
- Related location.
- Verification or processing status.

TransX must distinguish:

- Event time: when the activity occurred.
- Received time: when TransX received the event.
- Processed time: when TransX successfully processed it.

### 19.5 Tracking Privacy

Customers may see customer-authorized tracking information.

Providers should only see information relevant to their assigned operations.

Sensitive internal operational events must not automatically become customer-visible.

---

## 20. Warehousing and Distribution Coordination

### 20.1 Warehouse Marketplace

TransX must allow warehouse providers to publish warehouse services.

Proposed service categories:

- Temporary storage.
- Long-term storage.
- Transit warehousing.
- Cargo consolidation.
- Cross-docking.
- Distribution warehousing.
- Bulk cargo storage.
- Container storage.
- Cold storage.
- Fulfilment services, where supported.

The availability of each service must be validated against the warehouse's actual operational capabilities.

### 20.2 Warehouse Listing

A listing may include:

- Warehouse name.
- Owner.
- Operator.
- Location.
- Facility type.
- Services.
- Capacity.
- Available capacity.
- Cargo categories accepted.
- Handling capabilities.
- Operating hours.
- Security information.
- Insurance information, where applicable.
- Compliance references.
- Pricing model.
- Availability.

### 20.3 Warehouse Owner Experience

Warehouse owners must be able to:

- Register or link facilities.
- Publish warehouse services.
- Publish capacity information.
- Manage commercial offers.
- Receive storage requests.
- Review bookings.
- Manage provider relationships.
- Review incoming and outgoing logistics movements.

### 20.4 Warehouse Operator Experience

The operator uses SEAL to manage the warehouse's actual operational activities.

TransX must link the relevant SEAL references and display permitted operational milestones.

### 20.5 Warehouse Coordination Records

TransX may maintain:

- Warehouse Provider Reference.
- Warehouse Listing Reference.
- Storage Service Request.
- Warehouse Reservation Reference.
- Storage Booking.
- Warehouse Admission Reference.
- Warehouse Custody Reference.
- Warehouse Release Request.
- Warehouse Handover Reference.

SEAL owns actual warehouse inventory and execution records.

### 20.6 Shipment Versus Inventory

A shipment is not warehouse inventory.

Example:

A shipment contains 200 boxes and arrives at a warehouse.

SEAL may record:

- Admission of the cargo.
- Inspection results.
- Inventory units.
- Storage locations.
- Internal movements.
- Picking.
- Partial release.
- Final dispatch.

TransX records the logistics-level custody and coordination references.

A shipment may remain partially stored while another portion is released for transportation.

The model must support partial quantities, partial releases and reconciliation.

### 20.7 Warehouse, Agent and Hub Distinction

These are different operational capabilities:

**Delivery Agent / Collection Point**
- Receives or hands over cargo.
- May hold cargo temporarily.
- Supports collection and dispatch.

**Warehouse**
- Provides structured storage.
- Maintains warehouse inventory and custody operations through SEAL.

**Logistics Hub**
- Acts as a network transfer point between routes, providers or transportation legs.

One physical facility may perform multiple capabilities, but TransX must model the capabilities separately.

---

## 21. Agent and Logistics Hub Management

Agents and hubs support the logistics network.

### 21.1 Agent Capabilities

- Receive incoming cargo.
- Inspect and count packages.
- Record custody handover.
- Sort cargo.
- Prepare dispatch batches.
- Hand cargo to drivers.
- Receive customer collections.
- Record failed collections.
- Record outgoing cargo.

### 21.2 Hub Capabilities

- Manage incoming transportation legs.
- Manage outgoing transportation legs.
- Coordinate transfers.
- Consolidate shipments.
- Coordinate dispatch batches.
- Record operational exceptions.
- Provide transfer visibility.

### 21.3 Handover Evidence

A handover must capture:

- Sender.
- Recipient.
- Cargo reference.
- Quantity.
- Location.
- Timestamp.
- Evidence.
- Exceptions.
- Responsible organization or user.

---

## 22. Corporate Logistics and Supply Chain Management

Corporate logistics must be a first-class TransX capability.

### 22.1 Corporate Account Structure

Support:

- Organization.
- Head office.
- Branches.
- Departments.
- Employees.
- Cost centres.
- Authorized approvers.
- Procurement/logistics officers.
- Finance users.
- Operational users.

### 22.2 Corporate Shipment Management

Corporates must be able to:

- Create shipment requests.
- Submit multiple shipments.
- Upload bulk shipment files.
- Manage recurring logistics requirements.
- Track shipments centrally.
- Review service-provider performance.
- Manage preferred providers.
- Manage approved service categories.
- Monitor shipment costs.
- Download reports.

### 22.3 Approval Workflows

Support configurable approval policies based on:

- Shipment value.
- Service category.
- Department.
- Branch.
- Cost centre.
- Provider.
- Budget availability.
- Organizational policy.

Approval stages may include:

- Requester.
- Department manager.
- Logistics manager.
- Procurement.
- Finance.
- Final approver.

### 22.4 Corporate Billing

Support configurable commercial arrangements:

- Prepaid.
- Wallet-funded.
- Pay-per-shipment.
- Corporate invoicing, where supported.
- Contractual rates.
- Approved credit terms, subject to finance policy.

FinOps owns financial balances and transactions.

### 22.5 Corporate Reporting

- Shipment volumes.
- Logistics expenditure.
- Provider performance.
- Delivery performance.
- Branch expenditure.
- Cost-centre expenditure.
- Route performance.
- Failed deliveries.
- Transit times.
- Warehouse usage.
- Freight costs.
- Clearance-related costs where supplied.
- Exception frequency.

### 22.6 HRx Integration Consideration

Where HRx provides authorized employee and organizational information, TransX may consume relevant employee references for corporate user provisioning, approvals and organizational assignments.

The integration must be validated before implementation.

---

## 23. Supply Chain Coordination

TransX must support broader supply-chain workflows beyond individual deliveries.

### 23.1 Supply-Chain Network

The system should represent relationships among:

- Customers.
- Suppliers.
- Freight forwarders.
- Clearing companies.
- Transport providers.
- Warehouses.
- Distribution centres.
- Agents.
- Retailers.
- Final recipients.
- Other logistics partners.

### 23.2 Supply-Chain Movement

The system must support movement planning across multiple stages.

Example:

Supplier → Origin Warehouse → Clearing Company → Port/Transit Facility → Destination Warehouse → Distribution Centre → Retailer → Final Customer.

The number and type of stages must be configurable.

### 23.3 Multi-Stage Operations

A supply-chain operation may involve:

- Multiple shipments.
- Multiple consignments.
- Multiple providers.
- Multiple warehouse facilities.
- Multiple transportation legs.
- Multiple waybills.
- Multiple clearance cases.
- Partial cargo movements.
- Partial deliveries.

### 23.4 Supply-Chain Visibility

Corporate users should have a consolidated view of relevant logistics activity across authorized shipments and facilities.

### 23.5 Future Supply-Chain Planning

Potential future capabilities:

- Supplier shipment planning.
- Replenishment coordination.
- Distribution planning.
- Inventory movement planning.
- Demand forecasting.
- Route and network optimization.
- Supply-chain risk indicators.

These capabilities require separate detailed business requirements before implementation.

---

## 24. Shipment, Consignment and Cargo Management

### 24.1 Shipment

A Shipment represents a customer-facing logistics movement request and its resulting execution context.

### 24.2 Cargo Unit

A Cargo Unit represents a package, item, pallet, container or other physical logistics unit being moved.

### 24.3 Consignment

A Consignment represents a coordinated cargo-forwarding arrangement.

A consignment may include multiple shipments and transportation legs.

### 24.4 Transportation Leg

A Transportation Leg represents one stage of movement between locations.

It may have:

- Origin.
- Destination.
- Mode.
- Provider.
- Carrier.
- Vehicle or transport reference.
- Driver.
- Planned schedule.
- Actual execution.
- Associated waybill references.

### 24.5 Assignment

An Assignment represents an operational job allocated to a provider, driver, vehicle or agent.

### 24.6 Trip

A Trip represents an actual transportation journey.

### 24.7 Shipment Event

A Shipment Event is an immutable record of a logistics milestone or operational event.

### 24.8 Entity Separation

The system must not collapse these records:

- Shipment Request.
- Shipment Assessment.
- Quotation.
- Booking.
- Cargo Unit.
- Consignment.
- Transportation Leg.
- Assignment.
- Trip.
- Waybill Reference.
- Clearance Reference.
- Warehouse Reservation Reference.
- Shipment Event.

A single shipment may have multiple assessments, quotations, assignments, trips, legs, waybills and external operational references.

---

# PART V — OPERATIONAL WORKFLOWS

## 25. Standard Customer Shipment Workflow

1. Customer authenticates through ONDI.
2. Customer submits a shipment request.
3. TransX validates required information.
4. TransX identifies suitable providers.
5. Providers receive the request.
6. Providers review and assess cargo.
7. Providers request additional information or inspection if necessary.
8. Providers submit quotations.
9. Customer compares quotations.
10. Customer accepts a quotation.
11. TransX creates a booking.
12. Required approvals and payment conditions are checked.
13. TransX coordinates assignments.
14. Provider collects cargo.
15. Relevant waybill is linked through Track.
16. Shipment is transported.
17. Warehouse or clearance milestones are incorporated where applicable.
18. Final delivery is executed.
19. Proof of delivery is recorded.
20. Shipment is completed.
21. FinOps processes applicable settlement.
22. Feed distributes notifications.
23. Bliss handles any support case or dispute.

## 26. Freight Shipment Workflow

1. Customer submits freight request.
2. Freight provider reviews the request.
3. Cargo is assessed.
4. Freight quotation is prepared.
5. Relevant freight operation is linked in HuduFreight.
6. Clearance requirements are identified.
7. ClearOS clearance job is initiated where necessary.
8. Relevant waybills are linked through Track.
9. Storage is coordinated through SEAL where required.
10. Transportation providers are assigned.
11. Shipment legs are executed.
12. Tracking milestones are received.
13. Final delivery is recorded.
14. Financial reconciliation is completed through FinOps.

## 27. Warehouse-Assisted Shipment Workflow

1. Customer or freight provider requests storage.
2. TransX discovers suitable warehouse services.
3. TransX requests capacity or reservation information from SEAL.
4. SEAL responds with available capacity or reservation result.
5. TransX records the commercial and coordination references.
6. Cargo is transported to the facility.
7. SEAL records receiving and admission.
8. TransX receives relevant admission references.
9. SEAL manages storage and warehouse operations.
10. Customer or provider requests release.
11. TransX initiates the release request.
12. SEAL approves and prepares release.
13. SEAL records picking and dispatch.
14. TransX coordinates the outbound assignment.
15. Cargo is collected.
16. The next transportation leg begins.

## 28. Customs-Clearance Workflow

1. Shipment is identified as requiring clearance.
2. TransX identifies eligible clearing providers.
3. Customer or freight provider selects a clearing company.
4. TransX initiates the clearance coordination request.
5. ClearOS creates or references the clearance job.
6. Clearing company performs its work in ClearOS.
7. TransX receives status updates.
8. Additional information or documents are requested where necessary.
9. Inspection or exception milestones are communicated.
10. ClearOS supplies the applicable release/completion result.
11. TransX evaluates the configured movement dependency.
12. The next eligible logistics operation is released.

## 29. Corporate Bulk Shipment Workflow

1. Corporate user submits a bulk shipment request.
2. TransX validates the uploaded records.
3. Invalid records are reported.
4. Approval rules are evaluated.
5. Authorized approvers approve or reject the requests.
6. Approved requests enter the normal shipment workflow.
7. Providers submit quotations or fulfil pre-agreed rates.
8. Bookings are created.
9. Shipments are assigned and executed.
10. Corporate users monitor the consolidated shipment dashboard.
11. FinOps handles financial operations.
12. Corporate reports are generated.

## 30. Multi-Provider Shipment Workflow

A shipment may move between providers.

Example:

1. Courier collects cargo.
2. Cargo is handed to a logistics hub.
3. Freight provider takes custody.
4. Cargo is received by a warehouse.
5. Clearing company completes clearance.
6. Truck operator transports cargo to destination.
7. Destination agent receives cargo.
8. Final courier completes delivery.

Each handover must create an auditable custody milestone.

The shipment may remain in progress while individual assignments and trips are completed.

---

# PART VI — DOMAIN MODEL AND DATA ARCHITECTURE

## 31. Proposed Core Domain Entities

### 31.1 Identity and Organization

- User Reference.
- Organization.
- Organization Membership.
- Organization Branch.
- Department.
- Role.
- Permission.
- Provider Profile.
- Provider Capability.
- Compliance Reference.

### 31.2 Marketplace

- Service Listing.
- Provider Availability.
- Service Coverage.
- Service Category.
- Provider Match.
- Provider Invitation.

### 31.3 Shipment

- Shipment Request.
- Shipment.
- Shipment Assessment.
- Cargo Unit.
- Cargo Category.
- Cargo Attachment.
- Cargo Handling Requirement.
- Shipment Instruction.

### 31.4 Commercial

- Quotation.
- Quotation Item.
- Quotation Revision.
- Booking.
- Booking Service.
- Commercial Agreement Reference.
- Cancellation Record.

### 31.5 Transportation

- Transportation Leg.
- Assignment.
- Trip.
- Vehicle.
- Fleet.
- Driver Reference.
- Route.
- Dispatch Batch.
- Handover.
- Proof of Pickup.
- Proof of Delivery.

### 31.6 Freight and Customs References

- Freight Operation Reference.
- Freight Job Reference.
- Freight Consignment Reference.
- Clearing Company Reference.
- Clearance Job Reference.
- Customs Document Reference.
- Customs Release Reference.

### 31.7 Warehouse References

- Warehouse Provider Reference.
- Warehouse Listing.
- Storage Service Request.
- Warehouse Reservation Reference.
- Storage Booking.
- Warehouse Admission Reference.
- Warehouse Custody Reference.
- Warehouse Release Request.
- Warehouse Handover Reference.

### 31.8 Tracking

- Waybill Reference.
- Tracking Subscription/Link.
- Shipment Event.
- External Event Reference.
- Event Processing Record.

### 31.9 Corporate

- Corporate Account.
- Corporate Branch.
- Cost Centre.
- Approval Policy.
- Approval Request.
- Preferred Provider.
- Corporate Shipment Batch.

### 31.10 Financial References

- FinOps Transaction Reference.
- Payment Reference.
- Refund Reference.
- Commission Rule Reference.
- Settlement Reference.
- Invoice Reference.

TransX must not duplicate authoritative FinOps ledger records.

---

## 32. Core Entity Relationships

The following is a conceptual relationship model:

```text
Organization
 ├── Organization Memberships
 ├── Branches
 ├── Provider Profiles
 │    ├── Provider Capabilities
 │    ├── Service Listings
 │    └── Availability
 ├── Vehicles / Fleets
 └── Facilities

Customer
 └── Shipment Requests
      ├── Assessments
      ├── Quotations
      │    └── Quotation Items
      └── Bookings
           └── Shipment
                ├── Cargo Units
                ├── Consignments
                ├── Transportation Legs
                │    ├── Assignments
                │    ├── Trips
                │    └── Waybill References
                ├── Clearance References
                ├── Warehouse References
                └── Shipment Events
```

The actual relational or service-oriented implementation may vary, but the domain separation must be preserved.

---

## 33. Shipment State Model

Proposed high-level shipment states:

- Draft.
- Requested.
- Under Assessment.
- Awaiting Quotation.
- Quoted.
- Booking Pending.
- Confirmed.
- Awaiting Pickup.
- Collected.
- In Transit.
- At Transit Facility.
- Awaiting Clearance.
- Clearance in Progress.
- Awaiting Warehouse.
- Stored.
- Awaiting Release.
- Outbound Ready.
- Out for Delivery.
- Delivered.
- Completed.
- Exception.
- On Hold.
- Cancelled.
- Disputed.

The shipment state is a summary of the overall logistics journey. It must not replace the independent states of assignments, trips, waybills, clearance jobs or warehouse operations.

The state engine must support multiple active legs and partial cargo movement.

## 34. Assignment State Model

- Created.
- Offered.
- Accepted.
- Rejected.
- Expired.
- Assigned.
- En Route to Pickup.
- Arrived at Pickup.
- Collected.
- In Progress.
- Arrived at Destination.
- Delivered.
- Failed.
- Cancelled.

## 35. Trip State Model

- Planned.
- Ready.
- Started.
- In Progress.
- Delayed.
- Interrupted.
- Arrived.
- Completed.
- Cancelled.

## 36. Quotation State Model

- Draft.
- Submitted.
- Revised.
- Accepted.
- Rejected.
- Expired.
- Withdrawn.

## 37. Booking State Model

- Pending Confirmation.
- Confirmed.
- Awaiting Payment.
- Ready for Execution.
- In Progress.
- Completed.
- Cancelled.
- Disputed.
- Closed.

## 38. External System State Mapping

TransX must not assume that every external platform uses the same statuses.

Each integration adapter must map external statuses into a controlled TransX representation.

The mapping must preserve:

- Original external status.
- Normalized status.
- External reference.
- Source platform.
- Event timestamp.
- Processing timestamp.
- Mapping version.

Unknown statuses must be retained and flagged for mapping review rather than silently discarded.

---

# PART VII — INTEGRATION AND TECHNICAL ARCHITECTURE

## 39. Architectural Style

TransX should be implemented using a modular, API-first and event-driven architecture.

The design should allow the platform to evolve without tightly coupling every business function to every other function.

### 39.1 Logical Components

1. API Gateway.
2. Authentication and authorization adapter.
3. User and organization module.
4. Provider marketplace module.
5. Shipment module.
6. Cargo assessment module.
7. Quotation and booking module.
8. Transportation module.
9. Dispatch and assignment module.
10. Freight integration adapter.
11. Customs integration adapter.
12. Tracking integration adapter.
13. Warehouse integration adapter.
14. Corporate logistics module.
15. Shipment visibility module.
16. Financial integration adapter.
17. Notification/event publisher.
18. Reporting and analytics module.
19. Administration module.

### 39.2 Integration Adapters

Each external system must have an isolated adapter:

- ONDI Adapter.
- ComplyOS Adapter.
- HuduFreight Adapter.
- ClearOS Adapter.
- Track Adapter.
- SEAL Adapter.
- FinOps Adapter.
- Bliss Adapter.
- CRM Adapter.
- Feed Adapter.
- Moovit Adapter.

The adapter must translate TransX domain requests into the external platform's supported contract and normalize returned information.

### 39.3 API-First

All core capabilities must expose documented, versioned interfaces.

API design must include:

- Authentication.
- Authorization.
- Validation.
- Error responses.
- Pagination.
- Filtering.
- Idempotency.
- Rate limiting.
- Audit metadata.
- Versioning.

### 39.4 Event-Driven Integration

Operational events should be published and consumed asynchronously where appropriate.

The implementation should support:

- Event identifiers.
- Correlation identifiers.
- Event versioning.
- Source platform.
- Event timestamps.
- Retry policies.
- Duplicate detection.
- Dead-letter handling.
- Replay or reconciliation processes.

### 39.5 Event Ownership

An event is authoritative only when issued by the system that owns the corresponding operation.

Examples:

- `shipment.created` — TransX.
- `clearance.released` — ClearOS.
- `waybill.created` — Track.
- `warehouse.cargo.received` — SEAL.
- `payment.completed` — FinOps.
- `support.case.resolved` — Bliss.

These names are proposed TransX integration concepts. Final external event names must follow each platform's actual interface.

### 39.6 Integration Reliability

The system must implement:

- Idempotent command handling.
- Duplicate event detection.
- Retry with controlled backoff.
- Timeout handling.
- Circuit breakers where appropriate.
- Dead-letter queues.
- Integration health monitoring.
- Scheduled reconciliation.
- Manual exception resolution.

A failed external integration must not silently advance the dependent logistics operation.

---

## 40. API Requirements

The following is a logical API inventory. Final routes and payload schemas must be agreed during detailed design.

### 40.1 Shipment APIs

```text
POST   /api/v1/shipments/requests
GET    /api/v1/shipments/requests
GET    /api/v1/shipments/requests/{id}
PATCH  /api/v1/shipments/requests/{id}
POST   /api/v1/shipments/requests/{id}/submit
POST   /api/v1/shipments/{id}/cancel
GET    /api/v1/shipments/{id}/timeline
GET    /api/v1/shipments/{id}/documents
```

### 40.2 Assessment APIs

```text
POST   /api/v1/shipments/{id}/assessments
GET    /api/v1/shipments/{id}/assessments
PATCH  /api/v1/assessments/{id}
POST   /api/v1/assessments/{id}/complete
```

### 40.3 Quotation APIs

```text
POST   /api/v1/shipments/{id}/quotations
GET    /api/v1/shipments/{id}/quotations
GET    /api/v1/quotations/{id}
POST   /api/v1/quotations/{id}/revise
POST   /api/v1/quotations/{id}/accept
POST   /api/v1/quotations/{id}/reject
```

### 40.4 Booking APIs

```text
POST   /api/v1/bookings
GET    /api/v1/bookings
GET    /api/v1/bookings/{id}
POST   /api/v1/bookings/{id}/confirm
POST   /api/v1/bookings/{id}/cancel
```

### 40.5 Provider APIs

```text
POST   /api/v1/providers
GET    /api/v1/providers
GET    /api/v1/providers/{id}
PATCH  /api/v1/providers/{id}
POST   /api/v1/providers/{id}/capabilities
GET    /api/v1/providers/{id}/availability
```

### 40.6 Transportation APIs

```text
POST   /api/v1/assignments
GET    /api/v1/assignments
POST   /api/v1/assignments/{id}/accept
POST   /api/v1/assignments/{id}/decline
POST   /api/v1/assignments/{id}/pickup
POST   /api/v1/assignments/{id}/delivery

POST   /api/v1/trips
GET    /api/v1/trips/{id}
POST   /api/v1/trips/{id}/start
POST   /api/v1/trips/{id}/complete
```

### 40.7 Freight APIs

```text
POST   /api/v1/freight/requests
GET    /api/v1/freight/{id}
POST   /api/v1/freight/{id}/link-operation
GET    /api/v1/freight/{id}/status
```

These represent TransX-facing orchestration endpoints, not asserted HuduFreight API routes.

### 40.8 Clearance APIs

```text
POST   /api/v1/clearance/requests
GET    /api/v1/clearance/{id}
GET    /api/v1/shipments/{id}/clearance
```

### 40.9 Tracking APIs

```text
POST   /api/v1/shipments/{id}/waybill-links
GET    /api/v1/shipments/{id}/waybills
GET    /api/v1/waybills/{id}
GET    /api/v1/shipments/{id}/tracking
```

### 40.10 Warehouse APIs

```text
GET    /api/v1/warehouses
GET    /api/v1/warehouses/{id}
POST   /api/v1/warehouse-requests
POST   /api/v1/warehouse-requests/{id}/reserve
POST   /api/v1/warehouse-requests/{id}/release
GET    /api/v1/shipments/{id}/warehouse-references
```

### 40.11 Corporate APIs

```text
GET    /api/v1/corporate/dashboard
POST   /api/v1/corporate/shipment-batches
GET    /api/v1/corporate/shipment-batches/{id}
POST   /api/v1/corporate/approvals
GET    /api/v1/corporate/reports
```

---

## 41. Canonical Logistics Event Model

TransX must maintain a canonical event representation that allows events from different systems to be presented in one coherent timeline.

Recommended event attributes:

- Event ID.
- Event type.
- Event version.
- Source system.
- Source event ID.
- Shipment ID.
- Booking ID.
- Consignment ID.
- Cargo unit ID, where applicable.
- Transportation leg ID, where applicable.
- Provider reference.
- Organization reference.
- Location reference.
- Event timestamp.
- Received timestamp.
- Processed timestamp.
- Event status.
- Evidence references.
- Correlation ID.
- Related external references.

### 41.1 Visibility Standard Consideration

The event architecture should be designed to support mapping to GS1 EPCIS 2.0.1 where useful.

EPCIS provides a standard model for sharing supply-chain visibility events across organizations and locations, including information about what happened, where and when it happened, and the business context. It also supports status and sensor-related information. The standard must be treated as an interoperability option, not as a requirement that all Hudumika systems adopt the same internal data model.

Reference: GS1 EPCIS documentation — https://ref.gs1.org/standards/epcis/2.0.1/

### 41.2 Event Examples

```json
{
  "eventId": "evt-001",
  "eventType": "shipment.cargo.collected",
  "eventVersion": "1.0",
  "sourceSystem": "TransX",
  "shipmentId": "TX-001",
  "cargoUnitId": "CU-001",
  "location": {
    "name": "Origin Location"
  },
  "eventTime": "2026-11-03T10:30:00+03:00",
  "correlationId": "corr-001"
}
```

```json
{
  "eventId": "evt-002",
  "eventType": "warehouse.cargo.received",
  "eventVersion": "1.0",
  "sourceSystem": "SEAL",
  "shipmentId": "TX-001",
  "externalReferences": {
    "warehouseId": "SEAL-WH-001",
    "admissionId": "SEAL-REC-001"
  },
  "eventTime": "2026-11-03T14:00:00+03:00",
  "correlationId": "corr-001"
}
```

These are illustrative TransX event examples. Production schemas must follow approved integration contracts.

---

# PART VIII — SECURITY, GOVERNANCE AND NON-FUNCTIONAL REQUIREMENTS

## 42. Authentication and Authorization

- ONDI must be used for identity and authentication.
- TransX must implement role-based and organization-scoped authorization.
- Resource ownership must be checked on the server.
- Access must be restricted by organization, branch, assignment and operational responsibility.
- Sensitive actions must require appropriate permissions.
- Administrative actions must be audited.

## 43. Data Security

- Encryption in transit.
- Encryption at rest.
- Secure credential management.
- Secure file storage.
- Access-controlled documents.
- Secure API communication.
- Protection against common application vulnerabilities.
- Controlled secrets and key rotation.

## 44. Privacy

- Minimize personal data collection.
- Restrict access to customer contact details.
- Restrict driver location visibility.
- Define retention periods.
- Support lawful deletion or anonymization where applicable.
- Record access to sensitive records.
- Apply relevant country-specific privacy requirements.

## 45. Auditability

The system must record:

- Who performed an action.
- What action occurred.
- Which record was affected.
- When the action occurred.
- Previous and new values where appropriate.
- Source platform.
- Related external reference.
- Correlation identifier.

Shipment events and financial references must not be silently overwritten.

## 46. Performance

Proposed initial engineering targets, subject to load testing:

- Standard API response time: p95 within 500 ms for ordinary operations, excluding external service latency.
- Search response time: p95 within 2 seconds under agreed baseline load.
- Shipment timeline retrieval: p95 within 2 seconds under agreed baseline load.
- Background event processing: target processing within 60 seconds under normal operating conditions.
- Large report generation should use asynchronous processing.

These are initial targets, not measured guarantees.

## 47. Availability and Resilience

Proposed target:

- 99.5% monthly availability for the initial production service, excluding agreed maintenance windows and documented external dependencies.

The architecture must support:

- Health monitoring.
- Backup and recovery.
- Graceful degradation.
- Integration retry.
- Service isolation.
- Operational alerting.
- Disaster recovery planning.

## 48. Scalability

The system must be designed to scale across:

- Multiple countries.
- Multiple currencies.
- Multiple organizations.
- Large provider networks.
- High shipment volumes.
- Multiple logistics modes.
- Multiple external integrations.
- Large tracking-event volumes.

## 49. Localization

Support:

- Configurable countries.
- Configurable currencies.
- Local date and time formats.
- Time zones.
- Languages.
- Country-specific address structures.
- Country-specific compliance policies.
- Country-specific logistics service rules.

The initial deployment may prioritize Tanzania and subsequently expand into other markets.

## 50. Mobile Requirements

A unified Flutter mobile application is proposed.

The application should provide role-based experiences for:

- Customers.
- Corporate users.
- Freelance couriers.
- Drivers.
- Courier-company employees.
- Agents.
- Other approved operational participants.

Requirements:

- Secure authentication.
- Role-aware navigation.
- Push notifications through approved services.
- Offline evidence capture.
- Background synchronization.
- Camera and file attachments.
- Location services where authorized.
- Responsive interfaces.
- Secure local storage.

A web application should support administrative, corporate and provider management workflows.

---

# PART IX — ADMINISTRATION AND REPORTING

## 51. TransX Administration

Administrators must be able to manage:

- Users and organization references.
- Provider categories.
- Service categories.
- Cargo categories.
- Transportation modes.
- Countries.
- Regions and service areas.
- Pricing configurations.
- Commission rules.
- Provider eligibility policies.
- Shipment configuration.
- Booking policies.
- Cancellation rules.
- Integration settings.
- Event mappings.
- Operational exceptions.
- Reporting permissions.

Administrative changes must be audited.

## 52. Operational Control Centre

The TransX operations dashboard should display:

- Active shipments.
- Pending provider responses.
- Shipments awaiting assessment.
- Pending quotations.
- Confirmed bookings.
- Pending assignments.
- Active trips.
- Delayed shipments.
- Clearance exceptions.
- Warehouse exceptions.
- Failed deliveries.
- Integration failures.
- Disputed shipments.

Authorized controllers should be able to investigate exceptions and coordinate corrective actions without bypassing specialist-system ownership.

## 53. Reporting and Analytics

### 53.1 Marketplace Reports

- Provider registrations.
- Active providers.
- Provider response times.
- Quotation conversion.
- Booking conversion.
- Provider utilization.

### 53.2 Shipment Reports

- Shipment volumes.
- Completed shipments.
- Cancelled shipments.
- Shipment turnaround times.
- Route performance.
- Delivery success.
- Failed delivery frequency.

### 53.3 Transportation Reports

- Vehicle utilization.
- Driver performance.
- Trip completion.
- Delays.
- Cost per route.
- Assignment acceptance.

### 53.4 Freight Reports

- Freight volume.
- Freight provider performance.
- Freight operation status.
- Transportation-leg performance.
- Freight cost summaries, where authorized data is available.

### 53.5 Warehouse Reports

- Storage requests.
- Warehouse usage.
- Storage duration.
- Warehouse service performance.
- Admission and release turnaround.
- Warehouse-related shipment exceptions.

Detailed inventory reports remain in SEAL.

### 53.6 Customs Reports

- Clearance jobs linked to shipments.
- Clearance turnaround.
- Clearance exceptions.
- Clearance dependencies affecting shipment completion.

Detailed customs operations remain in ClearOS.

### 53.7 Corporate Reports

- Spend by branch.
- Spend by department.
- Spend by cost centre.
- Provider performance.
- Shipment volume.
- Delivery performance.
- Route and service analysis.

---

# PART X — QUALITY ASSURANCE AND ACCEPTANCE

## 54. Testing Strategy

Testing must include:

- Unit testing.
- Integration testing.
- API contract testing.
- End-to-end workflow testing.
- Mobile application testing.
- Web application testing.
- Security testing.
- Performance testing.
- Offline synchronization testing.
- Failure recovery testing.
- Data migration testing.
- User acceptance testing.

## 55. Critical Integration Tests

### 55.1 ONDI

- Successful authentication.
- Invalid token rejection.
- Organization switching.
- Deactivated identity restrictions.

### 55.2 ComplyOS

- Verified provider eligibility.
- Pending verification restrictions.
- Expired document restrictions.
- Compliance rejection handling.

### 55.3 HuduFreight

- Freight operation linkage.
- Reference synchronization.
- Status retrieval.
- Duplicate request handling.
- Integration failure recovery.

### 55.4 ClearOS

- Clearance request initiation.
- Clearance reference linkage.
- Status updates.
- Clearance exception handling.
- Release dependency enforcement.

### 55.5 Track

- Waybill reference creation/linkage.
- Multiple waybills per shipment.
- Tracking event ingestion.
- Duplicate event handling.
- Out-of-order event handling.
- Tracking history display.

### 55.6 SEAL

- Warehouse capacity inquiry.
- Reservation confirmation.
- Reservation rejection.
- Cargo admission event.
- Partial cargo release.
- Warehouse exception.
- Dispatch handover.
- Reconciliation after integration interruption.

### 55.7 FinOps

- Payment initiation.
- Payment confirmation.
- Duplicate payment request prevention.
- Refund reference handling.
- Settlement reconciliation.

### 55.8 Bliss

- Support case creation.
- Shipment reference linkage.
- Case status synchronization.
- Dispute resolution visibility.

---

## 56. Functional Acceptance Criteria

The first production-ready release must demonstrate the following.

### Customer

- A customer can submit a shipment request without mandatory technical cargo dimensions.
- A customer can attach supporting evidence.
- A customer can receive provider responses.
- A customer can compare quotations.
- A customer can accept a quotation.
- A customer can view shipment progress.
- A customer can access delivery evidence.

### Providers

- Providers can register and submit required verification information.
- Providers can publish services.
- Providers can receive relevant requests.
- Providers can assess cargo.
- Providers can submit quotations.
- Providers can manage accepted bookings.

### Drivers and Couriers

- Drivers can view eligible jobs.
- Drivers can accept or decline assignments.
- Duplicate assignment acceptance is prevented.
- Drivers can record pickup and delivery evidence.
- Offline evidence can synchronize safely.

### Freight

- Freight requests can be linked to HuduFreight operations.
- Freight status can be displayed in TransX.
- The freight-management system remains authoritative for its records.

### Customs

- Clearance requests can be linked to ClearOS.
- Clearance status can be displayed in TransX.
- Configured clearance dependencies can block onward execution.

### Tracking

- Waybills can be linked to shipments.
- One shipment can have multiple waybills.
- Tracking events can be displayed in a consolidated timeline.
- Source-system provenance is preserved.

### Warehousing

- Warehouse services can be discovered.
- Warehouse reservations can be coordinated through SEAL.
- Admission and release milestones can be reflected in TransX.
- Partial storage and release can be represented.
- SEAL remains authoritative for inventory and warehouse operations.

### Corporate

- Corporate organizations can manage branches and employees.
- Corporate users can submit bulk shipment requests.
- Approval rules can be enforced.
- Corporate shipment reporting is available.

### Finance

- TransX does not independently alter FinOps balances.
- Payment confirmation comes from FinOps.
- Financial references can be reconciled with bookings and completed services.

---

# PART XI — IMPLEMENTATION ROADMAP

## 57. Recommended Delivery Phases

The roadmap should be delivered incrementally. Each phase must have independently testable business outcomes.

### Phase 1 — Platform Foundation

- ONDI integration.
- Organization and membership model.
- Role-based authorization.
- Provider onboarding.
- ComplyOS integration.
- Core administration.
- Initial service and location configuration.

### Phase 2 — Logistics Marketplace

- Provider profiles.
- Service listings.
- Provider discovery.
- Shipment requests.
- Cargo assessment.
- Quotations.
- Booking management.

### Phase 3 — Transportation Execution

- Driver and courier application.
- Vehicle management.
- Assignment management.
- Trip management.
- Pickup and delivery evidence.
- Agent operations.
- Basic shipment visibility.

### Phase 4 — Specialist Logistics Integrations

- Track integration.
- HuduFreight integration.
- ClearOS integration.
- SEAL integration.
- Shared event model.
- Integration monitoring and reconciliation.

The exact sequence should depend on API readiness and business priorities.

### Phase 5 — Corporate Logistics

- Corporate accounts.
- Branches.
- Departments.
- Approval workflows.
- Bulk shipments.
- Preferred providers.
- Corporate reporting.
- Financial coordination.

### Phase 6 — Advanced Supply Chain

- Multi-leg orchestration.
- Advanced distribution.
- Multi-provider coordination.
- Supply-chain dashboards.
- Advanced analytics.
- Route optimization.
- Expanded operational intelligence.

### Phase 7 — Expansion

- Additional countries.
- Additional transportation modes.
- Advanced integrations.
- Additional supply-chain capabilities.
- Industry-specific extensions.

---

# PART XII — ARCHITECTURAL DECISIONS AND GOVERNANCE

## 58. Key Architectural Decisions

The following decisions form the proposed product baseline.

| No. | Decision | Rationale |
|---|---|---|
| 1 | TransX is Hudumika's Logistics & Supply Chain solution | Establishes the broader product scope |
| 2 | TransX owns end-to-end logistics orchestration | Provides one unified operational experience |
| 3 | The marketplace is provider-led | Supports customers who cannot specify technical cargo requirements |
| 4 | Customers submit simple shipment requests | Reduces onboarding friction |
| 5 | Providers assess cargo and submit quotations | Uses professional logistics expertise |
| 6 | Multiple providers can participate in one shipment | Supports real logistics networks |
| 7 | Freight operations integrate with HuduFreight | Avoids duplicate freight-management functionality |
| 8 | Customs operations integrate with ClearOS | Preserves specialist clearance ownership |
| 9 | Waybills and tracking integrate with Track | Preserves specialist tracking ownership |
| 10 | Warehouse operations integrate with SEAL | Avoids duplicating warehouse management |
| 11 | FinOps owns the financial ledger | Preserves financial integrity |
| 12 | ONDI owns identity and authentication | Provides shared identity infrastructure |
| 13 | ComplyOS owns verification outcomes | Centralizes compliance decisions |
| 14 | Bliss owns support cases and disputes | Centralizes support operations |
| 15 | TransX maintains a canonical logistics timeline | Unifies shipment visibility |
| 16 | A shipment may have multiple waybills | Supports multi-leg and multi-carrier logistics |
| 17 | Shipment, consignment, assignment and trip remain separate entities | Preserves domain integrity |
| 18 | Warehouse, agent and hub capabilities are distinct | Avoids conflating different physical operations |
| 19 | One organization can have multiple provider capabilities | Supports real-world business structures |
| 20 | The mobile application uses role-based experiences | Reduces fragmented applications |

## 59. Assumptions and Items Requiring Validation

This specification establishes the target product architecture. The following must be validated before detailed implementation.

### 59.1 HuduFreight

Confirm:

- Existing modules.
- Freight-management data model.
- Existing quotation and booking responsibilities.
- Customer and provider management.
- Freight job and consignment structures.
- Supported APIs.
- Events and webhooks.
- Document management.
- Integration authentication.

### 59.2 ClearOS

Confirm:

- Clearing-company onboarding model.
- Clearance case lifecycle.
- Declaration and document models.
- Customs status definitions.
- Release confirmation.
- APIs and event contracts.
- Country-specific operational requirements.

### 59.3 Track

Confirm:

- Waybill lifecycle.
- Waybill-to-cargo relationships.
- Carrier integrations.
- Tracking event model.
- Tracking identifier formats.
- Webhook/API availability.
- Multiple waybill support.
- Event history and correction rules.

### 59.4 SEAL

Confirm:

- Warehouse and facility model.
- Warehouse ownership and operator model.
- Capacity management.
- Reservation capabilities.
- Admission and receipt records.
- Inventory and storage model.
- Partial release support.
- Picking and dispatch operations.
- API and event contracts.

### 59.5 Shared Services

Confirm the supported interfaces and contractual capabilities of:

- ONDI.
- ComplyOS.
- FinOps.
- Bliss.
- CRM.
- Feed.
- Moovit.
- HRx, if included in corporate workflows.

### 59.6 Regulatory and Operational Validation

Validate applicable requirements for:

- Cargo categories.
- Dangerous goods.
- Customs and cross-border movements.
- Insurance.
- Driver and vehicle eligibility.
- Data privacy.
- Document retention.
- Electronic evidence.
- Financial and tax treatment.

This SRS does not itself establish legal or regulatory compliance.

---

# PART XIII — PRODUCT MODULE INVENTORY

## 60. Proposed TransX Module Structure

```text
TRANSX
│
├── 1. Core Platform
│   ├── User & Organization Management
│   ├── Provider Management
│   ├── Roles & Permissions
│   ├── Configuration
│   └── Administration
│
├── 2. Logistics Marketplace
│   ├── Provider Listings
│   ├── Service Discovery
│   ├── Provider Matching
│   ├── Service Coverage
│   └── Availability
│
├── 3. Shipment Management
│   ├── Shipment Requests
│   ├── Cargo Assessment
│   ├── Quotations
│   ├── Bookings
│   ├── Cargo Units
│   └── Shipment Events
│
├── 4. Transportation Management
│   ├── Vehicle Management
│   ├── Fleet Management
│   ├── Driver Management
│   ├── Assignments
│   ├── Trips
│   ├── Dispatch
│   └── Proof of Delivery
│
├── 5. Courier Management
│   ├── Individual Couriers
│   ├── Courier Companies
│   ├── Delivery Jobs
│   ├── Delivery Monitoring
│   └── Earnings References
│
├── 6. Freight Coordination
│   ├── Freight Requests
│   ├── Freight Provider Discovery
│   ├── Freight Coordination
│   └── HuduFreight Integration
│
├── 7. Customs Coordination
│   ├── Clearing Provider Discovery
│   ├── Clearance Requests
│   ├── Clearance Dependencies
│   └── ClearOS Integration
│
├── 8. Warehousing & Distribution
│   ├── Warehouse Marketplace
│   ├── Storage Requests
│   ├── Warehouse Reservations
│   ├── Cargo Admission References
│   ├── Warehouse Release
│   ├── Distribution Coordination
│   └── SEAL Integration
│
├── 9. Cargo Tracking & Visibility
│   ├── Waybill References
│   ├── Tracking Timeline
│   ├── Multi-Leg Visibility
│   ├── Cargo Events
│   └── Track Integration
│
├── 10. Corporate Supply Chain
│   ├── Corporate Accounts
│   ├── Branches & Departments
│   ├── Approval Workflows
│   ├── Bulk Shipments
│   ├── Preferred Providers
│   ├── Cost Centres
│   └── Corporate Reporting
│
├── 11. Commercial & Financial Coordination
│   ├── Pricing
│   ├── Quotations
│   ├── Commissions
│   ├── Payment Coordination
│   └── FinOps Integration
│
├── 12. Support & Communication
│   ├── Shipment Support
│   ├── Dispute References
│   ├── Customer Communication
│   ├── Feed Integration
│   └── Bliss Integration
│
├── 13. Analytics & Intelligence
│   ├── Marketplace Analytics
│   ├── Shipment Analytics
│   ├── Transportation Analytics
│   ├── Freight Analytics
│   ├── Warehouse Analytics
│   ├── Corporate Analytics
│   └── Supply Chain Visibility
│
└── 14. Integration Management
    ├── ONDI
    ├── ComplyOS
    ├── HuduFreight
    ├── ClearOS
    ├── Track
    ├── SEAL
    ├── FinOps
    ├── Bliss
    ├── CRM
    ├── Feed
    └── Moovit
```

---

# PART XIV — FINAL PRODUCT DEFINITION

## 61. What TransX Ultimately Represents

TransX is Hudumika's central Logistics and Supply Chain Management solution.

It brings together the people, businesses, service providers, facilities and specialist platforms required to move goods and cargo through the supply chain.

It serves individuals and enterprises that need logistics services, as well as the companies and professionals that provide those services.

It coordinates the complete journey:

**Request → Assessment → Quotation → Booking → Collection → Freight/Transportation → Customs Clearance → Warehousing → Distribution → Tracking → Delivery → Financial Settlement.**

Not every shipment requires every stage, and the sequence must be configurable according to the actual logistics operation.

### 61.1 The Hudumika Logistics Ecosystem

- **TransX** connects and orchestrates the logistics and supply-chain journey.
- **HuduFreight** manages specialist freight operations.
- **ClearOS** manages customs-clearance operations.
- **Track** manages waybills and cargo tracking.
- **SEAL** manages warehouse operations.
- **ONDI** provides identity and authentication.
- **ComplyOS** provides compliance and verification.
- **FinOps** manages financial transactions and settlements.
- **Bliss** manages support and disputes.
- **CRM** manages shared customer and business relationships.
- **Feed** distributes notifications and activities.
- **Moovit** supports routing and location intelligence where available.

### 61.2 Final Architectural Principle

TransX must provide the unified logistics experience without becoming a duplicate of every specialist platform.

It owns the relationships and orchestration required to connect the specialist systems into one end-to-end supply-chain journey.

**Final positioning:**

# TransX
## Logistics & Supply Chain Management by Hudumika

*One connected ecosystem for moving, managing, tracking and coordinating goods across the supply chain.*
