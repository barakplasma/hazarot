import posthog from 'posthog-js';
import { POSTHOG_KEY, POSTHOG_HOST, PRODUCTION_HOST, sanitizeBrowserEvent, safeDetails } from './config.js';
const enabled = location.hostname === PRODUCTION_HOST;
let ready = false;
if (enabled) { try {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST, defaults: '2026-05-30',
    autocapture: false, capture_pageview: false, capture_pageleave: false,
    capture_dead_clicks: false, capture_heatmaps: false, capture_performance: false,
    capture_exceptions: false, disable_session_recording: true, disable_surveys: true,
    disable_external_dependency_loading: true, advanced_disable_flags: true,
    person_profiles: 'never', persistence: 'memory', respect_dnt: true,
    before_send: sanitizeBrowserEvent,
  });
  ready = true;
  const room = new URLSearchParams(location.search).get('room');
  posthog.capture('$pageview', /^[a-f0-9]{8}$/.test(room || '') ? { room_id: room } : {});
} catch { /* Analytics never blocks play. */ } }
export function trackCommand(details) {
  if (ready) { try { posthog.capture('rehearsal_ui_command', safeDetails(details)); } catch { /* Analytics never blocks play. */ } }
}
