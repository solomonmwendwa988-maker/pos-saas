import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';
import CommandPalette from './CommandPalette';
import TrialBanner from '../../pages/subscription/TrialBanner';
import OfflineBanner from '@/components/common/OfflineBanner';
import InstallPrompt from '@/components/common/InstallPrompt';
import PushPermissionPrompt from '@/components/common/PushPermissionPrompt';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useRouteFocus } from '@/hooks/useRouteFocus';
import './AppShell.css';

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useRouteFocus();

  return (
    <div className={`shell ${collapsed ? 'shell-collapsed' : ''}`}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="shell-main">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <div className="shell-content" id="main-content" tabIndex={-1}>
          <div className="shell-banner">
            <OfflineBanner />
            <TrialBanner />
          </div>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>

      {/* Rendered at the shell level so fixed positioning is
          anchored to the viewport, not a scrolled container. */}
      <MobileNav onOpenMenu={() => setMobileOpen(true)} />

      <CommandPalette />
      <InstallPrompt />
      <PushPermissionPrompt />
    </div>
  );
}