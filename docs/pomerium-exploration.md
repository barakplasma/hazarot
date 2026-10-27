# Pomerium Core exploration

Research date: 27 October 2026. This is a separate research workstream from Hazarot's immediate authentication change; it does not represent a separately created ChatGPT conversation. No services were deployed and no identity-provider access was granted.

## Recommendation

Keep Pomerium out of Hazarot's immediate auth fix. Evaluate it later as a common access layer for several homelab applications. This is a judgment based on the components below: its strengths are centralized identity policy and consistent access enforcement across services, while Hazarot currently needs one small gate plus inference limits.

Pomerium Core is Apache-2.0 open source. It can run as one binary or container with YAML configuration; four logical services do not require four separate deployments. A self-hosted setup still needs an OAuth/OIDC identity provider, an authenticate hostname, TLS, route policies, secrets and session-state storage. The default hosted authenticate service is an external dependency; configure the self-hosted authenticate service explicitly if avoiding that dependency.

## What passkeys mean here

Pomerium's built-in WebAuthn feature establishes device identity in addition to the user's IdP identity. It is not documented as a standalone passkey user directory that removes the IdP. A passkey-first IdP could sit behind Pomerium's normal OIDC integration, at the cost of another service.

Core supports self-enrollment of a device and immediate access when its policy permits it. Enterprise adds pending approval, administrative enrollment links and device-management UI. Therefore, a policy requiring a registered device must still restrict which user identities may access the application; self-enrollment by itself is not an allowlist.

## Smallest useful later spike

1. Use one disposable test hostname and an innocuous demo backend. Do not initially replace the cluster's default ingress or expose administrative services.
2. Run a pinned Core release as a single replica with persistent file-backed Databroker storage. Validate this option against the selected release; it avoids a Postgres dependency for a small, non-HA experiment.
3. Use a self-hosted OIDC IdP if avoiding hosted authentication is important. Configure an explicit small user allowlist and deny everyone else.
4. Test identity denial, logout, expiration, restart persistence and direct-upstream isolation. Enable WebSockets explicitly and select bounded idle/lifetime settings for applications that need them.
5. Test a separate machine identity with a short-lived, audience-bound JWT and narrow route policy if the chosen release supports the current documented bearer-token feature. Do not use a human passkey for unattended automation.
6. Only after the demo passes, consider moving multiple homelab applications behind it. Keep app-specific authorizations and usage budgets in their applications.

The current Kubernetes ingress-controller installation is a broader integration: its documentation lists Linux amd64/arm64 support, PostgreSQL, certificate management, CRDs, RBAC, a bootstrap job and an IngressClass. That is useful for cluster-wide GitOps-managed policy, but unnecessary for the first one-route experiment. Core's general persistence documentation also supports a single-instance file backend; do not assume Postgres is mandatory for every deployment merely because it appears in the ingress-controller prerequisites.

## Budget boundary

Pomerium can decide who reaches Hazarot. It cannot establish an OpenRouter spending limit from an HTTP authorization decision alone. App-side model-call limits, token/input bounds and a provider key budget remain separate controls. WebSocket admission also does not replace authorization and limits on each spend-triggering command after the connection opens.

## Primary sources

- Repository and Apache-2.0 license: https://github.com/pomerium/pomerium
- Core installation and YAML configuration: https://www.pomerium.com/docs/deploy/core
- IdP dependency and hosted-authenticate default: https://www.pomerium.com/docs/reference/identity-provider-settings
- Architecture and logical services: https://www.pomerium.com/docs/internals/architecture
- WebAuthn and Core/Enterprise enrollment differences: https://www.pomerium.com/docs/integrations/device-context/webauthn
- File and Postgres persistence: https://www.pomerium.com/docs/internals/data-storage
- Kubernetes ingress installation: https://www.pomerium.com/docs/deploy/k8s/install
- Explicit WebSocket support and timeouts: https://www.pomerium.com/docs/reference/routes/timeouts
- Current documented machine JWT access: https://www.pomerium.com/docs/capabilities/bearer-token-access

Documentation describes current behavior and may differ from older pinned releases. No resource footprint or deployment performance was measured.
