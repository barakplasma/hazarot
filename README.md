# Hazarot

Short team coordination rehearsals. Practice rare or sensitive situations before
the real event: responsibilities, shared information, decisions, approvals,
stakeholder updates, and handoffs. This is a phase-zero proof of concept.

## What works

- A static HTML/CSS/JavaScript chat interface with real WebSocket updates.
- One Cloudflare Agent per room, running on self-hosted celld.
- 1–10 participants; each can hold multiple responsibilities for small groups.
- A shared coordination feed, individual role/coaching threads, and work threads.
- Four Markdown scenarios: **CI credentials exposed**, **The bus isn't coming**, **The DJ is stuck in traffic**, and **The agent approved its own access**.
- Confirmed fictional actions, role authority, and explicit approval prerequisites.
- Timed developments, pause/resume, time limits, and scenario-defined endings.
- Declaration endings can be premature; verified world endings need recorded facts.
- An evidence-linked authored debrief, reflection chat, transcript export, and replay.
- Authored coaching without inference; optional AI coaching via any compatible
  OpenAI chat-completions server using the Vercel AI SDK.

No Ax, Effect, Workers AI, Cloudflare account, or external platform is required
at runtime. No commands affect real infrastructure, bookings, or people.

## Run locally

Use Node.js 24+ and celld **0.6.3** from
<https://github.com/denoland/celld/releases/tag/v0.6.3>.
Put `celld` on PATH, or set `CELLD_BIN` to its executable path.

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:9876>. Select a scenario, enter your name, choose one or more
roles, and create a room. Use **Invite participants** before starting. Each teammate
opens the link and joins with their own name and roles. The facilitator starts
the round. For a solo walkthrough, select every role yourself.

Use work threads for investigations or meetings. Use **Ask coach** for guidance;
replies appear in your individual thread. **Use status template** inserts an
editable template into the composer. Discussion does not implicitly change the
fictional world: use a role-authorized action card and confirm it. The incident
commander can declare all clear; in the offsite scenario, a boarding action must
establish the actual fictional outcome. Endings start the debrief immediately.

Replay returns you to setup and creates a new room when you submit. Invite the
team again, optionally rotate roles, and try another strategy. Prior messages,
evidence, model callbacks, and commitments are not copied into that new run.

The round clock is server-owned. The debrief has a suggested five-minute duration;
it does not forcibly close reflection chat. Joining closes once a round starts.

## Inference

Copy `.dev.vars.example` to `.dev.vars` and set:

```dotenv
MODEL_BASE_URL=http://inference.internal:8000/v1
MODEL_NAME=your-model-name
# Optional if your inference server requires it:
MODEL_API_KEY=your-key
```

Restart the app after changing configuration. `MODEL_BASE_URL` must include the
API prefix (usually `/v1`); the provider calls `/chat/completions`. This supports
an internal vLLM or similar service. No Cloudflare model binding is used. The
endpoint is operator configuration and cannot be supplied by a scenario or browser.

Only the caller's role knowledge, their personal thread, and shared work/room
messages are sent to coaching inference. Hidden ground truth and other personal
threads are excluded. AI output cannot commit actions, change facts, or end play.
Calls have a 12-second timeout and no automatic transport retries. Failure falls
back to explicitly labeled authored coaching. Model quality is not guaranteed by
the protocol tests; use human pilots before relying on coaching judgments.

**No live model was used for the recorded phase-zero test run.** The integration
suite exercises the actual AI SDK against a local OpenAI-compatible protocol
fixture, including error fallback and an ending during an in-flight request.

## Tests

```sh
npm run build
npm run typecheck
npm test
npm run build:runtime
npm run test:runtime
npx playwright install chromium
npm run test:browser
```

The backend suite runs real celld and real Agents with headless HTTP/WebSocket
clients. It covers scenario validation, scoped data, invitations, authority,
approvals, duplicate/concurrent commands, both domains, scheduled developments,
timeouts, pause/restart/resume, endings, replay, model integration, and ten users.
The timer fixture exists only in the test project's generated catalog; there is
no public test-clock override endpoint.

The browser suite exercises two independent browser sessions, messages, work
threads, actions, coaching, templates, pause/resume, reload, mobile layout,
debrief, and replay. It saves screenshots and reports to ignored local paths.
Set `CHROMIUM_PATH` to use an existing Chromium installation if needed.

See [docs/validation.md](docs/validation.md) for what was actually verified.
The GitHub workflow runs backend and browser checks without external inference.

## Write a scenario

Add a `.md` file under `scenarios/`, following an included example, then run
`npm run build`. No application changes are needed to switch domains.

YAML front matter contains metadata, roles, a small action catalog, endings,
timed developments, and observation criteria. Markdown supplies the required
`# Briefing`, `# Ground truth`, `# Status template`, and `# Debrief` sections.
The build validates identifiers, role references, and action prerequisites.

The action model is intentionally small: an action has permitted roles,
prerequisite fact flags, fact flags it establishes, and authored result text.
It may trigger a verified ending. There are no expressions, scripts, integrations,
or model-created rules. Freeform requests outside that catalog need facilitator
judgment; arbitrary prose is not automatically compiled into executable behavior.

Information belongs in the relevant role card or action result. `scope: room`
posts a result in Coordination; otherwise the result is posted in the selected
thread. Change the scenario version when changing facts or rules. Active runs
require their pinned scenario version to remain available after an upgrade.

## Architecture

`src/index.ts` contains the Agent and request routing. `src/scenario.ts` parses
and validates Markdown. `src/coach.ts` makes scoped AI SDK calls. The client is
three static files under `public/`. `scripts/build.mjs` generates the server-only
catalog. The Agent stores its canonical run and transcript in SQLite; its SDK
state contains only a public protocol version. WebSockets notify clients to
refresh their authenticated snapshot. Client commands carry idempotency IDs.

The first committed ending wins. Future developments and fictional actions no
longer apply, while debrief discussion remains open. A debrief distinguishes
recorded action receipts from qualitative interpretations of the conversation.

This deliberately avoids a generic workflow engine, separate application
database, autonomous NPC framework, or transport plugin SDK. Rocket.Chat is a
possible later adapter, not a dependency of phase zero.

## Kubernetes proof of concept

The Dockerfile and `k8s/poc.yaml` provide a **single-replica celld dev-mode**
deployment with persistent local storage. This is not a production fleet or an
HA design. It requires normal `/proc` support and a writable persistent volume.

The final OCI stage is `ghcr.io/denoland/celld:0.6.3`. Node is only a build stage.
CI publishes a multi-architecture image for Linux ARM64 and AMD64.
The image contains a prebundled Worker and static files, uses `no_bundle: true`,
and runs without Node, npm, or esbuild at startup. The small entrypoint translates
the three inference environment variables into private celld Worker bindings.
The runtime smoke test verifies that mapping with an intentionally missing esbuild.

```sh
docker build -t rehearsal-poc:0.1.0 .
# Load/push that image into your cluster's registry and adjust the manifest image.
kubectl apply -f k8s/poc.yaml
kubectl port-forward service/rehearsal 9876:9876
```

For inference, optionally create a `rehearsal-model` Secret containing
`MODEL_BASE_URL`, `MODEL_NAME`, and, if needed, `MODEL_API_KEY`. The deployment
loads it through `envFrom`. A ConfigMap alone is insufficient for API keys.
Container and Kubernetes manifests are supplied but were not deployed in this
environment. For multiple nodes or production, configure celld's supported
bucket-backed fleet and validate recovery separately; do not scale this manifest.

## Boundaries and limitations

- Personal threads are **private by convention**. Every joined human can read
  them. AI context filtering is separate and enforced server-side.
- Invitation links and participant tokens are bearer capabilities. Tokens persist
  in that browser's local storage. Use trusted pilot groups; this is not SSO.
- New room IDs are the 16-character random suffix of a cryptographic ULID.
  Possessing the room link grants entry; no separate invitation password is needed.
  Legacy eight-character rooms still require their old invitation secret.
- Creating rooms requires an admin token installed by a special setup link.
  The URL fragment is cleared before analytics and the token stays in local storage.
  The deployment stores only its SHA-256 digest.
  See [creator access](docs/creator-access.md) for Android and automation usage.
- A singleton SDK Agent enforces inference limits across rooms and restarts.
  Defaults: 100 attempts/day, 20/room, 6/minute, 2 concurrent. Authored replies
  remain available after a limit is reached. These are request limits, not a
  provider-enforced dollar ceiling.
- Scenarios are trusted, operator-authored files. Client-rendered content uses
  text nodes, never raw scenario HTML. Do not publish the server catalog as assets.
- Authored observations are not employee scores. Facilitators should challenge
  interpretations and inspect the referenced messages.
- AI coworkers, GEPA, automatic freeform action execution, arbitrary scenario
  imports, thread ACLs, and measured human learning outcomes are outside phase zero.
- There is no built-in retention/deletion UI. The local `.celld/` directory holds
  rehearsal data and should be treated accordingly.

### Analytics

Optional PostHog analytics use the supplied public project key and US ingestion host.
The browser tracks page views and successful UI commands on `hazarot.526462738.xyz`;
celld tracks room creation, joins, committed commands, round endings, and coaching
completion/fallback with the official `posthog-node/edge` SDK. Set the Worker binding
`POSTHOG_ENABLED=true` to enable server events (the container entrypoint translates
this environment variable). It is off by default for local and test runs.

Allowed metadata includes room ID, participant ID and name, scenario ID, phase,
participant count, operation, ending reason, and coaching duration/source. No
invitation/session tokens, inference credentials, chat text, coaching questions,
model responses, or arbitrary request properties are sent. Browser URLs and referrers
are removed or replaced with the root URL before sending. Autocapture, session
replay, error capture, flags, surveys, and external SDK scripts are disabled. Browser
identity is memory-only; server events use the room ID as their analytics identity.
Analytics is best effort, with no server retries and a two-second timeout, and is
never required for a rehearsal to complete. The project key is public, not a secret.

The CSP allows Cloudflare's analytics beacon and PostHog ingestion. Each HTML
response carries a fresh CSP nonce for Cloudflare JavaScript detections, with
`Cache-Control: no-store`; `unsafe-inline` and `unsafe-eval` remain disallowed.

For a fictional coworker in a timed development, set `speaker: Release manager`
and put only dialogue in `text`. The transcript author is `Release manager - ai`;
omitting `speaker` leaves the author as `Game master`. Existing messages from
these named scenario developments are upgraded when rooms load; human messages
and ordinary narration are unchanged.

### Real-time transport and fictional colleagues

Authenticated WebSockets deliver a personalized full snapshot on connection and
incremental updates after committed changes. Reconnection resynchronizes from the durable record;
revision checks prevent stale HTTP command responses overwriting newer updates.
Large snapshots are chunked below the runtime's WebSocket frame limit. HTTP is
used for initial loading and command fallback, with no periodic snapshot polling.

Scenario front matter can define up to eight `characters`, each with `id`, `name`,
`knowledge`, `instruction`, and `fallback`. Address one at the start of a public
message, e.g. `@Release manager What update do you need?`. Each character gets its
own Cloudflare SDK Agent, addressed by room ID + character ID, with private SQL
memory separate from the coach and other characters. It receives only its profile,
its own past turns, and recent Coordination/current-public-thread messages. No
human personal threads, other character profiles, or hidden scenario ground truth
are passed. Model calls are bounded, with authored fallback and no tools. Characters
cannot commit simulation actions or endings. Pending replies are discarded if the
round pauses or ends. Character Agents are inaccessible through public routes.

The browser source is `src/browser-app.js`. The build bundles the SDK with the UI
and adds a content hash to the script URL, preventing a stale client after rollout.

### Response progress and fast chat

The current browser sends commands over the authenticated WebSocket and receives
small acknowledgments. A lost acknowledgment retries the same command ID through
HTTP, preserving deduplication. Protocol-2 clients receive only new messages with
updated room metadata; reconnect or a revision gap requests a full resynchronization.
The UI appends new transcript rows instead of rebuilding the history.

Coach requests acknowledge before inference completes. A visible activity bar
shows saving, connection recovery, and which AI colleague or coach is preparing a
reply, with elapsed time. Coaching progress is scoped to the requesting participant.
The draft stays intact if a command fails. Human chat remains usable during AI
inference; a busy character explicitly asks callers to retry after its current turn.
