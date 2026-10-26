---
id: wedding-traffic
title: The DJ is stuck in traffic
category: Wedding coordination
author: Rehearsal team
version: 1
exercise_minutes: 10
debrief_minutes: 5
summary: Protesters have blocked traffic near the wedding. The DJ and some guests are delayed. Coordinate a revised plan without leaving the couple, venue, or guests guessing.
characters:
  - id: dj
    name: DJ
    knowledge: You and your sound equipment are in stationary traffic behind a protest roadblock. Your current estimate is 45-75 minutes, not a confirmed arrival time. You can share the agreed entrance playlist remotely, but cannot operate the venue equipment from the road.
    instruction: Answer as the delayed DJ. Distinguish estimates from confirmed facts, ask who owns the revised schedule, and do not claim a road has reopened or equipment has been tested.
    fallback: I am still stopped with the equipment. My estimate is 45-75 minutes, but it is uncertain. I can share the entrance playlist. Who is coordinating the revised schedule and when should I update you?
  - id: delayed-guest
    name: Delayed guest
    knowledge: Eighteen guests are delayed, including a grandparent the couple hoped would attend the ceremony. Some passengers need somewhere to sit when they arrive. Your group has heard contradictory rumors about whether the wedding is canceled.
    instruction: Represent the delayed guests and ask for one official update. Do not invent a safe route, confirmed arrival time, or a decision on behalf of the couple.
    fallback: Our group is still delayed, including a grandparent. Is the ceremony moving, and who will send the official plan? Please arrange seating when we arrive and tell us when the next update is due.
roles:
  - id: coordinator
    name: Wedding coordinator
    responsibility: Bring facts and options together, name decision owners, and maintain one agreed running order.
    authority: Coordinate suppliers and propose schedule changes; the couple's representative approves significant changes.
    knowledge: The ceremony is planned for 19:00 and dinner for 19:30. The DJ supplies the main sound system, but the venue may have a backup. Several helpers are independently messaging guests.
    hint: Separate the DJ delay, guest delay, and venue constraints. Assign one person to each conversation and return decisions to Coordination.
  - id: couple-representative
    name: Couple's representative
    responsibility: Gather the couple's priorities, protect their attention, and approve a revised plan on their behalf.
    authority: Approve the revised running order or stop the event after consulting the couple.
    knowledge: The couple wants the delayed grandparent included if practical. They prefer a calm celebration over the original timetable and can accept a later ceremony or a simple audio setup. They have not approved either option yet.
    hint: State whose absence matters to the decision and what tradeoffs the couple accepts. Do not turn a preference into a guaranteed arrival requirement without checking.
  - id: venue-lead
    name: Venue lead
    responsibility: Check venue equipment, catering timing, staffing, and the handover into the revised event.
    authority: Test venue audio and commit venue staff to an approved running order.
    knowledge: A wired microphone and small speaker are available but untested. Dinner can start at 19:30 even if the ceremony moves later. Amplified music must end at 23:00; delaying everything may shorten the party.
    hint: Confirm what the backup can actually do. Give options with their dependencies and limits, then acknowledge the chosen plan to staff.
  - id: guest-liaison
    name: Guest liaison
    responsibility: Establish who is delayed, collect arrival needs, and issue one consistent guest-facing update.
    authority: Confirm guest impact and communicate the approved plan; do not promise road clearance or arrival times.
    knowledge: Eighteen guests are delayed in several vehicles. You do not yet have a reliable list of key participants or arrival needs. People already at the venue are asking whether to sit down or wait outside.
    hint: Check both delayed and already-arrived guests. Give a useful instruction, a contact person, and a next-update time without presenting estimates as facts.
actions:
  - id: owner
    label: Accept wedding coordination
    roles: [coordinator]
    sets: [owner]
    scope: room
    result: A coordination owner is recorded. Assign supplier contact, guest updates, venue checks, and approval responsibilities in chat.
  - id: supplier-status
    label: Confirm the DJ's status and equipment dependency
    roles: [coordinator]
    sets: [dj-status]
    result: The DJ and main sound equipment remain stopped. The 45-75 minute estimate is uncertain. The DJ can share a playlist but cannot confirm road clearance or operate the venue audio remotely.
  - id: guest-impact
    label: Confirm delayed guests and arrival needs
    roles: [guest-liaison]
    sets: [guests]
    result: Eighteen guests are delayed, including a grandparent important to the couple. Seating on arrival is needed. No confirmed arrival time exists. Record how delayed and already-arrived guests will receive updates.
  - id: venue-options
    label: Confirm venue and catering options
    roles: [venue-lead]
    sets: [venue]
    result: Dinner can begin at 19:30 before a later ceremony, or the ceremony can use simple venue audio. Amplified music still ends at 23:00. The venue needs a revised running order and a named contact before changing staff assignments.
  - id: audio-check
    label: Test the backup microphone and playlist setup
    roles: [venue-lead]
    sets: [audio]
    result: A fictional sound check confirms the wired microphone and speaker work for speech and a simple entrance playlist. This is a usable fallback, not the full DJ setup. Assign who will operate it.
  - id: couple-priorities
    label: Confirm the couple's priorities and acceptable tradeoffs
    roles: [couple-representative]
    requires: [guests, venue]
    sets: [priorities]
    result: The couple accepts either a short scheduled delay with dinner first, or a simpler ceremony with a clear way to include the delayed grandparent. They want one coordinator and consistent updates, not repeated requests from several helpers. A specific running order still needs approval.
  - id: approve-plan
    label: Approve the revised wedding plan
    roles: [couple-representative]
    requires: [owner, dj-status, guests, venue, audio, priorities]
    sets: [approved]
    scope: room
    result: The couple's representative approves the plan the team has stated in Coordination. Write the chosen first segment, how the grandparent will be included, the audio operator, decision owner, and next-update time. This approval does not establish that delayed people have arrived.
  - id: notify
    label: Issue the approved guest and supplier update
    roles: [guest-liaison, coordinator]
    requires: [approved]
    sets: [notified]
    scope: room
    result: The approved plan reaches guests at the venue, delayed guests, the DJ, and venue staff. Add the actual announcement in chat for review. Distinguish confirmed arrangements from travel estimates and explain what people should do now.
  - id: handover
    label: Verify the agreed first segment has started
    roles: [venue-lead, coordinator]
    requires: [approved, notified, audio]
    sets: [started]
    scope: room
    end: event-started
    result: Fictional time advances to the agreed first segment. Venue staff acknowledge their assignments, the audio operator is ready, and guest contacts know the next update time. The celebration proceeds under the revised plan; the DJ and delayed guests are not assumed to have arrived.
endings:
  - id: event-started
    label: The revised wedding plan is underway
    kind: world
    roles: [venue-lead, coordinator]
    requires: [started]
    assessment: The first agreed segment is verified. Review the clarity of approval, guest communication, uncertainty, and handover rather than whether the original timetable was preserved.
  - id: stop-event
    label: The couple decides to stop the event
    kind: terminal
    roles: [couple-representative]
    assessment: Play stops because the couple's representative has confirmed the decision. Review the reasoning, how guests and suppliers were informed, and who owns follow-up. Stopping is not automatically a failure.
developments:
  - id: uncertain-eta
    minute: 2
    speaker: DJ
    text: "Traffic is still stopped. Please do not announce my estimate as a confirmed arrival. Do you need the playlist, and who is my contact now?"
  - id: guest-rumor
    minute: 5
    speaker: Delayed guest
    text: "Someone said the wedding is canceled, but another person says the ceremony already started. What is the official plan, and when will you update us?"
  - id: kitchen-check
    minute: 7
    text: "The kitchen needs one confirmed running order. Which segment starts next, who approved it, and who is telling the guests?"
observe:
  - flag: owner
    label: One coordination owner established
    reflection: Did helpers know whom to update and who could approve changes?
  - flag: dj-status
    label: Supplier estimate and dependency checked
    reflection: Did anyone confuse a travel estimate with a commitment or forget the sound equipment?
  - flag: guests
    label: Guest impact and arrival needs represented
    reflection: Were key participants and people already at the venue considered before deciding?
  - flag: audio
    label: Backup capability verified
    reflection: Did someone test and assign the fallback rather than assume that a playlist solved the audio problem?
  - flag: approved
    label: Revised plan explicitly approved
    reflection: Did the couple's priorities shape the decision, and could everyone repeat the chosen plan?
  - flag: notified
    label: One consistent update shared
    reflection: Did every audience know what to do now, who to contact, and when to expect another update?
  - flag: started
    label: Event handover verified
    reflection: Did venue staff acknowledge the plan before anyone declared the situation handled?
---
# Briefing
It is 18:40 at a wedding venue. The ceremony is planned for 19:00. Protesters are blocking traffic nearby; the DJ, the main sound equipment, and eighteen guests are delayed. Guests already at the venue are asking what happens next. Several well-meaning helpers are sending different messages.

You are the wedding coordination team. Establish responsibilities, check the couple's priorities, work out what the venue can support, and agree a clear plan for guests and suppliers. This exercise is about coordination under uncertainty; the protest is the cause of the disruption, not something the team controls.

All calls, sound checks, schedule changes, and event outcomes are fictional. Use action cards to record confirmed outcomes and chat to make the reasoning, ownership, and announcements clear. Address `@DJ` or `@Delayed guest` in a public thread to ask a fictional colleague a question. Individual role threads remain private by convention. One person may hold several roles.

# Ground truth
No road-clearance time or guest arrival is confirmed. The DJ's equipment delay is a separate dependency from the guests' delay. Venue audio works once tested; dinner-first and a simpler ceremony are both viable if the couple approves and the delayed grandparent is considered. There is no single preferred running order. Approving a plan does not prove it was communicated or started. Do not turn the travel disruption into a fictional emergency or invent control over protesters, roads, or authorities.

# Status template
Confirmed situation and affected people:
Uncertain estimates and next checks:
Couple's priorities:
Chosen running order and decision owner:
Venue/audio/supplier owners:
Guest instruction and official contact:
Next update time:

# Debrief
Who had information that another role needed earlier?
Where did different helpers accidentally create conflicting instructions?
Which estimate was most tempting to present as a fact?
How did the couple's priorities change the options?
What confirmed that the plan had reached guests and venue staff?
Replay with a different running order or swap responsibilities. Compare how the team coordinates, not just whether it starts on time.
