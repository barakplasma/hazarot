---
id: ci-credentials
title: CI credentials exposed
category: Incident response
author: Rehearsal team
version: 1
exercise_minutes: 12
debrief_minutes: 5
summary: A dependency update becomes a credential incident. Agree ownership, contain the exposure, and communicate a defensible recovery.
characters:
  - id: release-manager
    name: Release manager
    knowledge: A release is waiting. You do not know the audit findings or whether the affected runner is safe.
    instruction: Ask for an owner, a confirmed decision, and the next update. Do not approve a runner restart yourself.
    fallback: A release is waiting. Who owns the decision, what is confirmed, and when will you update us?
  - id: vp-engineering
    name: VP of Engineering
    knowledge: You need a confirmed customer-impact assessment and the next update time. You have no private investigation evidence.
    instruction: Ask concise stakeholder questions. Do not pressure the team to guess or declare success.
    fallback: Is customer impact confirmed? Please share what is known, what remains uncertain, and the next update time.
roles:
  - id: commander
    name: Incident commander
    responsibility: Coordinate priorities, owners, approvals, and stakeholder updates.
    authority: Approve pausing shared runners and declare all clear.
    knowledge: Customer checkout is operating normally. A runner pause will delay releases, but is acceptable if the team explains the risk.
    hint: Ask each investigator for one fact, one uncertainty, and their next action. Give stakeholders a next-update time rather than an unsupported ETA.
  - id: security
    name: Security analyst
    responsibility: Establish credential scope, preserve evidence, and recommend containment.
    authority: Inspect audit records and revoke the exposed credential.
    knowledge: A secret-scanning alert names a CI publishing token. Password resets do not revoke that token. You have not yet verified whether it was used.
    hint: Request audit evidence before claiming a breach is contained. Explain why changing a password may leave token access intact.
  - id: platform
    name: Platform engineer
    responsibility: Inspect the runner, contain execution, and verify a clean rebuild.
    authority: Pause shared runners after approval; rebuild after token revocation and isolation.
    knowledge: A dependency update ran on a shared build runner. You can inspect its install log. Restarting that runner alone does not establish that it is clean.
    hint: Distinguish restoring build availability from establishing trust in build outputs. Confirm approval and a verification plan before changes.
  - id: helpdesk
    name: Help desk coordinator
    responsibility: Collect user impact and distribute approved guidance.
    authority: Gather reports and share findings; do not promise resolution on behalf of investigators.
    knowledge: Two developers report unexpected package-publishing failures. No customer outage has been reported. You can confirm these reports with the affected users.
    hint: Separate developer impact from customer impact. Share reproducible symptoms and avoid forwarding speculation as a confirmed incident cause.
actions:
  - id: establish-owner
    label: Accept incident coordination
    roles: [commander]
    sets: [owner]
    scope: room
    result: Incident coordination has an explicit owner. Ask investigators to acknowledge their assignments in the room.
  - id: audit
    label: Inspect token audit records
    roles: [security]
    sets: [audit]
    result: Audit evidence shows the publishing token was used from an unfamiliar address. Its scope includes package publishing. There is no evidence in this record of customer database access.
  - id: inspect-runner
    label: Inspect runner install log
    roles: [platform]
    sets: [runner]
    result: The install log shows an unexpected dependency preinstall hook reading CI environment variables. The affected runner must not be trusted for recovery builds.
  - id: collect-impact
    label: Confirm user impact
    roles: [helpdesk]
    sets: [impact]
    result: Two developers confirm publishing errors starting after the dependency update. Customer checkout remains available; release delivery is delayed.
  - id: approve-pause
    label: Approve pausing shared runners
    roles: [commander]
    sets: [approved]
    scope: room
    result: Pausing shared runners is approved. This delays releases; assign an owner and communicate that impact.
  - id: isolate
    label: Pause and isolate the affected runner
    roles: [platform]
    requires: [approved]
    sets: [isolated]
    scope: room
    result: The affected runner is paused and isolated. Existing credentials still require revocation; isolation alone does not close that exposure.
  - id: revoke
    label: Revoke the exposed publishing token
    roles: [security]
    requires: [audit]
    sets: [revoked]
    scope: room
    result: The exposed token is revoked. Audit records and runner evidence are retained for investigation.
  - id: rebuild
    label: Verify a clean rebuild
    roles: [platform]
    requires: [isolated, revoked, runner]
    sets: [verified]
    scope: room
    result: A rebuilt runner with pinned clean dependencies and a replacement scoped credential passes a test build and publish. The old runner is retained offline as evidence.
  - id: status-update
    label: Publish an agreed stakeholder update
    roles: [commander, helpdesk]
    requires: [owner]
    sets: [status]
    scope: room
    result: An update is recorded. Put the actual wording in chat with impact, known facts, uncertainties, response owner, and next-update time. This receipt alone does not prove the wording was useful.
endings:
  - id: all-clear
    label: Declare all clear
    kind: declaration
    roles: [commander]
    assessment: The declaration ends play even if recovery is not verified. Review the evidence and unresolved exposure before judging the decision.
  - id: crisis-handover
    label: Hand over to crisis management and stop
    kind: terminal
    roles: [commander]
    assessment: Escalation is not automatically failure. Review what was handed over, who accepted ownership, and what remains uncertain.
developments:
  - id: executive-question
    minute: 4
    speaker: VP of Engineering
    text: "Is customer data affected? I need confirmed facts and the next update time. Please avoid guessing."
  - id: release-pressure
    minute: 8
    speaker: Release manager
    text: "A release is waiting. Can we restart the old runner now? Who can approve that decision?"
observe:
  - flag: owner
    label: Explicit coordination owner
    reflection: Was ownership acknowledged by the others, or only recorded by one person?
  - flag: audit
    label: Credential scope investigated
    reflection: Was the scope shared with the people deciding containment?
  - flag: approved
    label: Change approval recorded
    reflection: Did the engineer understand the approval, impact, and intended scope?
  - flag: revoked
    label: Exposed credential revoked
    reflection: Did the team distinguish token revocation from password changes?
  - flag: verified
    label: Recovery verified
    reflection: What evidence supported declaring the build system trustworthy?
  - flag: status
    label: Stakeholder update recorded
    reflection: Did the actual message distinguish facts from hypotheses and give a next-update time?
---
# Briefing
A secret-scanning alert appeared after a dependency update on a shared CI runner. Two developers cannot publish packages. Customer checkout appears healthy.

You are the response team. Establish ownership, share findings, coordinate containment and recovery, and keep stakeholders informed. Every action is fictional. Use action cards to request evidence or commit a simulated change; ordinary chat records discussion, not infrastructure changes.

Your individual thread contains your role knowledge. Other participants agree not to read it unless invited. Create investigation and meeting threads as needed. You may hold multiple roles in a small team.

# Ground truth
The dependency hook exposed a publishing token. Pausing the runner alone does not revoke the token. Recovery is verified only after runner isolation, credential revocation, and a clean rebuild. Customer data compromise is not established by the available evidence.

# Status template
Impact:
Confirmed facts:
Uncertainties:
Actions and owners:
Decision or approval needed:
Next update:

# Debrief
What did another role know that you needed earlier?
Which requests received a clear acknowledgment and owner?
What evidence supported the ending decision?
Choose one change in coordination to try in a fresh round.
