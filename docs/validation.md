# Phase-zero validation

## Verified in this workspace

- TypeScript typecheck passed.
- Both Markdown scenario files passed the build validator.
- Sixteen backend checks passed using celld 0.6.3 and Agents 0.30.1.
- Real HTTP and WebSocket clients exercised the runtime, not a mocked Agent.
- The actual Vercel AI SDK called a local protocol fixture. No live model was used.
- Participant data and transcript survived a graceful process restart.
- Both domain-specific endings, premature all-clear, cancellation, and timeout
  were exercised; post-ending world changes were rejected.
- A prebundled `no_bundle` runtime starts with no Node/npm/esbuild on PATH;
  static assets, inference environment bindings, and authenticated room creation work.
- GitHub CI completed all browser workflows. The initial run caught a missing
  favicon; the icon correction passed the overall browser check on a later run.

## Browser validation blocked

The managed preview could not start celld dev because its environment does not
provide `/proc/self/exe`. A standalone Playwright attempt obtained Chromium but
the executor denied the Unix socket needed for Chromium's process singleton.
No browser UI test passed in that environment, and screenshot/fidelity validation
is not claimed. A runnable browser test suite and GitHub CI workflow are included
so the actual interface can be checked on a normal runner.

## Not verified

- Live model response quality, latency, or coaching effectiveness.
- Human learning or transfer to unfamiliar scenarios.
- Docker build, Kubernetes deployment, abrupt-crash consistency, multi-node
  failover, or production object-storage compatibility.

## Repeat-run finding

A later test invocation reusing a development store reported `database disk
image is malformed`, followed by celld refusing writes with `DurabilityUnproven`.
The cause was not established. The harness now gives each invocation a fresh,
isolated store while still restarting against that same store within its recovery
test. This prevents independent test invocations sharing old state; it is not a
claim that the underlying corruption issue has been fixed. Keep phase zero
disposable and verify the normal cluster filesystem before trusting retained data.

The earlier minimal spike established Agents routing, state synchronization,
scheduling, and graceful restart recovery on local celld. The phase-zero suite
adds application behavior; it does not establish production readiness.

## Current update: analytics, transport, and characters

The local celld suite passes 20 checks, including character-specific SDK Agents,
private context exclusion, character memory across graceful restart and room
isolation, personalized WebSocket state, and large snapshot chunking. PostHog
payload tests inspect actual SDK requests to a local ingestion fixture and verify
that room IDs and participant names remain while credentials and dialogue do not.
The runtime smoke test also checks fresh CSP nonces, allowed analytics endpoints,
and the absence of unsafe-inline/unsafe-eval. Browser and image validation for
this update are recorded in its GitHub Actions run; local browser execution remains
subject to the executor limitation described above.
