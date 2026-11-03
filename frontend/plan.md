# GMS Delivery Plan

This file tracks the agreed garage-review work. It excludes speculative fields and features the garage does not currently use.

## Stage 1 - Intake, Staff, and Inventory

- [x] Put Interior first in the condition workflow while retaining every other section.
- [x] Keep mileage on each job card as mileage at reception.
- [x] Clarify the existing text fields as Reported Problem / Requested Work, Additional Remarks, and Requested Materials.
- [x] Show all existing vehicle information in job review: owner, model, type, plate, engine number, and chassis number.
- [x] Add employee categories: Mechanic, Bat Lamera, Strip and Fit Technician, Auto Electrician, and Painter.
- [x] Replace generic mechanic assignment with five independent multi-select fields; each accepts zero or more employees.
- [x] Display assignment categories in job-card details and review.
- [x] Update employee create, edit, and list views to manage a controlled work category.
- [x] Keep employee seed data ready for real staff details; do not invent production employees.
- [x] Add inventory Condition (New / Used) and Origin (Original / Locally Made).
- [x] Show and edit both classifications in inventory create, list, and detail views.

## Stage 2 - Proforma and Operational History

- [x] Support Start Job -> Job Card -> Proforma.
- [x] Support Vehicle -> Proforma -> Approval -> Start Job.
- [x] Require a vehicle on every proforma and allow its job-card link to remain empty until work starts.
- [x] Prefill owner and vehicle when starting a job from a proforma.
- [x] Preserve revisions and connect the created job card to the original proforma.
- [x] Show all existing vehicle fields on the proforma without adding photos or unconfirmed case fields.
- [x] Add vehicle, job-card, employee-assignment, and inventory-movement history using existing data.
- [x] Provide mobile-friendly timelines and practical search filters.

## Stage 3 - Payments and Backup

- [x] Add advance and partial-payment records with amount, date, method, reference, receiver, notes, reversal, and balance.
- [x] Show payment history from the related invoice and job context.
- [x] Add scheduled external-path database backups with retention and last-run status.
- [x] Add administrator-only manual backup and restore, including restore verification.

## Open Naming Decision

- Bat Lamera remains the temporary label until its preferred English name is supplied.
- Betagn is represented as Strip and Fit Technician.

## Production Readiness and Local Continuity

The hosted database is the authoritative source of truth. The office server is
an operational replica for internet outages, not a backup. Encrypted backups
must be stored separately from both installations.

### Stage 1 - Stabilize the Current System

- [x] Preserve the existing UI and translation work on `production-readiness`.
- [x] Remove generated development logs from source control.
- [x] Fix hook subscription and dependency issues exposed by lint.
- [x] Remove stale imports and unused values so frontend lint is clean.
- [x] Run the backend suite in the Docker environment: 26 tests passed.
- [x] Verify PostgreSQL and Redis readiness through the live API health checks.
- [x] Run a clean frontend production build for every application route.
- [x] Smoke-test authenticated dashboard and Start Job rendering in a browser.

### Stage 2 - Security Hardening

- [x] Add separate development and production Docker configurations.
- [x] Keep PostgreSQL and Redis off public host ports in production.
- [x] Require strong production secrets and reject development defaults.
- [x] Add HTTPS reverse proxying, trusted hosts, security headers, and strict CORS.
- [x] Add login throttling, session revocation, and refresh-token rotation.
- [x] Harden browser token/cache handling and clear private data on logout.
- [x] Run containers as non-root with restricted privileges and resource limits.
- [x] Add dependency, image, and secret scanning.

### Stage 3 - RBAC and Audit

- [x] Separate user, role, payment, invoice, backup, audit, and settings permissions.
- [x] Prevent privilege escalation and protect the final super administrator.
- [x] Define and seed the final least-privilege operational roles.
- [x] Test every API route with no token, wrong role, correct role, and superadmin.
- [x] Complete append-only audit coverage for security and financial operations.

### Stage 4 - Hosted Production Deployment

- [ ] Deploy the versioned frontend, API, PostgreSQL, and Redis stack.
- [ ] Add migrations, health checks, restart policies, monitoring, and alerts.
- [ ] Add encrypted daily off-server backups and perform a restore drill.
- [ ] Document deployment, rollback, recovery, and administrator procedures.

### Stage 5 - Local Server and Synchronization

- [ ] Deploy the same versioned application on the office network.
- [ ] Add node identities, record versions, tombstones, and idempotency keys.
- [ ] Add transactional outbox/inbox and an append-only synchronization log.
- [ ] Replicate hosted changes to the office server while connected.
- [ ] Queue office changes during outages and submit them when connectivity returns.
- [ ] Use dedicated machine credentials and local-only authentication tokens.
- [ ] Show connection mode, last sync, pending operations, and conflicts.
- [ ] Replace overlapping browser mutation queuing with server-level synchronization.

### Stage 6 - Conflict and Failure Validation

- [ ] Keep payments, stock movements, and status events append-only.
- [ ] Add version checks and administrator-assisted conflict resolution.
- [ ] Test internet loss, office power loss, reconnection, and simultaneous edits.
- [ ] Test duplicate delivery, server restart, full disk, and credential expiry.
- [ ] Validate desktop and mobile workflows in English and Amharic.
