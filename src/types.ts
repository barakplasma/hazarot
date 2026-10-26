import type { CharacterProfile } from "./character";
export type Role = { id: string; name: string; responsibility: string; authority: string; knowledge: string; hint: string };
export type Action = { id: string; label: string; roles: string[]; requires?: string[]; sets: string[]; result: string; end?: string; scope?: "thread" | "room" };
export type Ending = { id: string; label: string; kind: "declaration" | "world" | "terminal"; roles: string[]; requires?: string[]; assessment: string };
export type Scenario = {
  id: string; title: string; category: string; author: string; version: number;
  exercise_minutes: number; debrief_minutes: number; summary: string;
  characters?: CharacterProfile[];
  roles: Role[]; actions: Action[]; endings: Ending[];
  developments: { id: string; minute: number; text: string; speaker?: string; requires?: string[] }[];
  observe: { flag: string; label: string; reflection: string }[];
  briefing: string; groundTruth: string; debrief: string; template: string;
};
export type Participant = { id: string; name: string; roles: string[]; token: string; host: boolean };
export type Thread = { id: string; title: string; kind: "coordination" | "personal" | "investigation" | "meeting"; owner?: string };
export type Message = { id: number; thread: string; author: string; participant?: string; text: string; at: number; kind: "message" | "system" | "receipt" | "coach"; refs?: number[] };
export type EndRecord = { reason: string; label: string; trigger?: number; at: number; assessment: string };
export type Run = {
  scenarioId: string; scenarioVersion: number; room: string; invite: string;
  phase: "lobby" | "active" | "paused" | "debrief"; participants: Participant[];
  threads: Thread[]; messages: Message[]; flags: Record<string, number>;
  processed: Record<string, unknown>; durationMs: number; elapsedMs: number;
  startedAt?: number; endsAt?: number; ended?: EndRecord; fired: string[];
  revision: number; seq: number;
};
