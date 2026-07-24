import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import ChatPanel from './ChatPanel';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

/**
 * AppShell - The shared layout wrapper for all authenticated pages.
 * Renders the sticky Topbar at the top, the slide-in ChatPanel at the
 * right edge, and the active page content via <Outlet /> in the main area.
 *
 * The #pageWrap div gains margin-right when the ChatPanel is open, so
 * page content slides left rather than being obscured.
 */
export default function AppShell() {
  const isChatOpen = useSelector((state: RootState) => state.chat.isOpen);

  return (
    <div className={isChatOpen ? 'chat-open' : undefined}>
      {/* Sticky top navigation bar */}
      <Topbar />

      {/* Slide-in AI chat panel fixed to the right */}
      <ChatPanel />

      {/* Page content area - shifts left when chat opens */}
      <div
        id="pageWrap"
        style={{
          transition: 'margin-right 0.26s cubic-bezier(0.4, 0, 0.2, 1)',
          marginRight: isChatOpen ? '360px' : 0,
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
