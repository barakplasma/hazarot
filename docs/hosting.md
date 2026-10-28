# Host Hazarot anywhere

Choose Docker Compose for a laptop or VM, the Helm chart for Kubernetes, or a
prebuilt bundle for a Linux VM without containers. All run the same prebundled
TypeScript Worker on celld 0.6.3. No Cloudflare account, external database, Ax,
Effect, Go, or build tools are needed by the application at runtime.

This remains a single-instance phase-zero deployment using celld's persistent
local dev store. Keep one writer per data directory. These recipes do not add
HA or make the previously observed local-store corruption risk disappear.

## Docker / a VM with Docker (recommended)

Clone this repository and run these commands from its root. Docker Compose v2 is
required. Setup uses a short-lived official Node 24 container; Node is absent
from the application image and need not be installed on the host.

```sh
# Linux/macOS: write the files as your host user.
docker compose run --rm --user "$(id -u):$(id -g)" setup --origin http://localhost:9876
docker compose up -d
curl --fail http://localhost:9876/health
```

Open the URL in `hazarot-admin.json` once in your browser. It installs the admin
token for room creation. Send participants their room link, never the admin link.
Setup writes `.env`, `hazarot-admin.json`, and `hazarot-creator.sha256` with mode
0600 and refuses to overwrite any of them. On Windows Docker Desktop, omit the
`--user` option; protect these files with your Windows account's permissions.

The image is `ghcr.io/barakplasma/hazarot:latest`, for Linux AMD64 and ARM64.
Only passing main builds update `latest`. To pin an immutable build, set
`HAZAROT_IMAGE=ghcr.io/barakplasma/hazarot:sha-<full-commit>` in `.env`.
If the package is private, authenticate to GHCR using a token with package-read
access. Alternatively build from the checked-out source:

```sh
HAZAROT_IMAGE=hazarot:local docker compose up -d --build
```

Docker mounts one named volume at `/app/.celld`. Stop/start and ordinary
`docker compose down` preserve it. `docker compose down -v` deletes it.
Use the same Compose project name/directory after moving or restoring a host.

### Public HTTPS with optional Caddy

Point a DNS hostname at your host and allow inbound TCP 80/443 (optionally UDP
443). On a fresh installation, issue the setup link for that hostname:

```sh
docker compose run --rm --user "$(id -u):$(id -g)" setup --origin https://rehearsal.example.com
docker compose -f compose.yaml -f compose.https.yaml up -d
```

Caddy obtains TLS certificates and proxies HTTP and WebSockets. Its certificate
data uses separate persistent volumes. The app's raw port binds to loopback;
Caddy reaches it on the Compose network. For an existing setup, retain the same
admin token: set `HAZAROT_DOMAIN` in `.env` and change only the origin of the URL
in your private admin file. A token is instance-scoped, not hostname-bound.

An existing ingress, Caddy, nginx, or other reverse proxy also works. Serve the
app at the hostname root, forward WebSocket upgrades, and allow long-lived
connections. Use HTTPS for remote browsers: the client uses secure-context Web
Crypto APIs. Plain HTTP on localhost is supported. Proxies that challenge API or
WebSocket requests can prevent automated clients from working.

### Inference and secrets

Authored coaching works immediately with no provider account. For optional AI,
edit `.env`, then recreate the app:

```dotenv
MODEL_BASE_URL=https://openrouter.ai/api/v1
MODEL_NAME=your-model-name
MODEL_API_KEY=your-private-provider-key
```

```sh
docker compose up -d --force-recreate hazarot
```

Any compatible chat-completions endpoint works, including an internal vLLM
service. Include `/v1` when your provider requires it. Inside a container,
`localhost` is that container, not your VM's model server. Use a reachable host
address or a service name on the same Docker network.

Prefer a mounted secret file if you already manage Docker secrets. The runtime
accepts `MODEL_API_KEY_FILE=/run/secrets/model-key`; add a Compose secret mount
and leave `MODEL_API_KEY` empty. Setting both fails startup. File read failures
also fail startup, and multi-line values are rejected without printing them.
Never put provider credentials into image build arguments, Helm values or Git.

The admin token stays in its private file/browser; only its SHA-256 digest is
passed to the app. Global inference limits remain enabled. PostHog server
analytics are off by default; browser analytics only run on the original owner's
hostname. No Cloudflare service is required for an installation on your hostname.

## Kubernetes / Helm

Use the same setup files above, or run `node scripts/setup.ts` once with Node 24+.
Helm 3 and a default dynamic StorageClass are required unless you supply an
existing PVC. The chart has no dependencies and no homelab-specific namespace,
registry credentials, ingress class, or CPU architecture affinity.

```sh
helm upgrade --install hazarot ./deploy/helm/hazarot \
  --namespace hazarot --create-namespace \
  --set-file creatorTokenHash=hazarot-creator.sha256
kubectl -n hazarot port-forward service/hazarot 9876:80
```

For a real hostname, issue/update the admin URL for that HTTPS origin and enable
an ingress compatible with your cluster, for example in an operator-owned file:

```yaml
image:
  tag: sha-REPLACE_WITH_A_PUBLISHED_COMMIT
# Optional for a private GHCR package; create the pull Secret in this namespace.
imagePullSecrets:
  - name: ghcr-pull
ingress:
  enabled: true
  className: nginx
  host: rehearsal.example.com
  tlsSecretName: rehearsal-tls
inference:
  baseUrl: https://openrouter.ai/api/v1
  model: your-model-name
  existingSecret: hazarot-inference
  secretKey: MODEL_API_KEY
```

Create the inference Secret through your existing secret manager or from a
private file (`kubectl create secret generic hazarot-inference -n hazarot
--from-file=MODEL_API_KEY=/private/model-key`). No provider value belongs in the
values file. The chart's ingress consumes an existing TLS Secret; certificate
issuance is owned by your cluster's ingress/certificate tooling.

Pass `-f /private/hosting-values.yaml` on install/upgrade. For storage overrides,
set `persistence.storageClass`, `persistence.size`, or `persistence.existingClaim`.
The Deployment uses one replica and Recreate, startup/readiness/liveness probes,
UID/GID 10001, no service-account token, and dropped capabilities. PVCs created
by the chart are retained when uninstalling. Back them up and delete intentionally
when no longer needed; reinstalls can reuse one with `persistence.existingClaim`.

The old `k8s/poc.yaml` is a legacy sample, not the recommended install path. The
Helm chart is the maintained portable Kubernetes configuration. The existing
homelab can continue using its common chart and the same OCI image.

## Linux VM without Docker

Download the `hazarot-vm-bundles` artifact from a successful GitHub Actions main
build. It contains `hazarot-linux-amd64.tar.gz` and `hazarot-linux-arm64.tar.gz`.
Choose the architecture of your VM. These bundle the upstream GNU/Linux celld
binary; use a compatible glibc-based distribution such as Debian or Ubuntu.

```sh
tar -xzf hazarot-linux-amd64.tar.gz
cd hazarot-linux-amd64
# One-time setup needs Node 24+. No npm install or TypeScript compiler is needed.
node setup.ts --dir app --origin https://rehearsal.example.com
./start.sh
```

The process listens on loopback port 9876. Put your existing HTTPS reverse proxy
in front. Configuration lives in `app/.env`; persistent state is `app/.celld`.
After one-time setup, `start.sh` starts only celld; Node is not a runtime
requirement. Keep the entire app directory writable by the service account.

For systemd, use the supplied `hazarot.service` as an example: install the bundle
under `/opt/hazarot`, create an unprivileged `hazarot` user, make that user own
`/opt/hazarot/app`, and install/enable the unit. It restarts failures and gives
celld up to 45 seconds for shutdown. `journalctl -u hazarot` shows runtime logs.
The sample paths are explicit so you can adapt them before installing it.

## Upgrades, backups, migration and rollback

1. Record the currently running image tag or VM bundle commit (`BUILD.txt`).
2. Stop the single writer. Back up its **entire** `.celld` directory while stopped,
   plus private configuration/admin files separately. Protect the backup like chat
   history and credentials. Do not copy an active local store.
3. Pull the new pinned image or unpack the new VM bundle in a separate directory.
   For VM upgrades, carry over `app/.celld` and `app/.env`; do not overwrite them.
4. Start one instance, check `/health` (`creatorConfigured:true`), reopen an existing
   room, exchange a message, and confirm the transcript survives. The stateless
   health endpoint can become ready before room ownership recovers after a move;
   allow up to 30 seconds for that recovery before diagnosing a restore failure.
5. To roll back across a state/schema change, restore the matching stopped-store
   backup and old image/bundle together. An old image alone may not understand
   newly written state. Do not run old and new writers against the same directory.

For Docker, stop with `docker compose stop hazarot`, then archive the named volume
using your backup tooling. For Kubernetes, scale the Deployment to zero and use
your CSI snapshot/export tooling before restoring it to one replica. For a VM,
stop the systemd unit and archive `app/.celld`. The same store layout can move
between these targets when the celld/app versions match; validate the restored
copy before relying on it. A host failure still needs a backup: a local volume
is not high availability.

Setup never rotates an existing credential silently. Generate a replacement in
a fresh directory, deploy its digest, and distribute the new private admin link.
The old admin token then loses room-creation access; existing room/session links
are independent. See [creator access](creator-access.md).
