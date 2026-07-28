import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  Settings,
  Cpu,
  Bell,
  Search,
  LogOut,
  Activity,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Page } from '../lib/types';

interface LayoutProps {
  currentPage: Page;
  navigate: (page: Page) => void;
  children: React.ReactNode;
  userEmail?: string;
}

const navItems: {
  id: Page;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'sessions', label: 'Sessions', icon: Clock },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'iot', label: 'IoT Devices', icon: Cpu },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const PAGE_TITLES: Record<Page, string> = {
  landing: 'Home',
  login: 'Login',
  dashboard: 'Dashboard',
  members: 'Team Members',
  sessions: 'Sessions',
  documents: 'Documents',
  settings: 'Settings',
  iot: 'IoT Devices',
};

const PAGE_SUBTITLES: Record<Page, string> = {
  landing: '',
  login: '',
  dashboard: 'Real-time contribution intelligence',
  members: 'Manage your team roster',
  sessions: 'Track and review team sessions',
  documents: 'Written contribution analysis',
  settings: 'Configure your workspace',
  iot: 'Connected sensor devices',
};

const NOTIFS = [
  { text: 'Device 1 sent high contribution reading', time: '2m ago', color: 'bg-emerald-500' },
  { text: 'Session "Sprint 3" ended', time: '15m ago', color: 'bg-blue-500' },
  { text: 'New member registered: Alex', time: '1h ago', color: 'bg-amber-500' },
];

export default function Layout({
  currentPage,
  navigate,
  children,
  userEmail,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'U';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }

    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#070D1A]">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-shrink-0 flex-col border-r border-white/5 bg-[#0B1120] transition-all duration-300 ${
          sidebarOpen ? 'w-60' : 'w-16'
        }`}
      >
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0" />

        {/* Brand */}
        <div
          className={`flex items-center gap-3 border-b border-white/5 px-4 py-5 ${
            !sidebarOpen ? 'justify-center' : ''
          }`}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
            <Activity size={17} className="text-white" />
          </div>

          {sidebarOpen && (
            <div>
              <p className="text-sm font-black tracking-tight text-white">ContribuTrack</p>
              <p className="text-[10px] font-medium text-blue-400">IoT + AI Platform</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-5">
          {sidebarOpen && (
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              Navigation
            </p>
          )}

          {navItems.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id;

            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                title={!sidebarOpen ? label : undefined}
                className={`group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'border-blue-500/20 bg-blue-500/15 text-blue-400'
                    : 'border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-200'
                } ${!sidebarOpen ? 'justify-center' : ''}`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-blue-400 to-cyan-400" />
                )}

                <Icon
                  size={17}
                  className={`flex-shrink-0 ${
                    active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                />

                {sidebarOpen && <span className="flex-1 text-left">{label}</span>}
                {sidebarOpen && active && <ChevronRight size={13} className="text-blue-400/60" />}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/5 p-3">
          <div className={`flex items-center gap-2.5 ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white shadow-lg shadow-blue-500/20">
              {initials}
            </div>

            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-200">
                  {userEmail ?? 'Guest'}
                </p>
                <p className="text-[10px] text-gray-500">Administrator</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex flex-shrink-0 items-center gap-4 border-b border-white/5 bg-[#0B1120]/80 px-6 py-3 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/5 hover:text-gray-200"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </button>

          <div>
            <h1 className="text-base font-bold leading-tight text-white">
              {PAGE_TITLES[currentPage]}
            </h1>
            {PAGE_SUBTITLES[currentPage] && (
              <p className="text-[11px] text-gray-500">{PAGE_SUBTITLES[currentPage]}</p>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                className="w-44 rounded-xl border border-white/10 bg-white/5 py-2 pl-8 pr-4 text-xs text-gray-300 placeholder-gray-600 transition-all focus:border-blue-500/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                placeholder="Search…"
              />
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((p) => !p)}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/5 hover:text-gray-200"
                aria-label="Toggle notifications"
              >
                <Bell size={16} />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-[#0B1120]" />
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#0F1829] shadow-2xl shadow-black/60">
                  <div className="border-b border-white/5 px-4 py-3">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                    <p className="text-xs text-gray-500">{NOTIFS.length} recent alerts</p>
                  </div>

                  <div className="p-2">
                    {NOTIFS.map((n, i) => (
                      <div
                        key={i}
                        className="flex cursor-default items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
                      >
                        <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.color}`} />
                        <div>
                          <p className="text-xs leading-relaxed text-gray-300">{n.text}</p>
                          <p className="mt-0.5 text-[10px] text-gray-600">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sign out */}
            <button
              onClick={() => navigate('landing')}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-500 transition-all hover:bg-white/5 hover:text-gray-200"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}