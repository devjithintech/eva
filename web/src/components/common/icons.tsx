import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  stroke?: string;
  width?: number;
  style?: CSSProperties;
}

function svg(path: React.ReactNode, vb = "0 0 24 24") {
  return function Icon({ size = 18, stroke = "currentColor", width = 2, style }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={vb}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
      >
        {path}
      </svg>
    );
  };
}

export const SearchIcon = svg(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);
export const SunIcon = svg(
  <>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.2M12 19.8V22M4 12H1.8M22.2 12H20M5.2 5.2 6.7 6.7M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5" />
  </>,
);
export const MoonIcon = svg(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />);
export const BellIcon = svg(<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />);
export const HelpIcon = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .8-1 1.7M12 17h.01" />
  </>,
);
export const MicIcon = svg(
  <>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </>,
);
export const PaperclipIcon = svg(
  <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3l7.5-7.5" />,
);
export const ChevronDownIcon = svg(<path d="m6 9 6 6 6-6" />);
export const SendIcon = svg(<path d="M5 12h14M13 6l6 6-6 6" />);
export const BackIcon = svg(<path d="M19 12H5M11 6l-6 6 6 6" />);
export const CheckIcon = svg(<path d="m5 12 5 5 9-10" />);
export const VideoIcon = svg(
  <path d="M15.5 10.5 20 8v8l-4.5-2.5M4 7h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />,
);
export const LeaveIcon = svg(<path d="M21 15.5c-2.5 1.4-5.5 1.4-8 0M3 8.5c2.5-1.4 5.5-1.4 8 0M2 12l3 3M22 9l-3 3" />);
export const UserPlusIcon = svg(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20a6 6 0 0 1 12 0M18 8v6M21 11h-6" />
  </>,
);
export const RefreshIcon = svg(<path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />);
export const ArrowUpRightIcon = svg(<path d="M7 17 17 7M9 7h8v8" />);
export const FileIcon = svg(<path d="M14 2v6h6M14 2l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />);

// ── chrome / actions ───────────────────────────────────────────────────────
export const CloseIcon = svg(<path d="M18 6 6 18M6 6l12 12" />);
export const PlusIcon = svg(<path d="M12 5v14M5 12h14" />);
export const ChevronRightIcon = svg(<path d="m9 6 6 6-6 6" />);
export const SettingsIcon = svg(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </>,
);
export const ChatBubbleIcon = svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />);
export const CollapseIcon = svg(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18M16 9l-3 3 3 3" />
  </>,
);
export const PinIcon = svg(<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />);
export const ExpandIcon = svg(<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />);
export const DownloadIcon = svg(<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />);
export const CopyIcon = svg(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2" />
  </>,
);
export const CompareIcon = svg(<path d="M8 3v18M16 3v18M3 8h5M16 8h5M3 16h5M16 16h5" />);
export const SaveIcon = svg(<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />);

// ── per-artifact card icons ──────────────────────────────────────────────────
export const ScatterIcon = svg(
  <>
    <path d="M3 3v18h18" />
    <circle cx="9" cy="13" r="1.4" />
    <circle cx="13" cy="9" r="1.4" />
    <circle cx="18" cy="6" r="1.4" />
  </>,
);
export const BarsIcon = svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />);
export const TrendUpIcon = svg(<path d="M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6" />);
export const GridIcon = svg(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>,
);
export const InfoIcon = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </>,
);
export const FlagIcon = svg(<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />);
export const AwardIcon = svg(
  <>
    <circle cx="12" cy="8" r="6" />
    <path d="M8.2 13.3 7 22l5-3 5 3-1.2-8.7" />
  </>,
);
export const ZapIcon = svg(<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />);
export const UsersIcon = svg(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </>,
);
export const TargetIcon = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" />
  </>,
);
export const AlertTriangleIcon = svg(<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />);

/** Filled rounded square — "stop speaking". */
export function StopIcon({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.6" fill={color} />
    </svg>
  );
}

/** The little iridescent "AI" dot used throughout the original. */
export function AiDot({ size = 13 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flex: "none",
        background: "conic-gradient(from 0deg,#f59e0b,#ec4899,#6354f2,#22c55e,#f59e0b)",
      }}
    />
  );
}
