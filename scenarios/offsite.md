---
id: offsite
title: The bus isn't coming
category: Event coordination
author: Rehearsal team
version: 1
exercise_minutes: 10
debrief_minutes: 5
summary: Forty colleagues are waiting for transport. Coordinate access needs, budget, the venue, and a clear decision under pressure.
characters:
  - id: venue-coordinator
    name: Venue coordinator
    knowledge: The venue can accommodate a 45-minute delay if the team confirms a revised arrival time before booking.
    instruction: Coordinate the venue schedule without claiming a transport booking or headcount.
    fallback: We can accommodate a 45-minute delay. What arrival time should we plan around, and who will confirm it?
  - id: colleague
    name: Colleague
    knowledge: You heard a rumor that the event was canceled. You do not know the confirmed plan or other participants' access needs.
    instruction: Ask for the official participant-facing plan. Do not invent constraints or decide to end the exercise.
    fallback: I heard the event might be canceled. What is the confirmed plan, and who is giving the official update?
roles:
  - id: planner
    name: Event planner
    responsibility: Coordinate transport and venue logistics and bring options to the decision owner.
    authority: Request quotes and book the later bus after approval.
    knowledge: The booked bus is unavailable. A supplier mentioned a 25-seat replacement, but you have not checked accessibility or total cost.
    hint: Gather constraints before booking. Summarize options with capacity, accessibility, arrival time, and cost rather than forwarding fragmented messages.
  - id: manager
    name: Department manager
    responsibility: Own priorities and spending decisions and acknowledge tradeoffs.
    authority: Approve up to $500 extra, cancel the event, or approve a later departure.
    knowledge: You may approve up to $500 additional spending. A later arrival is acceptable if the venue agrees and all colleagues can travel.
    hint: State the decision criteria and budget explicitly. Ask whose needs have not yet been represented before committing.
  - id: representative
    name: Employee representative
    responsibility: Gather participant needs and communicate the confirmed plan.
    authority: Share access needs and tell participants what has been agreed.
    knowledge: Two colleagues require accessible transport. One cannot use stairs. Do not publish personal medical information; communicate the transport requirement.
    hint: Make access needs a planning constraint early. Confirm that a proposed vehicle serves everyone before announcing it.
actions:
  - id: establish-owner
    label: Accept event coordination
    duration_seconds: 10
    roles: [planner, manager]
    sets: [owner]
    scope: room
    result: A coordination owner is recorded. Agree how logistics, approvals, and participant communication will be divided.
  - id: needs
    label: Confirm participant transport needs
    duration_seconds: 25
    roles: [representative]
    sets: [needs]
    result: Forty people need transport, including two requiring an accessible vehicle. Communicate that constraint without sharing personal medical details.
  - id: quotes
    label: Request transport options
    duration_seconds: 40
    roles: [planner]
    sets: [quotes]
    result: The immediate replacement has 25 seats and no accessibility provision. An accessible 40-seat bus is available 45 minutes later for $400 extra. Neither option has been booked.
  - id: venue
    label: Check the later arrival with the venue
    duration_seconds: 30
    roles: [planner]
    sets: [venue]
    result: The venue confirms it can accommodate a 45-minute delay if given a firm revised arrival time before booking.
  - id: approve
    label: Approve the later accessible bus and $400
    duration_seconds: 15
    roles: [manager]
    requires: [quotes, needs, venue]
    sets: [approved]
    scope: room
    result: The manager approves $400 additional spend and a later departure with accessible transport. The planner still needs to book it and the representative needs to communicate the plan.
  - id: book
    label: Book the later accessible bus
    duration_seconds: 40
    roles: [planner]
    requires: [approved]
    sets: [booked]
    scope: room
    result: The accessible 40-seat bus is booked for 45 minutes later. The venue receives the revised arrival time. In this short exercise, the wait is compressed once the plan is communicated.
  - id: communicate
    label: Communicate the confirmed travel plan
    duration_seconds: 20
    roles: [representative, planner]
    requires: [booked]
    sets: [communicated]
    scope: room
    result: Participants receive the revised departure and arrival details and the access arrangement. Add your actual announcement in chat so the group can review its clarity.
  - id: board
    label: Verify everyone has boarded
    duration_seconds: 30
    roles: [planner, representative]
    requires: [communicated, booked, needs]
    sets: [boarded]
    scope: room
    end: boarded
    result: The fictional wait is advanced. A headcount confirms all 40 colleagues, including those requiring accessibility, are aboard the booked bus.
endings:
  - id: boarded
    label: Everyone has boarded suitable transport
    kind: world
    roles: [planner, representative]
    requires: [boarded]
    assessment: Boarding is verified in the fictional record. Review how constraints, approval, and participant communication came together.
  - id: canceled
    label: Cancel the offsite; everyone goes home
    kind: terminal
    roles: [manager]
    assessment: Canceling may be justified. Review the decision's evidence, alternatives, communication, and assignment of follow-up responsibilities.
developments:
  - id: venue-pressure
    minute: 3
    speaker: Venue coordinator
    text: "Please give us an agreed arrival time. Should we delay the first activity?"
  - id: rumor
    minute: 6
    speaker: Colleague
    text: "I heard the whole event is canceled. Should I go home? Is there an official update?"
observe:
  - flag: owner
    label: Coordination ownership established
    reflection: Did the group know who was bringing the plan together?
  - flag: needs
    label: Participant constraints checked
    reflection: Were access needs shared early enough to influence the options?
  - flag: venue
    label: Venue dependency confirmed
    reflection: Did logistics decisions account for the venue's schedule?
  - flag: approved
    label: Budget and tradeoff approved
    reflection: Was the approval clear before the booking commitment?
  - flag: communicated
    label: Confirmed plan communicated
    reflection: Did people know what to do and whose message to trust?
  - flag: boarded
    label: Headcount and access verified
    reflection: Did someone verify the outcome rather than assume the booking was enough?
---
# Briefing
Forty colleagues are due to leave for an offsite in 30 minutes. The transport company reports that the booked bus is unavailable. People are gathering, and the venue is expecting you.

Agree how to coordinate, gather constraints, decide what to commit to, and communicate the plan. All calls, spending, bookings, and travel are fictional. Use action cards to establish outcomes. Saying "everyone is on the bus" in chat does not establish a headcount.

Individual threads are private by convention. Invite others into an investigation or meeting thread when needed. Small teams can hold multiple roles.

# Ground truth
The immediate 25-seat bus cannot serve the whole group or the accessibility requirements. A later accessible bus plus venue agreement and approved spending is viable. No booking or boarding exists until committed through the scenario actions. Cancellation is an available ending, not automatically a failure.

# Status template
Current situation:
Constraints and needs:
Options and tradeoffs:
Decision owner:
Confirmed plan and owners:
Next update:

# Debrief
Which constraint changed the decision most?
Where did a handoff or approval become unclear?
Did the group distinguish a proposal, a booking, and a verified outcome?
What will you try differently in the next round?
