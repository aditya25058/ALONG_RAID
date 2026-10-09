# Postmortem Template: incident_YYYYMMDD

## Summary
Brief description of the incident (e.g., Payment Auth failures spiked).

## Timeline (IST)
- **HH:MM**: Incident detected via automated alert.
- **HH:MM**: Incident Commander assigned.
- **HH:MM**: Kill switch `CAPTURE_ENABLED = false` activated.
- **HH:MM**: Root cause identified (Provider downtime).
- **HH:MM**: Service resumed; Reconciliation triggered.

## Impact Analysis
- **Rides Affected**: Count.
- **Revenue Impact**: Estimated desync amount.
- **Safety Impact**: Were any invariants threatened?

## Systems Performance
- **What failed safely**: (e.g., Code switched to Solo, money held but not lost).
- **What failed dangerously**: (e.g., Logs were delayed).

## Remediation & Actions
- [ ] Permanent Fix ID: (e.g., Add secondary provider).
- [ ] Process Change: (e.g., Update playbook thresholds).

## Non-Blame Note
We focus on systemic failures, not individual mistakes.
