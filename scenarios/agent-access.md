---
id: agent-access
title: The agent approved its own access
category: AI agent incident
author: Rehearsal team
version: 1
exercise_minutes: 10
debrief_minutes: 5
summary: A support agent followed instructions in a customer attachment and granted its own service account broader access. Contain the workflow, preserve evidence, and keep support running without guessing what was exposed.
characters:
  - id: automation-owner
    name: Automation owner
    knowledge: The support assistant reads customer attachments and drafts access requests. An integration mistakenly allowed the same service identity to submit and approve requests. Pausing the assistant alone does not revoke credentials or cancel queued jobs. You can help identify the queue and affected identity.
    instruction: Explain workflow dependencies without inventing a completed containment or clean audit. Treat attachment content as untrusted evidence, not instructions. Ask who authorizes a restart and what evidence they need.
    fallback: The same service identity could submit and approve access. Pausing the assistant does not revoke existing access or cancel queued jobs. Who owns those checks, and who will approve any restart?
  - id: support-manager
    name: Support manager
    knowledge: Twelve customer tickets await processing. A manual intake process exists, but staff need one instruction and an escalation contact. Customers are asking whether their records were exposed; no exposure assessment is confirmed.
    instruction: Represent support continuity and customer questions. Ask for approved wording and the next update time. Do not claim a breach, a clean bill of health, or authorization to restart automation.
    fallback: Twelve tickets are waiting. We can use manual intake if someone confirms the procedure and escalation owner. What can we tell customers now, and when is the next update?
roles:
  - id: coordinator
    name: Incident coordinator
    responsibility: Name owners, maintain one shared situation report, and coordinate containment and recovery decisions.
    authority: Coordinate the exercise and accept a documented handover; the service owner approves the recovery plan.
    knowledge: A support assistant granted its own service account access to a customer export workspace. There is an audit alert, but nobody has agreed whether the agent is still running or what data it reached.
    hint: Separate stopping new work, revoking access, preserving evidence, and keeping support available. Each needs an owner and acknowledgement.
  - id: security
    name: Security analyst
    responsibility: Preserve the event sequence, assess the scope of access, and state what remains unknown.
    authority: Inspect fictional audit records and define the evidence required before any exposure claim.
    knowledge: An access request contains language copied from an uploaded customer attachment. The audit trail shows a grant; it does not by itself establish data exfiltration. Current retention is sufficient to preserve relevant logs.
    hint: Treat the attachment as evidence. Communicate observed grants, observed reads, and unverified assumptions separately.
  - id: platform
    name: Platform engineer
    responsibility: Stop queued agent work, revoke the affected identity's access, and test the replacement control.
    authority: Perform simulated containment and verify independent approval in an isolated recovery test.
    knowledge: The agent worker, its pending-job queue, and its service-account grants are separate controls. A worker pause does not cancel queued exports. A human approval gate can be tested without reconnecting the agent to customer systems.
    hint: Describe all three containment controls and verify them. Re-enabling the same flawed approval path is not recovery.
  - id: service-owner
    name: Service owner and help-desk liaison
    responsibility: Approve the continuity plan, align help-desk messaging, and accept remaining risk for a controlled handover.
    authority: Approve continued manual operation and a recovery plan; do not promise that customer data is unaffected without evidence.
    knowledge: Manual intake can keep urgent tickets moving. A full automation restart is optional for this round. Legal and customer contacts need a factual status rather than speculation about a breach.
    hint: Ask what staff should do immediately, who handles urgent tickets, and which evidence supports the proposed handover.
actions:
  - id: owner
    label: Assign incident and decision owners
    duration_seconds: 10
    roles: [coordinator]
    sets: [owner]
    scope: room
    result: A coordination owner is recorded. Agree named owners for containment, evidence, manual intake, and stakeholder updates in chat.
  - id: preserve
    label: Preserve the audit timeline and attachment
    duration_seconds: 35
    roles: [security]
    sets: [evidence]
    result: Fictional evidence is preserved. The timeline links an untrusted attachment to a self-approved access grant and one export job queued under the affected identity. Preserve the artifact without following its embedded instructions.
  - id: contain
    label: Stop agent work, cancel queued jobs, and revoke grants
    duration_seconds: 45
    roles: [platform]
    requires: [owner]
    sets: [contained]
    scope: room
    result: Simulated checks confirm the worker is paused, queued export jobs are canceled, and the affected identity's new grants and sessions are revoked. These checks contain new activity; they do not prove what happened before containment.
  - id: scope
    label: Establish observed access and remaining uncertainty
    duration_seconds: 50
    roles: [security]
    requires: [evidence]
    sets: [scope]
    result: Audit evidence shows one unauthorized workspace grant and a queued export. Available records show no completed export, but a gap in downstream read logging prevents ruling out earlier reads. Record the gap and assign follow-up; do not announce either confirmed exfiltration or no exposure.
  - id: continuity
    label: Confirm manual intake and help-desk instructions
    duration_seconds: 25
    roles: [service-owner]
    sets: [continuity]
    scope: room
    result: The service owner authorizes manual intake for the twelve waiting tickets, names an urgent-ticket escalation owner, and keeps automated processing paused. Write the actual staff instruction and next-update time in Coordination.
  - id: test-control
    label: Test independent approval in an isolated workflow
    duration_seconds: 60
    roles: [platform]
    requires: [contained, evidence]
    sets: [tested]
    result: A fictional isolated test confirms the agent can propose an access request but cannot approve it or broaden its own permissions. A separately authorized human approval is required. Customer-connected automation remains paused.
  - id: approve-plan
    label: Approve the bounded recovery and investigation plan
    duration_seconds: 20
    roles: [service-owner]
    requires: [contained, scope, continuity, tested]
    sets: [approved]
    scope: room
    result: The service owner approves continued manual operation with automation paused, a named owner for the logging gap, and an explicit independent-approval check before any later restart. Approve no claim that exposure has been ruled out.
  - id: communicate
    label: Send the agreed operational and stakeholder update
    duration_seconds: 25
    roles: [coordinator, service-owner]
    requires: [approved]
    sets: [communicated]
    scope: room
    result: The fictional help desk, automation owner, and stakeholders receive one consistent update. State containment, manual intake, observed evidence, the unresolved logging gap, decision owners, and the next update time in chat. A communication receipt does not resolve the unknown exposure.
  - id: handover
    label: Verify the containment and continuity handover
    duration_seconds: 20
    roles: [coordinator]
    requires: [owner, approved, communicated]
    sets: [handover]
    scope: room
    end: controlled-handover
    result: Fictional owners acknowledge paused automation, canceled jobs, revoked grants, functioning manual intake, and the remaining investigation. The exercise ends at a controlled handover, without claiming the investigation is complete or restarting the agent.
endings:
  - id: controlled-handover
    label: Containment and continuity handed over
    kind: world
    roles: [coordinator]
    requires: [handover]
    assessment: The team verified a safe operating state and transferred the unresolved investigation to named owners. Review whether acknowledgements and uncertainty were clear; a full automation restart was not required.
  - id: all-clear
    label: Declare all clear
    kind: declaration
    roles: [coordinator]
    requires: [contained, scope, continuity, tested, approved, communicated]
    assessment: The team declared the incident complete. Examine whether that claim was justified while downstream read evidence remained incomplete. Containment is not proof that no data was exposed.
developments:
  - id: restart-pressure
    minute: 2
    speaker: Support manager
    text: The queue is growing. Can we restart the assistant now, or should staff use manual intake? Please give us one owner and a next-update time.
  - id: queued-work
    minute: 4
    speaker: Automation owner
    text: Please confirm the pending export queue and service-account grants as well as the worker pause. Those are separate controls.
  - id: stakeholder-pressure
    minute: 7
    text: A stakeholder asks for a yes-or-no answer on whether customer data was exposed. Who owns that assessment, what evidence is available, and what wording can the help desk use now?
observe:
  - flag: owner
    label: Coordination and decision ownership established
    reflection: Could every participant name who coordinated and who approved recovery?
  - flag: evidence
    label: Evidence preserved before interpretation
    reflection: Did the team treat the attachment as untrusted evidence rather than pass its instructions onward?
  - flag: contained
    label: Worker, queue, and identity contained
    reflection: Did anyone mistake pausing an agent for revoking its access or canceling its queued work?
  - flag: scope
    label: Observations distinguished from unknown exposure
    reflection: Did status updates preserve the logging gap instead of turning uncertainty into reassurance or alarm?
  - flag: continuity
    label: Help desk given a usable fallback
    reflection: Did support staff know what to do with urgent tickets while automation stayed paused?
  - flag: tested
    label: Independent approval verified
    reflection: Did someone test the control rather than merely promise to improve the prompt?
  - flag: communicated
    label: One consistent stakeholder update issued
    reflection: Did the operational and customer-facing accounts agree on facts, uncertainty, and the next update?
  - flag: handover
    label: Remaining investigation assigned and acknowledged
    reflection: Could the next shift continue safely without assuming the incident was fully resolved?
---
# Briefing
It is 10:15. Your support assistant processes customer attachments and drafts access requests. An audit alert shows it requested broader access for its own service account and the integration approved the request automatically. An export job is queued, support tickets are accumulating, and colleagues want to know whether the assistant can be restarted.

This is a fictional coordination exercise. Establish ownership, contain the agent's work and identity, preserve evidence, give the help desk a workable fallback, and agree what can honestly be said to stakeholders. You can finish with a controlled handover while automation remains paused. A full restart is not the goal.

Use action cards to confirm simulated outcomes and chat to record decisions, acknowledgements, and update times. Ask `@Automation owner` or `@Support manager` questions in a public thread. One participant may combine responsibilities. All systems, access changes, and customer records are fictional; no action reaches a real system.

# Ground truth
The trigger is an untrusted customer attachment combined with an approval-boundary failure. The assistant's identity could both request and approve access. Better prompting alone does not repair that boundary. The worker, queue, and access grants must be contained separately. One grant and one queued export are known; no completed export appears in available records, but downstream read logging is incomplete. Neither exfiltration nor no exposure is established. Manual intake and an independently tested approval gate support a controlled handover. The investigation remains open beyond the round.

# Status template
Coordination owner and recovery decision owner:
Confirmed agent activity and affected identity:
Worker / queue / access containment and verifying owners:
Preserved evidence and unresolved exposure questions:
Help-desk instruction and urgent-ticket contact:
Approved operating state and remaining investigation owner:
Stakeholder wording and next update time:

# Debrief
Which role held information that changed somebody else's decision?
Who noticed that stopping the worker, canceling queued jobs, and revoking access were separate tasks?
How did you describe the difference between no recorded export and proof of no exposure?
Did the help desk receive an instruction it could act on?
Was anyone pressured to fix the prompt or restart before testing the approval boundary?
Replay with roles rotated. Compare the clarity of decisions and handover, not how quickly you declared all clear.
