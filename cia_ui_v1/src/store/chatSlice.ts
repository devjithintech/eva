import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: number;
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isTyping: boolean;
}

const initialState: ChatState = {
  isOpen: false,
  messages: [
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hey Morgan — I\u2019m ready to help you evaluate candidates. What would you like to know?',
      timestamp: Date.now(),
    },
  ],
  isTyping: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    openChat(state) {
      state.isOpen = true;
    },
    closeChat(state) {
      state.isOpen = false;
    },
    toggleChat(state) {
      state.isOpen = !state.isOpen;
    },
    addMessage(state, action: PayloadAction<Omit<ChatMessage, 'id' | 'timestamp'>>) {
      state.messages.push({
        ...action.payload,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      });
    },
    setTyping(state, action: PayloadAction<boolean>) {
      state.isTyping = action.payload;
    },
    clearMessages(state) {
      state.messages = [];
    },
  },
});

export const { openChat, closeChat, toggleChat, addMessage, setTyping, clearMessages } =
  chatSlice.actions;

export default chatSlice.reducer;
