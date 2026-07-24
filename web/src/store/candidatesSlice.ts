import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/**
 * CIAV-4 · candidatesSlice
 * Manages:
 *  - activePipelineTab: which pipeline column is selected
 *  - filters:           active filter chips (key-value pairs)
 *  - sort:              current sort key + direction
 */

export type PipelineTab = "Scored" | "Shortlisted" | "Interview";

export interface CandidateFilter {
  key: string;
  label: string;
  value: string;
}

export type SortDirection = "asc" | "desc";

export interface CandidateSort {
  key: string;
  direction: SortDirection;
}

interface CandidatesState {
  activePipelineTab: PipelineTab;
  filters: CandidateFilter[];
  sort: CandidateSort;
}

const initialState: CandidatesState = {
  activePipelineTab: "Shortlisted",
  filters: [],
  sort: { key: "aiscore", direction: "desc" },
};

const candidatesSlice = createSlice({
  name: "candidates",
  initialState,
  reducers: {
    /** Switch pipeline tab */
    setPipelineTab: (state, action: PayloadAction<PipelineTab>) => {
      state.activePipelineTab = action.payload;
    },
    /** Add a filter (skips duplicate keys) */
    addFilter: (state, action: PayloadAction<CandidateFilter>) => {
      const exists = state.filters.find((f) => f.key === action.payload.key);
      if (!exists) {
        state.filters.push(action.payload);
      } else {
        // Overwrite existing key with new value
        Object.assign(exists, action.payload);
      }
    },
    /** Remove a filter by key */
    removeFilter: (state, action: PayloadAction<string>) => {
      state.filters = state.filters.filter((f) => f.key !== action.payload);
    },
    /** Clear all filters */
    clearFilters: (state) => {
      state.filters = [];
    },
    /** Set sort key + direction; toggles direction if same key */
    setSort: (state, action: PayloadAction<string>) => {
      if (state.sort.key === action.payload) {
        state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
      } else {
        state.sort = { key: action.payload, direction: "desc" };
      }
    },
  },
});

export const {
  setPipelineTab,
  addFilter,
  removeFilter,
  clearFilters,
  setSort,
} = candidatesSlice.actions;

export const candidatesReducer = candidatesSlice.reducer;
