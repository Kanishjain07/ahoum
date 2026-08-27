import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Icon from './Icon';
import { Avatar, Button, cx } from './ui';

function Brand({ className }) {
  return (
    <Link
      to="/"
      className={cx(
        'flex shrink-0 items-center gap-2.5 font-bold text-white tracking-tight',
        className,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981] text-sm font-black text-slate-950 shadow-md">
        B
      </span>
      <span className="text-lg font-extrabold tracking-tight text-white">BookSync</span>
    </Link>
  );
}

function navClass({ isActive }) {
  return cx(
    'inline-flex items-center rounded-full px-5 py-2 text-xs font-bold transition-all duration-200',
    isActive
      ? 'bg-[#10b981] text-slate-950 shadow-md'
      : 'text-slate-300 hover:text-white hover:bg-white/10',
  );
}

function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <Link
          to="/login"
          className="text-xs font-bold text-slate-300 hover:text-white transition-colors"
        >
          Sign in
        </Link>
        <Link
          to="/signup"
          className="rounded-full bg-[#10b981] px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-[#34d399] transition-transform active:scale-95"
        >
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative flex items-center gap-3">
      {user.role === 'creator' ? (
        <Link
          to="/creator/sessions/new"
          className="rounded-full bg-[#10b981] px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-[#34d399] transition-transform active:scale-95"
        >
          List a Session
        </Link>
      ) : (
        <Link
          to="/profile"
          className="rounded-full bg-[#10b981] px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-[#34d399] transition-transform active:scale-95"
        >
          List a Session
        </Link>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 p-1 pr-3 shadow-md backdrop-blur-md transition-all hover:bg-white/20"
      >
        <Avatar user={user} size={28} />
        <span className="max-w-[110px] truncate text-xs font-bold text-white">
          {user.display_name || user.username}
        </span>
        <Icon name="chevron-down" size={14} className="text-slate-300" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-fade-in-up">
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-xs font-bold text-white">{user.display_name || user.username}</p>
            <p className="truncate text-[11px] text-slate-400">{user.email}</p>
          </div>
          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Icon name="user" size={16} /> Account settings
            </Link>
            {user.role === 'creator' && (
              <Link
                to="/creator"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Icon name="dashboard" size={16} /> Creator Dashboard
              </Link>
            )}
            <Link
              to="/bookings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Icon name="ticket" size={16} /> My Bookings
            </Link>
          </div>
          <div className="border-t border-white/10 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                signOut();
                navigate('/');
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
            >
              <Icon name="log-out" size={16} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  const ref = useRef(null);

  const notifications = [
    {
      id: 1,
      title: 'Booking Confirmed!',
      body: 'Your seat for Python & Django Masterclass is confirmed.',
      time: '10m ago',
      icon: 'check',
    },
    {
      id: 2,
      title: 'Live Session Tomorrow',
      body: 'Building Real-time WebSockets Workshop starts at 4:00 PM.',
      time: '2h ago',
      icon: 'calendar',
    },
    {
      id: 3,
      title: 'Welcome to BookSync!',
      body: 'Browse live masterclasses and reserve your seat in seconds.',
      time: '1d ago',
      icon: 'ticket',
    },
  ];

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  function handleToggle() {
    setOpen((prev) => !prev);
    setUnread(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative rounded-full p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Icon name="bell" size={18} />
        {unread && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#10b981] ring-2 ring-[#0B131F] animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-2xl animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Icon name="bell" size={14} className="text-[#10b981]" />
              Notifications
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              3 new
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-white/5 py-1">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 px-3 py-2.5 transition-colors hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <Icon name={item.icon} size={14} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <span className="text-[10px] text-slate-400">{item.time}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-300 leading-tight">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-1">
            <button
              onClick={() => setOpen(false)}
              className="w-full rounded-xl py-1.5 text-center text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Mark all as read
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');

  function submitSearch(event) {
    event.preventDefault();
    navigate(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/');
  }

  return (
    <header className="sticky top-0 z-50 flex h-[68px] w-full items-center border-b border-white/10 bg-[#0B131F] px-margin_mobile shadow-xl backdrop-blur-xl transition-all md:px-margin_desktop">
      <div className="mx-auto flex w-full max-w-content items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Brand />
          <nav className="hidden items-center gap-2 md:flex">
            <NavLink
              to="/"
              end
              className={navClass}
              onClick={(e) => {
                const element = document.getElementById('catalog-list');
                if (location.pathname === '/' && element) {
                  e.preventDefault();
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Catalog
            </NavLink>
            {user && (
              <NavLink to="/bookings" className={navClass}>
                My Bookings
              </NavLink>
            )}
            {user?.role === 'creator' && (
              <NavLink to="/creator" className={navClass}>
                Dashboard
              </NavLink>
            )}
          </nav>
        </div>

        <form
          onSubmit={submitSearch}
          className="relative hidden max-w-xs flex-1 items-center md:flex"
        >
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3.5 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sessions..."
            aria-label="Search sessions"
            className="w-full rounded-full border border-white/15 bg-white/5 py-1.5 pl-9 pr-4 text-xs text-white transition-all placeholder:text-slate-400 focus:border-[#10b981] focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 hover:border-white/25"
          />
        </form>

        <div className="flex items-center gap-3">
          <NotificationsMenu />
          <AccountMenu />
        </div>
      </div>
      <span className="sr-only">{location.pathname}</span>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0B131F] text-white px-margin_mobile py-10 md:px-margin_desktop">
      <div className="mx-auto flex w-full max-w-content flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-white text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10b981] text-xs font-black text-slate-950 shadow-sm">
              B
            </span>
            BookSync
          </Link>
          <span className="text-xs text-slate-400">
            Interactive live sessions &amp; masterclasses, honestly counted.
          </span>
        </div>

        <nav className="flex flex-wrap justify-center gap-6 text-xs text-slate-400 font-medium">
          {['Terms', 'Privacy', 'Support', 'Contact'].map((item) => (
            <a
              key={item}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="hover:text-[#10b981] transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/60 px-3 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            Systems Operational
          </span>
          <span>© {new Date().getFullYear()} BookSync</span>
        </div>
      </div>
    </footer>
  );
}

/** Standard app shell: fixed nav, centred content column, footer. */
export default function Layout({ children, wide = false, fullBleed = false }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      {/* Dynamic ambient background glow orbs */}
      <div className="pointer-events-none fixed top-[-100px] left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/10 via-teal-400/10 to-indigo-500/10 blur-[130px]" />
      <div className="pointer-events-none fixed bottom-[10%] right-[-100px] -z-10 h-[400px] w-[500px] rounded-full bg-gradient-to-bl from-teal-500/10 via-emerald-400/5 to-transparent blur-[120px]" />
      <div className="pointer-events-none fixed top-[40%] left-[-150px] -z-10 h-[450px] w-[450px] rounded-full bg-gradient-to-r from-indigo-600/5 to-primary/10 blur-[140px]" />

      <TopNav />
      <main
        className={cx(
          'w-full flex-grow pb-2xl relative z-10',
          !fullBleed && 'px-margin_mobile md:px-margin_desktop max-w-content mx-auto pt-6',
        )}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

/** Focused, single-task shell (sign-in, OAuth callback, errors): no nav chrome. */
export function FocusLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-x-hidden">
      {/* Background glow for focus layouts */}
      <div className="pointer-events-none fixed top-1/3 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-primary/15 via-teal-400/10 to-secondary/15 blur-[140px]" />
      <header className="flex h-[72px] shrink-0 items-center border-b border-surface-variant/80 bg-surface/90 backdrop-blur-md px-margin_mobile md:px-margin_desktop">
        <Brand />
      </header>
      <main className="flex flex-grow items-center justify-center p-margin_mobile md:p-margin_desktop relative z-10">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-xl flex flex-col justify-between gap-md md:flex-row md:items-end">
      <div>
        {back && (
          <Link
            to={back.to}
            className="mb-xs inline-flex items-center gap-xs text-body-sm text-tertiary transition-colors hover:text-primary"
          >
            <Icon name="arrow-left" size={16} />
            {back.label}
          </Link>
        )}
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">{title}</h1>
        {subtitle && <p className="mt-xs text-body-md text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-sm">{actions}</div>}
    </div>
  );
}
