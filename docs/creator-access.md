# Room creation access

The site and scenario catalog are public. Open your private admin setup link once
on each browser to enable room creation. Its `#admin=…` fragment is consumed into
local storage and immediately removed from the address bar before PostHog starts.
This works in Android Chrome without importing a file or installing a certificate.
Use **Forget admin access** in room setup to remove it from that browser.

The link is a reusable bearer credential: anyone holding it can create rooms.
Keep it out of chats, screenshots, Git and analytics. Use HTTPS. Browser extensions
and same-origin JavaScript can access local storage; this is intentionally a small
shared-admin scheme, not mTLS or per-user authentication.

The browser sends the token only in the Authorization header of `POST /api/runs`.
The server stores only `CREATOR_TOKEN_SHA256`, a lowercase hex SHA-256 digest of a
32-byte random base64url token. Missing or invalid configuration denies creation.
For a full installation, `node scripts/setup.ts --origin https://your-host.example`
writes private configuration, the admin link, and a separate digest file. Docker
can run this setup tool without installing Node on the host; see [hosting](hosting.md).
The older `node scripts/issue-admin.mjs` remains available for issuing just a link.
Rotate by issuing another token and deploying its digest; previous browser tokens
stop working. No certificate, signature challenge, or passkey implementation remains.

Room links contain independent 16-character ULID random suffixes (80 random bits),
not the admin token. They grant joining access; participant session tokens still
control individual actions. Legacy eight-character room IDs still require their
original invite secret. No public room list is provided.

Creation request IDs are durably idempotent. A retry returns the same room;
reusing the ID with different settings fails. Public Agent initialization and
client RPC initialization remain disabled.

For authorized assistant automation, retain the setup URL in a private JSON file:

```sh
node scripts/create-room.mjs --admin-file /private/hazarot-admin.json \
  --scenario wedding-traffic --roles coordinator --session-file /private/session.json
```

The file has a single `url` property. The script prints only the new room link;
participant credentials go to the private session file.

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
shared with that trusted analytics project. It receives no admin setup token, participant token, inference credential, chat text, prompt or reply.
The browser credential input has no autocapture or session replay. Keep room
links within the intended group and trusted tooling.
