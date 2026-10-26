export const POSTHOG_KEY = 'phc_BgGyrPTT2qXbnS9Tjpqvvryr4RwuyGp4E59KiHxGdP3T';
export const POSTHOG_HOST = 'https://us.i.posthog.com';
export const PRODUCTION_HOST = 'hazarot.526462738.xyz';
// Only these metadata fields can cross the analytics boundary.
const fields = new Set(['participant_id', 'room_id', 'scenario_id', 'phase', 'participant_count', 'operation', 'status', 'duration_ms', 'coach_source', 'thread_kind', 'ending_reason']);
export function safeDetails(details = {}) {
  return Object.fromEntries(Object.entries(details).filter(([key, value]) => (key === 'participant_name' && typeof value === 'string' && value.length <= 40) || (fields.has(key) && (typeof value === 'number' || (typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value))))));
}
export function sanitizeBrowserEvent(event) {
  if (!event || !['$pageview', 'rehearsal_ui_command'].includes(event.event)) return null;
  const props = event.properties || {};
  const keep = ['distinct_id', '$lib', '$lib_version', '$insert_id', '$session_id', '$window_id'];
  event.properties = { ...Object.fromEntries(keep.filter(k => typeof props[k] === 'string').map(k => [k, props[k]])), ...safeDetails(props), token: POSTHOG_KEY, $current_url: `https://${PRODUCTION_HOST}/`, $pathname: '/', $process_person_profile: false, $geoip_disable: true };
  return event;
}
