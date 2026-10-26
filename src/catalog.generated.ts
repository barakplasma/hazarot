// Generated from scenarios/*.md; never expose this catalog to the browser.
import type { Scenario } from './types';
export const catalog: Scenario[] = [
  {
    "id": "ci-credentials",
    "title": "CI credentials exposed",
    "category": "Incident response",
    "author": "Rehearsal team",
    "version": 1,
    "exercise_minutes": 12,
    "debrief_minutes": 5,
    "summary": "A dependency update becomes a credential incident. Agree ownership, contain the exposure, and communicate a defensible recovery.",
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
        "text": "VP of Engineering: Is customer data affected? I need confirmed facts and the next update time. Please avoid guessing."
      },
      {
        "id": "release-pressure",
        "minute": 8,
        "text": "Release manager: A release is waiting. Can we restart the old runner now? Who can approve that decision?"
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
        "text": "Venue coordinator: Please give us an agreed arrival time. Should we delay the first activity?"
      },
      {
        "id": "rumor",
        "minute": 6,
        "text": "Colleague: I heard the whole event is canceled. Should I go home? Is there an official update?"
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
  }
];
