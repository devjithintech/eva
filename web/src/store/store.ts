/**
 * CIAV-4 · Redux store
 * Combines chatSlice, candidatesSlice, and ciaApi (RTK Query).
 * Wrap <App> with <Provider store={store}> in main.tsx.
 */
import { configureStore } from "@reduxjs/toolkit";
import { ciaApi } from "./ciaApi";
import { chatReducer } from "./chatSlice";
import { candidatesReducer } from "./candidatesSlice";

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    candidates: candidatesReducer,
    [ciaApi.reducerPath]: ciaApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(ciaApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
