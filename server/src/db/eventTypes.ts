/**
 * Stable ids for the AG-UI event kinds we persist into dbo.AgUiEventType
 * (the FK target for dbo.AgUiEvents.event_type_id). Ids are fixed — never
 * renumber; only append new kinds.
 */
export const AGUI_EVENT_TYPES = {
  RUN_STARTED: 1,
  RUN_FINISHED: 2,
  RUN_ERROR: 3,
  TEXT_MESSAGE_START: 4,
  TEXT_MESSAGE_CONTENT: 5,
  TEXT_MESSAGE_END: 6,
  TOOL_CALL_START: 7,
  TOOL_CALL_ARGS: 8,
  TOOL_CALL_END: 9,
  CUSTOM: 10,
} as const;

export type AgUiEventName = keyof typeof AGUI_EVENT_TYPES;

/** One AG-UI event to persist: its kind, the UI slot it targets, and payload. */
export interface RecordedEvent {
  name: AgUiEventName;
  uiSlot?: string;
  payload: unknown;
}
