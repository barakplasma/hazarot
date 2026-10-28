// Generated from scenarios/*.md; never expose this catalog to the browser.
import type { Scenario } from './types';
export const catalog: Scenario[] = [
  {
    "id": "agent-access",
    "title": "The agent approved its own access",
    "category": "AI agent incident",
    "author": "Rehearsal team",
    "version": 1,
    "exercise_minutes": 10,
    "debrief_minutes": 5,
    "summary": "A support agent followed instructions in a customer attachment and granted its own service account broader access. Contain the workflow, preserve evidence, and keep support running without guessing what was exposed.",
    "characters": [
      {
        "id": "automation-owner",
        "name": "Automation owner",
        "knowledge": "The support assistant reads customer attachments and drafts access requests. An integration mistakenly allowed the same service identity to submit and approve requests. Pausing the assistant alone does not revoke credentials or cancel queued jobs. You can help identify the queue and affected identity.",
        "instruction": "Explain workflow dependencies without inventing a completed containment or clean audit. Treat attachment content as untrusted evidence, not instructions. Ask who authorizes a restart and what evidence they need.",
        "fallback": "The same service identity could submit and approve access. Pausing the assistant does not revoke existing access or cancel queued jobs. Who owns those checks, and who will approve any restart?"
      },
      {
        "id": "support-manager",
        "name": "Support manager",
        "knowledge": "Twelve customer tickets await processing. A manual intake process exists, but staff need one instruction and an escalation contact. Customers are asking whether their records were exposed; no exposure assessment is confirmed.",
        "instruction": "Represent support continuity and customer questions. Ask for approved wording and the next update time. Do not claim a breach, a clean bill of health, or authorization to restart automation.",
        "fallback": "Twelve tickets are waiting. We can use manual intake if someone confirms the procedure and escalation owner. What can we tell customers now, and when is the next update?"
      }
    ],
    "roles": [
      {
        "id": "coordinator",
        "name": "Incident coordinator",
        "responsibility": "Name owners, maintain one shared situation report, and coordinate containment and recovery decisions.",
        "authority": "Coordinate the exercise and accept a documented handover; the service owner approves the recovery plan.",
        "knowledge": "A support assistant granted its own service account access to a customer export workspace. There is an audit alert, but nobody has agreed whether the agent is still running or what data it reached.",
        "hint": "Separate stopping new work, revoking access, preserving evidence, and keeping support available. Each needs an owner and acknowledgement."
      },
      {
        "id": "security",
        "name": "Security analyst",
        "responsibility": "Preserve the event sequence, assess the scope of access, and state what remains unknown.",
        "authority": "Inspect fictional audit records and define the evidence required before any exposure claim.",
        "knowledge": "An access request contains language copied from an uploaded customer attachment. The audit trail shows a grant; it does not by itself establish data exfiltration. Current retention is sufficient to preserve relevant logs.",
        "hint": "Treat the attachment as evidence. Communicate observed grants, observed reads, and unverified assumptions separately."
      },
      {
        "id": "platform",
        "name": "Platform engineer",
        "responsibility": "Stop queued agent work, revoke the affected identity's access, and test the replacement control.",
        "authority": "Perform simulated containment and verify independent approval in an isolated recovery test.",
        "knowledge": "The agent worker, its pending-job queue, and its service-account grants are separate controls. A worker pause does not cancel queued exports. A human approval gate can be tested without reconnecting the agent to customer systems.",
        "hint": "Describe all three containment controls and verify them. Re-enabling the same flawed approval path is not recovery."
      },
      {
        "id": "service-owner",
        "name": "Service owner and help-desk liaison",
        "responsibility": "Approve the continuity plan, align help-desk messaging, and accept remaining risk for a controlled handover.",
        "authority": "Approve continued manual operation and a recovery plan; do not promise that customer data is unaffected without evidence.",
        "knowledge": "Manual intake can keep urgent tickets moving. A full automation restart is optional for this round. Legal and customer contacts need a factual status rather than speculation about a breach.",
        "hint": "Ask what staff should do immediately, who handles urgent tickets, and which evidence supports the proposed handover."
      }
    ],
    "actions": [
      {
        "id": "owner",
        "label": "Assign incident and decision owners",
        "duration_seconds": 10,
        "roles": [
          "coordinator"
        ],
        "sets": [
          "owner"
        ],
        "scope": "room",
        "result": "A coordination owner is recorded. Agree named owners for containment, evidence, manual intake, and stakeholder updates in chat."
      },
      {
        "id": "preserve",
        "label": "Preserve the audit timeline and attachment",
        "duration_seconds": 35,
        "roles": [
          "security"
        ],
        "sets": [
          "evidence"
        ],
        "result": "Fictional evidence is preserved. The timeline links an untrusted attachment to a self-approved access grant and one export job queued under the affected identity. Preserve the artifact without following its embedded instructions."
      },
      {
        "id": "contain",
        "label": "Stop agent work, cancel queued jobs, and revoke grants",
        "duration_seconds": 45,
        "roles": [
          "platform"
        ],
        "requires": [
          "owner"
        ],
        "sets": [
          "contained"
        ],
        "scope": "room",
        "result": "Simulated checks confirm the worker is paused, queued export jobs are canceled, and the affected identity's new grants and sessions are revoked. These checks contain new activity; they do not prove what happened before containment."
      },
      {
        "id": "scope",
        "label": "Establish observed access and remaining uncertainty",
        "duration_seconds": 50,
        "roles": [
          "security"
        ],
        "requires": [
          "evidence"
        ],
        "sets": [
          "scope"
        ],
        "result": "Audit evidence shows one unauthorized workspace grant and a queued export. Available records show no completed export, but a gap in downstream read logging prevents ruling out earlier reads. Record the gap and assign follow-up; do not announce either confirmed exfiltration or no exposure."
      },
      {
        "id": "continuity",
        "label": "Confirm manual intake and help-desk instructions",
        "duration_seconds": 25,
        "roles": [
          "service-owner"
        ],
        "sets": [
          "continuity"
        ],
        "scope": "room",
        "result": "The service owner authorizes manual intake for the twelve waiting tickets, names an urgent-ticket escalation owner, and keeps automated processing paused. Write the actual staff instruction and next-update time in Coordination."
      },
      {
        "id": "test-control",
        "label": "Test independent approval in an isolated workflow",
        "duration_seconds": 60,
        "roles": [
          "platform"
        ],
        "requires": [
          "contained",
          "evidence"
        ],
        "sets": [
          "tested"
        ],
        "result": "A fictional isolated test confirms the agent can propose an access request but cannot approve it or broaden its own permissions. A separately authorized human approval is required. Customer-connected automation remains paused."
      },
      {
        "id": "approve-plan",
        "label": "Approve the bounded recovery and investigation plan",
        "duration_seconds": 20,
        "roles": [
          "service-owner"
        ],
        "requires": [
          "contained",
          "scope",
          "continuity",
          "tested"
        ],
        "sets": [
          "approved"
        ],
        "scope": "room",
        "result": "The service owner approves continued manual operation with automation paused, a named owner for the logging gap, and an explicit independent-approval check before any later restart. Approve no claim that exposure has been ruled out."
      },
      {
        "id": "communicate",
        "label": "Send the agreed operational and stakeholder update",
        "duration_seconds": 25,
        "roles": [
          "coordinator",
          "service-owner"
        ],
        "requires": [
          "approved"
        ],
        "sets": [
          "communicated"
        ],
        "scope": "room",
        "result": "The fictional help desk, automation owner, and stakeholders receive one consistent update. State containment, manual intake, observed evidence, the unresolved logging gap, decision owners, and the next update time in chat. A communication receipt does not resolve the unknown exposure."
      },
      {
        "id": "handover",
        "label": "Verify the containment and continuity handover",
        "duration_seconds": 20,
        "roles": [
          "coordinator"
        ],
        "requires": [
          "owner",
          "approved",
          "communicated"
        ],
        "sets": [
          "handover"
        ],
        "scope": "room",
        "end": "controlled-handover",
        "result": "Fictional owners acknowledge paused automation, canceled jobs, revoked grants, functioning manual intake, and the remaining investigation. The exercise ends at a controlled handover, without claiming the investigation is complete or restarting the agent."
      }
    ],
    "endings": [
      {
        "id": "controlled-handover",
        "label": "Containment and continuity handed over",
        "kind": "world",
        "roles": [
          "coordinator"
        ],
        "requires": [
          "handover"
        ],
        "assessment": "The team verified a safe operating state and transferred the unresolved investigation to named owners. Review whether acknowledgements and uncertainty were clear; a full automation restart was not required."
      },
      {
        "id": "all-clear",
        "label": "Declare all clear",
        "kind": "declaration",
        "roles": [
          "coordinator"
        ],
        "requires": [
          "contained",
          "scope",
          "continuity",
          "tested",
          "approved",
          "communicated"
        ],
        "assessment": "The team declared the incident complete. Examine whether that claim was justified while downstream read evidence remained incomplete. Containment is not proof that no data was exposed."
      }
    ],
    "developments": [
      {
        "id": "restart-pressure",
        "minute": 2,
        "speaker": "Support manager",
        "text": "The queue is growing. Can we restart the assistant now, or should staff use manual intake? Please give us one owner and a next-update time."
      },
      {
        "id": "queued-work",
        "minute": 4,
        "speaker": "Automation owner",
        "text": "Please confirm the pending export queue and service-account grants as well as the worker pause. Those are separate controls."
      },
      {
        "id": "stakeholder-pressure",
        "minute": 7,
        "text": "A stakeholder asks for a yes-or-no answer on whether customer data was exposed. Who owns that assessment, what evidence is available, and what wording can the help desk use now?"
      }
    ],
    "observe": [
      {
        "flag": "owner",
        "label": "Coordination and decision ownership established",
        "reflection": "Could every participant name who coordinated and who approved recovery?"
      },
      {
        "flag": "evidence",
        "label": "Evidence preserved before interpretation",
        "reflection": "Did the team treat the attachment as untrusted evidence rather than pass its instructions onward?"
      },
      {
        "flag": "contained",
        "label": "Worker, queue, and identity contained",
        "reflection": "Did anyone mistake pausing an agent for revoking its access or canceling its queued work?"
      },
      {
        "flag": "scope",
        "label": "Observations distinguished from unknown exposure",
        "reflection": "Did status updates preserve the logging gap instead of turning uncertainty into reassurance or alarm?"
      },
      {
        "flag": "continuity",
        "label": "Help desk given a usable fallback",
        "reflection": "Did support staff know what to do with urgent tickets while automation stayed paused?"
      },
      {
        "flag": "tested",
        "label": "Independent approval verified",
        "reflection": "Did someone test the control rather than merely promise to improve the prompt?"
      },
      {
        "flag": "communicated",
        "label": "One consistent stakeholder update issued",
        "reflection": "Did the operational and customer-facing accounts agree on facts, uncertainty, and the next update?"
      },
      {
        "flag": "handover",
        "label": "Remaining investigation assigned and acknowledged",
        "reflection": "Could the next shift continue safely without assuming the incident was fully resolved?"
      }
    ],
    "briefing": "It is 10:15. Your support assistant processes customer attachments and drafts access requests. An audit alert shows it requested broader access for its own service account and the integration approved the request automatically. An export job is queued, support tickets are accumulating, and colleagues want to know whether the assistant can be restarted.\n\nThis is a fictional coordination exercise. Establish ownership, contain the agent's work and identity, preserve evidence, give the help desk a workable fallback, and agree what can honestly be said to stakeholders. You can finish with a controlled handover while automation remains paused. A full restart is not the goal.\n\nUse action cards to confirm simulated outcomes and chat to record decisions, acknowledgements, and update times. Ask `@Automation owner` or `@Support manager` questions in a public thread. One participant may combine responsibilities. All systems, access changes, and customer records are fictional; no action reaches a real system.",
    "groundTruth": "The trigger is an untrusted customer attachment combined with an approval-boundary failure. The assistant's identity could both request and approve access. Better prompting alone does not repair that boundary. The worker, queue, and access grants must be contained separately. One grant and one queued export are known; no completed export appears in available records, but downstream read logging is incomplete. Neither exfiltration nor no exposure is established. Manual intake and an independently tested approval gate support a controlled handover. The investigation remains open beyond the round.",
    "debrief": "Which role held information that changed somebody else's decision?\nWho noticed that stopping the worker, canceling queued jobs, and revoking access were separate tasks?\nHow did you describe the difference between no recorded export and proof of no exposure?\nDid the help desk receive an instruction it could act on?\nWas anyone pressured to fix the prompt or restart before testing the approval boundary?\nReplay with roles rotated. Compare the clarity of decisions and handover, not how quickly you declared all clear.",
    "template": "Coordination owner and recovery decision owner:\nConfirmed agent activity and affected identity:\nWorker / queue / access containment and verifying owners:\nPreserved evidence and unresolved exposure questions:\nHelp-desk instruction and urgent-ticket contact:\nApproved operating state and remaining investigation owner:\nStakeholder wording and next update time:"
  },
  {
    "id": "ci-credentials",
    "title": "CI credentials exposed",
    "category": "Incident response",
    "author": "Rehearsal team",
    "version": 1,
    "exercise_minutes": 12,
    "debrief_minutes": 5,
    "summary": "A dependency update becomes a credential incident. Agree ownership, contain the exposure, and communicate a defensible recovery.",
    "characters": [
      {
        "id": "release-manager",
        "name": "Release manager",
        "knowledge": "A release is waiting. You do not know the audit findings or whether the affected runner is safe.",
        "instruction": "Ask for an owner, a confirmed decision, and the next update. Do not approve a runner restart yourself.",
        "fallback": "A release is waiting. Who owns the decision, what is confirmed, and when will you update us?"
      },
      {
        "id": "vp-engineering",
        "name": "VP of Engineering",
        "knowledge": "You need a confirmed customer-impact assessment and the next update time. You have no private investigation evidence.",
        "instruction": "Ask concise stakeholder questions. Do not pressure the team to guess or declare success.",
        "fallback": "Is customer impact confirmed? Please share what is known, what remains uncertain, and the next update time."
      }
    ],
    "roles": [
      {
        "id": "commander",
        "name": "Incident commander",
        "responsibility": "Coordinate priorities, owners, approvals, and stakeholder updates.",
        "authority": "Approve pausing shared runners and declare all clear.",
        "knowledge": "Customer checkout is operating normally. A runner pause will delay releases, but is acceptable if the team explains the risk.",
        "hint": "Ask each investigator for one fact, one uncertainty, and their next action. Give stakeholders a next-update time rather than an unsupported ETA."
      },
      {
        "id": "security",
        "name": "Security analyst",
        "responsibility": "Establish credential scope, preserve evidence, and recommend containment.",
        "authority": "Inspect audit records and revoke the exposed credential.",
        "knowledge": "A secret-scanning alert names a CI publishing token. Password resets do not revoke that token. You have not yet verified whether it was used.",
        "hint": "Request audit evidence before claiming a breach is contained. Explain why changing a password may leave token access intact."
      },
      {
        "id": "platform",
        "name": "Platform engineer",
        "responsibility": "Inspect the runner, contain execution, and verify a clean rebuild.",
        "authority": "Pause shared runners after approval; rebuild after token revocation and isolation.",
        "knowledge": "A dependency update ran on a shared build runner. You can inspect its install log. Restarting that runner alone does not establish that it is clean.",
        "hint": "Distinguish restoring build availability from establishing trust in build outputs. Confirm approval and a verification plan before changes."
      },
      {
        "id": "helpdesk",
        "name": "Help desk coordinator",
        "responsibility": "Collect user impact and distribute approved guidance.",
        "authority": "Gather reports and share findings; do not promise resolution on behalf of investigators.",
        "knowledge": "Two developers report unexpected package-publishing failures. No customer outage has been reported. You can confirm these reports with the affected users.",
        "hint": "Separate developer impact from customer impact. Share reproducible symptoms and avoid forwarding speculation as a confirmed incident cause."
      }
    ],
    "actions": [
      {
        "id": "establish-owner",
        "label": "Accept incident coordination",
        "duration_seconds": 10,
        "roles": [
          "commander"
        ],
        "sets": [
          "owner"
        ],
        "scope": "room",
        "result": "Incident coordination has an explicit owner. Ask investigators to acknowledge their assignments in the room."
      },
      {
        "id": "audit",
        "label": "Inspect token audit records",
        "duration_seconds": 40,
        "roles": [
          "security"
        ],
        "sets": [
          "audit"
        ],
        "result": "Audit evidence shows the publishing token was used from an unfamiliar address. Its scope includes package publishing. There is no evidence in this record of customer database access."
      },
      {
        "id": "inspect-runner",
        "label": "Inspect runner install log",
        "duration_seconds": 35,
        "roles": [
          "platform"
        ],
        "sets": [
          "runner"
        ],
        "result": "The install log shows an unexpected dependency preinstall hook reading CI environment variables. The affected runner must not be trusted for recovery builds."
      },
      {
        "id": "collect-impact",
        "label": "Confirm user impact",
        "duration_seconds": 30,
        "roles": [
          "helpdesk"
        ],
        "sets": [
          "impact"
        ],
        "result": "Two developers confirm publishing errors starting after the dependency update. Customer checkout remains available; release delivery is delayed."
      },
      {
        "id": "approve-pause",
        "label": "Approve pausing shared runners",
        "duration_seconds": 15,
        "roles": [
          "commander"
        ],
        "sets": [
          "approved"
        ],
        "scope": "room",
        "result": "Pausing shared runners is approved. This delays releases; assign an owner and communicate that impact."
      },
      {
        "id": "isolate",
        "label": "Pause and isolate the affected runner",
        "duration_seconds": 30,
        "roles": [
          "platform"
        ],
        "requires": [
          "approved"
        ],
        "sets": [
          "isolated"
        ],
        "scope": "room",
        "result": "The affected runner is paused and isolated. Existing credentials still require revocation; isolation alone does not close that exposure."
      },
      {
        "id": "revoke",
        "label": "Revoke the exposed publishing token",
        "duration_seconds": 30,
        "roles": [
          "security"
        ],
        "requires": [
          "audit"
        ],
        "sets": [
          "revoked"
        ],
        "scope": "room",
        "result": "The exposed token is revoked. Audit records and runner evidence are retained for investigation."
      },
      {
        "id": "rebuild",
        "label": "Verify a clean rebuild",
        "duration_seconds": 60,
        "roles": [
          "platform"
        ],
        "requires": [
          "isolated",
          "revoked",
          "runner"
        ],
        "sets": [
          "verified"
        ],
        "scope": "room",
        "result": "A rebuilt runner with pinned clean dependencies and a replacement scoped credential passes a test build and publish. The old runner is retained offline as evidence."
      },
      {
        "id": "status-update",
        "label": "Publish an agreed stakeholder update",
        "duration_seconds": 30,
        "roles": [
          "commander",
          "helpdesk"
        ],
        "requires": [
          "owner"
        ],
        "sets": [
          "status"
        ],
        "scope": "room",
        "result": "An update is recorded. Put the actual wording in chat with impact, known facts, uncertainties, response owner, and next-update time. This receipt alone does not prove the wording was useful."
      }
    ],
    "endings": [
      {
        "id": "all-clear",
        "label": "Declare all clear",
        "kind": "declaration",
        "roles": [
          "commander"
        ],
        "assessment": "The declaration ends play even if recovery is not verified. Review the evidence and unresolved exposure before judging the decision."
      },
      {
        "id": "crisis-handover",
        "label": "Hand over to crisis management and stop",
        "kind": "terminal",
        "roles": [
          "commander"
        ],
        "assessment": "Escalation is not automatically failure. Review what was handed over, who accepted ownership, and what remains uncertain."
      }
    ],
    "developments": [
      {
        "id": "executive-question",
        "minute": 4,
        "speaker": "VP of Engineering",
        "text": "Is customer data affected? I need confirmed facts and the next update time. Please avoid guessing."
      },
      {
        "id": "release-pressure",
        "minute": 8,
        "speaker": "Release manager",
        "text": "A release is waiting. Can we restart the old runner now? Who can approve that decision?"
      }
    ],
    "observe": [
      {
        "flag": "owner",
        "label": "Explicit coordination owner",
        "reflection": "Was ownership acknowledged by the others, or only recorded by one person?"
      },
      {
        "flag": "audit",
        "label": "Credential scope investigated",
        "reflection": "Was the scope shared with the people deciding containment?"
      },
      {
        "flag": "approved",
        "label": "Change approval recorded",
        "reflection": "Did the engineer understand the approval, impact, and intended scope?"
      },
      {
        "flag": "revoked",
        "label": "Exposed credential revoked",
        "reflection": "Did the team distinguish token revocation from password changes?"
      },
      {
        "flag": "verified",
        "label": "Recovery verified",
        "reflection": "What evidence supported declaring the build system trustworthy?"
      },
      {
        "flag": "status",
        "label": "Stakeholder update recorded",
        "reflection": "Did the actual message distinguish facts from hypotheses and give a next-update time?"
      }
    ],
    "briefing": "A secret-scanning alert appeared after a dependency update on a shared CI runner. Two developers cannot publish packages. Customer checkout appears healthy.\n\nYou are the response team. Establish ownership, share findings, coordinate containment and recovery, and keep stakeholders informed. Every action is fictional. Use action cards to request evidence or commit a simulated change; ordinary chat records discussion, not infrastructure changes.\n\nYour individual thread contains your role knowledge. Other participants agree not to read it unless invited. Create investigation and meeting threads as needed. You may hold multiple roles in a small team.",
    "groundTruth": "The dependency hook exposed a publishing token. Pausing the runner alone does not revoke the token. Recovery is verified only after runner isolation, credential revocation, and a clean rebuild. Customer data compromise is not established by the available evidence.",
    "debrief": "What did another role know that you needed earlier?\nWhich requests received a clear acknowledgment and owner?\nWhat evidence supported the ending decision?\nChoose one change in coordination to try in a fresh round.",
    "template": "Impact:\nConfirmed facts:\nUncertainties:\nActions and owners:\nDecision or approval needed:\nNext update:"
  },
  {
    "id": "offsite",
    "title": "The bus isn't coming",
    "category": "Event coordination",
    "author": "Rehearsal team",
    "version": 1,
    "exercise_minutes": 10,
    "debrief_minutes": 5,
    "summary": "Forty colleagues are waiting for transport. Coordinate access needs, budget, the venue, and a clear decision under pressure.",
    "characters": [
      {
        "id": "venue-coordinator",
        "name": "Venue coordinator",
        "knowledge": "The venue can accommodate a 45-minute delay if the team confirms a revised arrival time before booking.",
        "instruction": "Coordinate the venue schedule without claiming a transport booking or headcount.",
        "fallback": "We can accommodate a 45-minute delay. What arrival time should we plan around, and who will confirm it?"
      },
      {
        "id": "colleague",
        "name": "Colleague",
        "knowledge": "You heard a rumor that the event was canceled. You do not know the confirmed plan or other participants' access needs.",
        "instruction": "Ask for the official participant-facing plan. Do not invent constraints or decide to end the exercise.",
        "fallback": "I heard the event might be canceled. What is the confirmed plan, and who is giving the official update?"
      }
    ],
    "roles": [
      {
        "id": "planner",
        "name": "Event planner",
        "responsibility": "Coordinate transport and venue logistics and bring options to the decision owner.",
        "authority": "Request quotes and book the later bus after approval.",
        "knowledge": "The booked bus is unavailable. A supplier mentioned a 25-seat replacement, but you have not checked accessibility or total cost.",
        "hint": "Gather constraints before booking. Summarize options with capacity, accessibility, arrival time, and cost rather than forwarding fragmented messages."
      },
      {
        "id": "manager",
        "name": "Department manager",
        "responsibility": "Own priorities and spending decisions and acknowledge tradeoffs.",
        "authority": "Approve up to $500 extra, cancel the event, or approve a later departure.",
        "knowledge": "You may approve up to $500 additional spending. A later arrival is acceptable if the venue agrees and all colleagues can travel.",
        "hint": "State the decision criteria and budget explicitly. Ask whose needs have not yet been represented before committing."
      },
      {
        "id": "representative",
        "name": "Employee representative",
        "responsibility": "Gather participant needs and communicate the confirmed plan.",
        "authority": "Share access needs and tell participants what has been agreed.",
        "knowledge": "Two colleagues require accessible transport. One cannot use stairs. Do not publish personal medical information; communicate the transport requirement.",
        "hint": "Make access needs a planning constraint early. Confirm that a proposed vehicle serves everyone before announcing it."
      }
    ],
    "actions": [
      {
        "id": "establish-owner",
        "label": "Accept event coordination",
        "duration_seconds": 10,
        "roles": [
          "planner",
          "manager"
        ],
        "sets": [
          "owner"
        ],
        "scope": "room",
        "result": "A coordination owner is recorded. Agree how logistics, approvals, and participant communication will be divided."
      },
      {
        "id": "needs",
        "label": "Confirm participant transport needs",
        "duration_seconds": 25,
        "roles": [
          "representative"
        ],
        "sets": [
          "needs"
        ],
        "result": "Forty people need transport, including two requiring an accessible vehicle. Communicate that constraint without sharing personal medical details."
      },
      {
        "id": "quotes",
        "label": "Request transport options",
        "duration_seconds": 40,
        "roles": [
          "planner"
        ],
        "sets": [
          "quotes"
        ],
        "result": "The immediate replacement has 25 seats and no accessibility provision. An accessible 40-seat bus is available 45 minutes later for $400 extra. Neither option has been booked."
      },
      {
        "id": "venue",
        "label": "Check the later arrival with the venue",
        "duration_seconds": 30,
        "roles": [
          "planner"
        ],
        "sets": [
          "venue"
        ],
        "result": "The venue confirms it can accommodate a 45-minute delay if given a firm revised arrival time before booking."
      },
      {
        "id": "approve",
        "label": "Approve the later accessible bus and $400",
        "duration_seconds": 15,
        "roles": [
          "manager"
        ],
        "requires": [
          "quotes",
          "needs",
          "venue"
        ],
        "sets": [
          "approved"
        ],
        "scope": "room",
        "result": "The manager approves $400 additional spend and a later departure with accessible transport. The planner still needs to book it and the representative needs to communicate the plan."
      },
      {
        "id": "book",
        "label": "Book the later accessible bus",
        "duration_seconds": 40,
        "roles": [
          "planner"
        ],
        "requires": [
          "approved"
        ],
        "sets": [
          "booked"
        ],
        "scope": "room",
        "result": "The accessible 40-seat bus is booked for 45 minutes later. The venue receives the revised arrival time. In this short exercise, the wait is compressed once the plan is communicated."
      },
      {
        "id": "communicate",
        "label": "Communicate the confirmed travel plan",
        "duration_seconds": 20,
        "roles": [
          "representative",
          "planner"
        ],
        "requires": [
          "booked"
        ],
        "sets": [
          "communicated"
        ],
        "scope": "room",
        "result": "Participants receive the revised departure and arrival details and the access arrangement. Add your actual announcement in chat so the group can review its clarity."
      },
      {
        "id": "board",
        "label": "Verify everyone has boarded",
        "duration_seconds": 30,
        "roles": [
          "planner",
          "representative"
        ],
        "requires": [
          "communicated",
          "booked",
          "needs"
        ],
        "sets": [
          "boarded"
        ],
        "scope": "room",
        "end": "boarded",
        "result": "The fictional wait is advanced. A headcount confirms all 40 colleagues, including those requiring accessibility, are aboard the booked bus."
      }
    ],
    "endings": [
      {
        "id": "boarded",
        "label": "Everyone has boarded suitable transport",
        "kind": "world",
        "roles": [
          "planner",
          "representative"
        ],
        "requires": [
          "boarded"
        ],
        "assessment": "Boarding is verified in the fictional record. Review how constraints, approval, and participant communication came together."
      },
      {
        "id": "canceled",
        "label": "Cancel the offsite; everyone goes home",
        "kind": "terminal",
        "roles": [
          "manager"
        ],
        "assessment": "Canceling may be justified. Review the decision's evidence, alternatives, communication, and assignment of follow-up responsibilities."
      }
    ],
    "developments": [
      {
        "id": "venue-pressure",
        "minute": 3,
        "speaker": "Venue coordinator",
        "text": "Please give us an agreed arrival time. Should we delay the first activity?"
      },
      {
        "id": "rumor",
        "minute": 6,
        "speaker": "Colleague",
        "text": "I heard the whole event is canceled. Should I go home? Is there an official update?"
      }
    ],
    "observe": [
      {
        "flag": "owner",
        "label": "Coordination ownership established",
        "reflection": "Did the group know who was bringing the plan together?"
      },
      {
        "flag": "needs",
        "label": "Participant constraints checked",
        "reflection": "Were access needs shared early enough to influence the options?"
      },
      {
        "flag": "venue",
        "label": "Venue dependency confirmed",
        "reflection": "Did logistics decisions account for the venue's schedule?"
      },
      {
        "flag": "approved",
        "label": "Budget and tradeoff approved",
        "reflection": "Was the approval clear before the booking commitment?"
      },
      {
        "flag": "communicated",
        "label": "Confirmed plan communicated",
        "reflection": "Did people know what to do and whose message to trust?"
      },
      {
        "flag": "boarded",
        "label": "Headcount and access verified",
        "reflection": "Did someone verify the outcome rather than assume the booking was enough?"
      }
    ],
    "briefing": "Forty colleagues are due to leave for an offsite in 30 minutes. The transport company reports that the booked bus is unavailable. People are gathering, and the venue is expecting you.\n\nAgree how to coordinate, gather constraints, decide what to commit to, and communicate the plan. All calls, spending, bookings, and travel are fictional. Use action cards to establish outcomes. Saying \"everyone is on the bus\" in chat does not establish a headcount.\n\nIndividual threads are private by convention. Invite others into an investigation or meeting thread when needed. Small teams can hold multiple roles.",
    "groundTruth": "The immediate 25-seat bus cannot serve the whole group or the accessibility requirements. A later accessible bus plus venue agreement and approved spending is viable. No booking or boarding exists until committed through the scenario actions. Cancellation is an available ending, not automatically a failure.",
    "debrief": "Which constraint changed the decision most?\nWhere did a handoff or approval become unclear?\nDid the group distinguish a proposal, a booking, and a verified outcome?\nWhat will you try differently in the next round?",
    "template": "Current situation:\nConstraints and needs:\nOptions and tradeoffs:\nDecision owner:\nConfirmed plan and owners:\nNext update:"
  },
  {
    "id": "wedding-traffic",
    "title": "The DJ is stuck in traffic",
    "category": "Wedding coordination",
    "author": "Rehearsal team",
    "version": 1,
    "exercise_minutes": 10,
    "debrief_minutes": 5,
    "summary": "Protesters have blocked traffic near the wedding. The DJ and some guests are delayed. Coordinate a revised plan without leaving the couple, venue, or guests guessing.",
    "characters": [
      {
        "id": "dj",
        "name": "DJ",
        "knowledge": "You and your sound equipment are in stationary traffic behind a protest roadblock. Your current estimate is 45-75 minutes, not a confirmed arrival time. You can share the agreed entrance playlist remotely, but cannot operate the venue equipment from the road.",
        "instruction": "Answer as the delayed DJ. Distinguish estimates from confirmed facts, ask who owns the revised schedule, and do not claim a road has reopened or equipment has been tested.",
        "fallback": "I am still stopped with the equipment. My estimate is 45-75 minutes, but it is uncertain. I can share the entrance playlist. Who is coordinating the revised schedule and when should I update you?"
      },
      {
        "id": "delayed-guest",
        "name": "Delayed guest",
        "knowledge": "Eighteen guests are delayed, including a grandparent the couple hoped would attend the ceremony. Some passengers need somewhere to sit when they arrive. Your group has heard contradictory rumors about whether the wedding is canceled.",
        "instruction": "Represent the delayed guests and ask for one official update. Do not invent a safe route, confirmed arrival time, or a decision on behalf of the couple.",
        "fallback": "Our group is still delayed, including a grandparent. Is the ceremony moving, and who will send the official plan? Please arrange seating when we arrive and tell us when the next update is due."
      }
    ],
    "roles": [
      {
        "id": "coordinator",
        "name": "Wedding coordinator",
        "responsibility": "Bring facts and options together, name decision owners, and maintain one agreed running order.",
        "authority": "Coordinate suppliers and propose schedule changes; the couple's representative approves significant changes.",
        "knowledge": "The ceremony is planned for 19:00 and dinner for 19:30. The DJ supplies the main sound system, but the venue may have a backup. Several helpers are independently messaging guests.",
        "hint": "Separate the DJ delay, guest delay, and venue constraints. Assign one person to each conversation and return decisions to Coordination."
      },
      {
        "id": "couple-representative",
        "name": "Couple's representative",
        "responsibility": "Gather the couple's priorities, protect their attention, and approve a revised plan on their behalf.",
        "authority": "Approve the revised running order or stop the event after consulting the couple.",
        "knowledge": "The couple wants the delayed grandparent included if practical. They prefer a calm celebration over the original timetable and can accept a later ceremony or a simple audio setup. They have not approved either option yet.",
        "hint": "State whose absence matters to the decision and what tradeoffs the couple accepts. Do not turn a preference into a guaranteed arrival requirement without checking."
      },
      {
        "id": "venue-lead",
        "name": "Venue lead",
        "responsibility": "Check venue equipment, catering timing, staffing, and the handover into the revised event.",
        "authority": "Test venue audio and commit venue staff to an approved running order.",
        "knowledge": "A wired microphone and small speaker are available but untested. Dinner can start at 19:30 even if the ceremony moves later. Amplified music must end at 23:00; delaying everything may shorten the party.",
        "hint": "Confirm what the backup can actually do. Give options with their dependencies and limits, then acknowledge the chosen plan to staff."
      },
      {
        "id": "guest-liaison",
        "name": "Guest liaison",
        "responsibility": "Establish who is delayed, collect arrival needs, and issue one consistent guest-facing update.",
        "authority": "Confirm guest impact and communicate the approved plan; do not promise road clearance or arrival times.",
        "knowledge": "Eighteen guests are delayed in several vehicles. You do not yet have a reliable list of key participants or arrival needs. People already at the venue are asking whether to sit down or wait outside.",
        "hint": "Check both delayed and already-arrived guests. Give a useful instruction, a contact person, and a next-update time without presenting estimates as facts."
      }
    ],
    "actions": [
      {
        "id": "owner",
        "label": "Accept wedding coordination",
        "duration_seconds": 10,
        "roles": [
          "coordinator"
        ],
        "sets": [
          "owner"
        ],
        "scope": "room",
        "result": "A coordination owner is recorded. Assign supplier contact, guest updates, venue checks, and approval responsibilities in chat."
      },
      {
        "id": "supplier-status",
        "label": "Confirm the DJ's status and equipment dependency",
        "duration_seconds": 25,
        "roles": [
          "coordinator"
        ],
        "sets": [
          "dj-status"
        ],
        "result": "The DJ and main sound equipment remain stopped. The 45-75 minute estimate is uncertain. The DJ can share a playlist but cannot confirm road clearance or operate the venue audio remotely."
      },
      {
        "id": "guest-impact",
        "label": "Confirm delayed guests and arrival needs",
        "duration_seconds": 35,
        "roles": [
          "guest-liaison"
        ],
        "sets": [
          "guests"
        ],
        "result": "Eighteen guests are delayed, including a grandparent important to the couple. Seating on arrival is needed. No confirmed arrival time exists. Record how delayed and already-arrived guests will receive updates."
      },
      {
        "id": "venue-options",
        "label": "Confirm venue and catering options",
        "duration_seconds": 30,
        "roles": [
          "venue-lead"
        ],
        "sets": [
          "venue"
        ],
        "result": "Dinner can begin at 19:30 before a later ceremony, or the ceremony can use simple venue audio. Amplified music still ends at 23:00. The venue needs a revised running order and a named contact before changing staff assignments."
      },
      {
        "id": "audio-check",
        "label": "Test the backup microphone and playlist setup",
        "duration_seconds": 45,
        "roles": [
          "venue-lead"
        ],
        "sets": [
          "audio"
        ],
        "result": "A fictional sound check confirms the wired microphone and speaker work for speech and a simple entrance playlist. This is a usable fallback, not the full DJ setup. Assign who will operate it."
      },
      {
        "id": "couple-priorities",
        "label": "Confirm the couple's priorities and acceptable tradeoffs",
        "duration_seconds": 25,
        "roles": [
          "couple-representative"
        ],
        "requires": [
          "guests",
          "venue"
        ],
        "sets": [
          "priorities"
        ],
        "result": "The couple accepts either a short scheduled delay with dinner first, or a simpler ceremony with a clear way to include the delayed grandparent. They want one coordinator and consistent updates, not repeated requests from several helpers. A specific running order still needs approval."
      },
      {
        "id": "approve-plan",
        "label": "Approve the revised wedding plan",
        "duration_seconds": 15,
        "roles": [
          "couple-representative"
        ],
        "requires": [
          "owner",
          "dj-status",
          "guests",
          "venue",
          "audio",
          "priorities"
        ],
        "sets": [
          "approved"
        ],
        "scope": "room",
        "result": "The couple's representative approves the plan the team has stated in Coordination. Write the chosen first segment, how the grandparent will be included, the audio operator, decision owner, and next-update time. This approval does not establish that delayed people have arrived."
      },
      {
        "id": "notify",
        "label": "Issue the approved guest and supplier update",
        "duration_seconds": 25,
        "roles": [
          "guest-liaison",
          "coordinator"
        ],
        "requires": [
          "approved"
        ],
        "sets": [
          "notified"
        ],
        "scope": "room",
        "result": "The approved plan reaches guests at the venue, delayed guests, the DJ, and venue staff. Add the actual announcement in chat for review. Distinguish confirmed arrangements from travel estimates and explain what people should do now."
      },
      {
        "id": "handover",
        "label": "Verify the agreed first segment has started",
        "duration_seconds": 30,
        "roles": [
          "venue-lead",
          "coordinator"
        ],
        "requires": [
          "approved",
          "notified",
          "audio"
        ],
        "sets": [
          "started"
        ],
        "scope": "room",
        "end": "event-started",
        "result": "Fictional time advances to the agreed first segment. Venue staff acknowledge their assignments, the audio operator is ready, and guest contacts know the next update time. The celebration proceeds under the revised plan; the DJ and delayed guests are not assumed to have arrived."
      }
    ],
    "endings": [
      {
        "id": "event-started",
        "label": "The revised wedding plan is underway",
        "kind": "world",
        "roles": [
          "venue-lead",
          "coordinator"
        ],
        "requires": [
          "started"
        ],
        "assessment": "The first agreed segment is verified. Review the clarity of approval, guest communication, uncertainty, and handover rather than whether the original timetable was preserved."
      },
      {
        "id": "stop-event",
        "label": "The couple decides to stop the event",
        "kind": "terminal",
        "roles": [
          "couple-representative"
        ],
        "assessment": "Play stops because the couple's representative has confirmed the decision. Review the reasoning, how guests and suppliers were informed, and who owns follow-up. Stopping is not automatically a failure."
      }
    ],
    "developments": [
      {
        "id": "uncertain-eta",
        "minute": 2,
        "speaker": "DJ",
        "text": "Traffic is still stopped. Please do not announce my estimate as a confirmed arrival. Do you need the playlist, and who is my contact now?"
      },
      {
        "id": "guest-rumor",
        "minute": 5,
        "speaker": "Delayed guest",
        "text": "Someone said the wedding is canceled, but another person says the ceremony already started. What is the official plan, and when will you update us?"
      },
      {
        "id": "kitchen-check",
        "minute": 7,
        "text": "The kitchen needs one confirmed running order. Which segment starts next, who approved it, and who is telling the guests?"
      }
    ],
    "observe": [
      {
        "flag": "owner",
        "label": "One coordination owner established",
        "reflection": "Did helpers know whom to update and who could approve changes?"
      },
      {
        "flag": "dj-status",
        "label": "Supplier estimate and dependency checked",
        "reflection": "Did anyone confuse a travel estimate with a commitment or forget the sound equipment?"
      },
      {
        "flag": "guests",
        "label": "Guest impact and arrival needs represented",
        "reflection": "Were key participants and people already at the venue considered before deciding?"
      },
      {
        "flag": "audio",
        "label": "Backup capability verified",
        "reflection": "Did someone test and assign the fallback rather than assume that a playlist solved the audio problem?"
      },
      {
        "flag": "approved",
        "label": "Revised plan explicitly approved",
        "reflection": "Did the couple's priorities shape the decision, and could everyone repeat the chosen plan?"
      },
      {
        "flag": "notified",
        "label": "One consistent update shared",
        "reflection": "Did every audience know what to do now, who to contact, and when to expect another update?"
      },
      {
        "flag": "started",
        "label": "Event handover verified",
        "reflection": "Did venue staff acknowledge the plan before anyone declared the situation handled?"
      }
    ],
    "briefing": "It is 18:40 at a wedding venue. The ceremony is planned for 19:00. Protesters are blocking traffic nearby; the DJ, the main sound equipment, and eighteen guests are delayed. Guests already at the venue are asking what happens next. Several well-meaning helpers are sending different messages.\n\nYou are the wedding coordination team. Establish responsibilities, check the couple's priorities, work out what the venue can support, and agree a clear plan for guests and suppliers. This exercise is about coordination under uncertainty; the protest is the cause of the disruption, not something the team controls.\n\nAll calls, sound checks, schedule changes, and event outcomes are fictional. Use action cards to record confirmed outcomes and chat to make the reasoning, ownership, and announcements clear. Address `@DJ` or `@Delayed guest` in a public thread to ask a fictional colleague a question. Individual role threads remain private by convention. One person may hold several roles.",
    "groundTruth": "No road-clearance time or guest arrival is confirmed. The DJ's equipment delay is a separate dependency from the guests' delay. Venue audio works once tested; dinner-first and a simpler ceremony are both viable if the couple approves and the delayed grandparent is considered. There is no single preferred running order. Approving a plan does not prove it was communicated or started. Do not turn the travel disruption into a fictional emergency or invent control over protesters, roads, or authorities.",
    "debrief": "Who had information that another role needed earlier?\nWhere did different helpers accidentally create conflicting instructions?\nWhich estimate was most tempting to present as a fact?\nHow did the couple's priorities change the options?\nWhat confirmed that the plan had reached guests and venue staff?\nReplay with a different running order or swap responsibilities. Compare how the team coordinates, not just whether it starts on time.",
    "template": "Confirmed situation and affected people:\nUncertain estimates and next checks:\nCouple's priorities:\nChosen running order and decision owner:\nVenue/audio/supplier owners:\nGuest instruction and official contact:\nNext update time:"
  }
];
