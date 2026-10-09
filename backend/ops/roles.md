# Operational Roles & Boundaries

To ensure discipline and prevent unauthorized changes during incidents.

## 👨🔧 On-call Engineer (SRE)
- **Access**: Read-only access to Production Database.
- **Authority**:
  - Can flip Feature Flags (Config table).
  - Can trigger manual reconciliation jobs.
- **Boundary**: **Cannot** manually edit database rows or bypass state machine triggers.

## 🧑✈️ Incident Commander (IC)
- **Role**: Designated leader during a P0/P1 incident.
- **Authority**:
  - Approves recovery plans.
  - Controls communication flow.
  - Decisions on "Safety vs Growth" (e.g., shutting down pooling globally).

## 👮 Compliance / Auditor
- **Access**: Full Read-only access to `ride_audit_log` and `payment_audit_log`.
- **Boundary**: No production write access ever. 
- **Purpose**: Verifies that incident responses followed written playbooks.
