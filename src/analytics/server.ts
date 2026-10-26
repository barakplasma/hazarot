import { PostHog } from 'posthog-node/edge';
// @ts-expect-error Shared JS metadata boundary is also used by the browser bundle.
import { POSTHOG_KEY, POSTHOG_HOST, safeDetails } from './config.js';
export type AnalyticsConfig = { POSTHOG_ENABLED?: string; POSTHOG_API_HOST?: string };
let client: PostHog | undefined;
export async function captureServer(env: AnalyticsConfig, event: string, details: Record<string, string | number>): Promise<void> {
  if (env.POSTHOG_ENABLED !== 'true') return;
  try {
    client ??= new PostHog(POSTHOG_KEY, { host: env.POSTHOG_API_HOST || POSTHOG_HOST, flushInterval: 0, fetchRetryCount: 0, requestTimeout: 2000, disableGeoip: true });
    await client.captureImmediate({ distinctId: String(details.room_id || 'hazarot-server'), event,
      properties: { ...safeDetails(details), source: 'celld', $process_person_profile: false }, });
  } catch { /* Best effort; analytics failures must never fail a command. */ }
}
