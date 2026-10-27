# Room creation and entry

The site and scenario catalog are public. Creating a room requires the creator
certificate bundle. Knowing an existing room ID grants permission to join it;
participants then receive separate session tokens so role and facilitator checks
continue to apply. There is no public room directory.

New IDs are the complete 16-character random suffix of a cryptographically
generated ULID (80 random bits). The timestamp is omitted; this is a short ULID
suffix, not a full sortable ULID. The monotonic generator is never used. Existing
eight-character rooms retain their separate invitation requirement.

## Android Chrome

Download `hazarot-room-creator.json`. Open Hazarot, select a scenario, enter a name,
and select the downloaded file under **Room creator certificate**. Create the
room and share **Invite participants** with the group. Joining a room does not
require the creator file. Select the file again after reloading the setup page.

This is not mTLS. Do not install the file as an Android system certificate.
The bundle includes a self-signed X.509 certificate and its PKCS#8 private key.
Web Crypto imports the key locally and signs a five-minute server challenge
bound to the exact room-creation intent and Hazarot origin. The request sends
only the intent and signature. The server verifies against the pinned public key;
it does not maintain a CA, identity provider, cookies or a user directory.

Treat the bundle as a password: anyone possessing it can create rooms until it
expires or its public key is replaced. This grants no right to enumerate rooms
or impersonate a participant in an existing room. The certificate's public key,
origin and expiry are deployment configuration; the private key is never deployed
or committed. Certificate pinning and the configured expiry are authoritative,
not a browser TLS certificate chain.

## Automation and retention

An authorized operator or assistant can retain the same private bundle and use:

```sh
node scripts/create-room.mjs --certificate /private/hazarot-room-creator.json \
  --scenario wedding-traffic --roles coordinator --name Facilitator \
  --session-file /private/hazarot-session.json
```

Only the room link and session-file path are printed. The participant token goes
into the private session file. The issued user bundle is retained separately for
the user and future authorized assistant work; it is absent from Git and images.

To issue a replacement:

```sh
node scripts/issue-creator.mjs .tools/replacement-creator.json https://hazarot.526462738.xyz
```

Pin the reported `publicKeySpki` as `CREATOR_PUBLIC_KEY_SPKI`, `expiresAt` as
`CREATOR_CERT_EXPIRES_AT`, and the site origin as `CREATOR_ORIGIN`. Replacement
revokes creation with the old key. Existing rooms and participant sessions remain
independent. Missing, expired or invalid configuration denies creation.

The public HTTP Agent initializer is disabled. Server-side initialization is
undecorated SDK RPC, inaccessible to WebSocket client RPC. Creation retries reuse
the allocated room while the signed challenge remains valid.

## Inference allowance

The private singleton Authority Agent reserves an attempt before a coach or
character may call inference. All rooms share durable counters. Defaults:

| Setting | Default |
|---|---:|
| `AI_DAILY_CALLS` | 100, UTC day |
| `AI_ROOM_CALLS` | 20 |
| `AI_MINUTE_CALLS` | 6 |
| `AI_CONCURRENT_CALLS` | 2 |

Failed attempts count conservatively. Duplicate turns cannot request another
paid attempt, concurrency leases expire after 30 seconds, calls time out after
12 seconds, and provider retries are disabled. Context is limited to 20 KB of
JSON, with oldest conversation context removed first; output is capped at
350 tokens for coaching and 220 for characters. Invalid limit configuration
fails closed to authored replies. Chat, actions and debrief continue when AI
allowances are exhausted. These limits do not establish a hard dollar budget or
limit other applications sharing the OpenRouter key.

## PostHog and logs

At the owner's request, PostHog receives actual room IDs and participant names
for correlation and access to rehearsals. Room IDs therefore are intentionally
shared with that trusted analytics project. It receives no creator certificate,
private key, participant token, inference credential, chat text, prompt or reply.
The browser credential input has no autocapture or session replay. Keep room
links within the intended group and trusted tooling.
