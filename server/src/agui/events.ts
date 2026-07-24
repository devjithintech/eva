import { EventType, type BaseEvent } from "@ag-ui/core";

/**
 * Typed factories for the AG-UI events this agent emits. They return plain
 * protocol objects (cast to BaseEvent for the encoder) so call sites stay
 * readable and the field names are checked in one place.
 */
export const ev = {
  runStarted: (threadId: string, runId: string): BaseEvent =>
    ({ type: EventType.RUN_STARTED, threadId, runId }) as BaseEvent,

  runFinished: (threadId: string, runId: string): BaseEvent =>
    ({ type: EventType.RUN_FINISHED, threadId, runId }) as BaseEvent,

  runError: (message: string): BaseEvent =>
    ({ type: EventType.RUN_ERROR, message }) as BaseEvent,

  custom: (name: string, value: unknown): BaseEvent =>
    ({ type: EventType.CUSTOM, name, value }) as BaseEvent,

  textStart: (messageId: string): BaseEvent =>
    ({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" }) as BaseEvent,

  textContent: (messageId: string, delta: string): BaseEvent =>
    ({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta }) as BaseEvent,

  textEnd: (messageId: string): BaseEvent =>
    ({ type: EventType.TEXT_MESSAGE_END, messageId }) as BaseEvent,

  toolStart: (toolCallId: string, toolCallName: string, parentMessageId: string): BaseEvent =>
    ({ type: EventType.TOOL_CALL_START, toolCallId, toolCallName, parentMessageId }) as BaseEvent,

  toolArgs: (toolCallId: string, delta: string): BaseEvent =>
    ({ type: EventType.TOOL_CALL_ARGS, toolCallId, delta }) as BaseEvent,

  toolEnd: (toolCallId: string): BaseEvent =>
    ({ type: EventType.TOOL_CALL_END, toolCallId }) as BaseEvent,
};
