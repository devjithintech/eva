import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/**
 * CIAV-4 · chatSlice
 * Manages:
 *  - isOpen:   whether the ChatPanel is slid open
 *  - messages: array of chat message objects
 */
export type MessageRole = "user" | "bot";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  /** ISO timestamp string */
  ts: string;
  /** Optional meta for bot responses (card type, source, etc.) */
  meta?: Record<string, unknown>;
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
}

const initialState: ChatState = {
  isOpen: false,
  messages: [],
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    /** Slide the panel open */
    openChat: (state) => {
      state.isOpen = true;
    },
    /** Slide the panel closed */
    closeChat: (state) => {
      state.isOpen = false;
    },
    /** Toggle open/closed */
    toggleChat: (state) => {
      state.isOpen = !state.isOpen;
    },
    /** Append a message */
    addMessage: (state, action: PayloadAction<Omit<ChatMessage, "id" | "ts">>) => {
      state.messages.push({
        ...action.payload,
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
      });
    },
    /** Clear all messages ('New chat') */
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const { openChat, closeChat, toggleChat, addMessage, clearMessages } =
  chatSlice.actions;

export const chatReducer = chatSlice.reducer;
