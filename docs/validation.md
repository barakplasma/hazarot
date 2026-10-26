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

The earlier minimal spike established Agents routing, state synchronization,
scheduling, and graceful restart recovery on local celld. The phase-zero suite
adds application behavior; it does not establish production readiness.
