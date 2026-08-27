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
        'flex shrink-0 items-center gap-sm text-headline-md font-extrabold tracking-tight text-primary',
        className,
      )}
    >
      <Icon name="calendar-check" size={26} />
      BookSync
    </Link>
  );
}

function navClass({ isActive }) {
  return cx(
    'flex h-full items-center rounded px-sm py-xs text-label-md transition-colors duration-200',
    isActive
      ? 'border-b-2 border-primary font-bold text-primary'
      : 'text-on-surface-variant/60 hover:bg-surface-container-high hover:text-on-surface-variant',
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
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!user) {
    return (
      <div className="flex items-center gap-sm">
        <Button as={Link} to="/login" size="sm" variant="ghost">
          Sign in
        </Button>
        <Button as={Link} to="/signup" size="sm" iconAfter="arrow-right">
          Get started
        </Button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-sm rounded-full p-1 pr-sm transition-colors hover:bg-surface-container-high"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar user={user} size={32} />
        <span className="hidden text-label-md text-on-surface-variant sm:block">
          {user.display_name || user.username}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-sm w-56 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-md animate-fade-in-up"
        >
          <div className="border-b border-surface-variant px-md py-sm">
            <p className="text-label-md text-on-surface">{user.display_name || user.username}</p>
            <p className="truncate text-body-sm text-on-surface-variant">
              {user.email || 'no email shared'}
            </p>
            <span className="mt-xs inline-flex items-center gap-xs rounded-full bg-secondary-fixed px-sm py-0.5 text-label-sm text-on-secondary-container">
              <Icon name={user.role === 'creator' ? 'dashboard' : 'user'} size={12} />
              {user.role === 'creator' ? 'Creator' : 'User'}
            </span>
          </div>
          <MenuItem to="/profile" icon="user" onSelect={() => setOpen(false)}>
            Account settings
          </MenuItem>
          <MenuItem to="/bookings" icon="ticket" onSelect={() => setOpen(false)}>
            My bookings
          </MenuItem>
          {user.role === 'creator' && (
            <MenuItem to="/creator" icon="dashboard" onSelect={() => setOpen(false)}>
              Creator dashboard
            </MenuItem>
          )}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
              navigate('/');
            }}
            className="flex w-full items-center gap-sm border-t border-surface-variant px-md py-sm text-left text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-error"
          >
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ to, icon, children, onSelect }) {
  return (
    <Link
      role="menuitem"
      to={to}
      onClick={onSelect}
      className="flex items-center gap-sm px-md py-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
    >
      <Icon name={icon} size={16} />
      {children}
    </Link>
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
    <header className="fixed top-0 z-50 flex h-[72px] w-full items-center border-b border-slate-200/80 bg-white/95 px-margin_mobile shadow-sm backdrop-blur-md md:px-margin_desktop">
      <div className="mx-auto flex w-full max-w-content items-center justify-between gap-md">
        <div className="flex items-center gap-xl">
          <Brand />
          <nav className="hidden h-[72px] items-center gap-lg md:flex">
            <NavLink to="/" end className={navClass}>
              Explore
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
            size={18}
            className="pointer-events-none absolute left-3 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sessions…"
            aria-label="Search sessions"
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-body-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
        </form>

        <div className="flex items-center gap-md">
          {user?.role === 'creator' ? (
            <Button
              as={Link}
              to="/creator/sessions/new"
              size="sm"
              className="rounded-full bg-[#1b4332] px-md py-2 text-label-md font-semibold text-white shadow-sm hover:bg-[#0f2d21]"
            >
              List a Session
            </Button>
          ) : (
            <Button
              as={Link}
              to="/profile"
              size="sm"
              className="rounded-full bg-[#1b4332] px-md py-2 text-label-md font-semibold text-white shadow-sm hover:bg-[#0f2d21]"
            >
              List a Session
            </Button>
          )}

          <button
            aria-label="Notifications"
            className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Icon name="bell" size={20} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-600" />
          </button>

          <AccountMenu />
        </div>
      </div>
      <span className="sr-only">{location.pathname}</span>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-surface-variant bg-surface-container px-margin_mobile py-xl md:px-margin_desktop">
      <div className="mx-auto flex w-full max-w-content flex-col items-center justify-between gap-lg md:flex-row">
        <div className="flex flex-col items-center gap-xs md:items-start">
          <span className="flex items-center gap-sm text-headline-sm font-bold text-primary">
            <Icon name="calendar-check" size={20} />
            BookSync
          </span>
          <span className="text-body-sm text-on-surface-variant">
            Live sessions, honestly counted.
          </span>
        </div>
        <nav className="flex flex-wrap justify-center gap-md">
          {['Terms', 'Privacy', 'Support', 'Contact'].map((item) => (
            <span key={item} className="text-label-sm text-on-surface-variant/70">
              {item}
            </span>
          ))}
        </nav>
        <span className="text-body-sm text-on-surface-variant/80">
          © {new Date().getFullYear()} BookSync
        </span>
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
          'w-full flex-grow pt-[72px] pb-2xl relative z-10',
          !fullBleed && 'px-margin_mobile md:px-margin_desktop max-w-content mx-auto',
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
