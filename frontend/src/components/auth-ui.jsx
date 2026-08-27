import { Link } from 'react-router-dom';
import Icon, { Spinner } from './Icon';
import { Card, MeshPanel, cx } from './ui';

/* Google's mark has to be its own multi-colour SVG — brand guidelines forbid
   recolouring it, so it cannot be a currentColor stroke like our other icons. */
export function GoogleMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** Provider button: brand-correct mark, consistent shell. */
export function ProviderButton({ provider, onClick, busy, disabled, children }) {
  const isGoogle = provider === 'google';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={cx(
        'group relative flex h-12 w-full items-center justify-center gap-md rounded-lg px-lg',
        'text-label-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        isGoogle
          ? 'border border-outline-variant bg-surface-container-lowest text-on-surface shadow-sm hover:-translate-y-px hover:shadow-md focus-visible:ring-primary'
          : 'bg-on-surface text-surface shadow-sm hover:-translate-y-px hover:bg-inverse-surface hover:shadow-md focus-visible:ring-on-surface',
      )}
    >
      {busy ? (
        <Spinner size={18} />
      ) : isGoogle ? (
        <GoogleMark />
      ) : (
        <Icon name="github" size={20} />
      )}
      {children}
    </button>
  );
}

/**
 * Split auth shell: an editorial mesh panel on the left carrying the brand
 * argument, the form on the right. The panel collapses on mobile so the form
 * is never pushed below the fold.
 */
export function AuthShell({ eyebrow, headline, points, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#fafafa]">
      {/* Left Column: Aesthetic Dark Emerald Editorial Panel */}
      <div className="relative hidden flex-col justify-center gap-6 overflow-hidden bg-gradient-to-br from-[#06241b] via-[#0b382c] to-[#144f3e] p-8 lg:p-12 text-white lg:flex lg:w-[46%] xl:w-[42%] shadow-2xl">
        {/* Ambient Subtle Radial Glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-teal-400/10 blur-[100px]" />

        {/* Brand Header */}
        <Link to="/" className="relative z-10 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-white">
          <Icon name="calendar-check" size={28} className="text-emerald-400" />
          BookSync
        </Link>

        {/* Eyebrow & Title */}
        <div className="relative z-10 max-w-md space-y-2">
          <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300 backdrop-blur-md">
            {eyebrow}
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
            {headline}
          </h1>
        </div>

        {/* Demo Video Showcase */}
        <div className="relative z-10 max-w-md overflow-hidden rounded-2xl border border-white/20 bg-slate-950/70 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-emerald-400/50">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover opacity-85 transition-transform duration-700 hover:scale-105"
              poster="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80"
            >
              <source
                src="https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41549-large.mp4"
                type="video/mp4"
              />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md border border-white/10 shadow-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              DEMO • PLATFORM WORKFLOW
            </span>
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-xs font-bold text-white">How Creators List & Users Experience Live Sessions</p>
              <p className="text-[11px] text-slate-300 leading-tight">Instant seat booking, live video masterclasses & roster management.</p>
            </div>
          </div>
        </div>

        {/* Feature Points */}
        <ul className="relative z-10 max-w-md space-y-3">
          {points.map((point) => (
            <li key={point.title} className="flex gap-3 items-start">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-emerald-300 ring-1 ring-inset ring-white/15 backdrop-blur-md">
                <Icon name={point.icon} size={15} />
              </span>
              <div>
                <span className="block text-sm font-bold text-white">{point.title}</span>
                <span className="block text-xs text-emerald-100/70 leading-relaxed">
                  {point.body}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer info */}
        <p className="relative z-10 text-xs font-medium text-emerald-200/60 pt-2">
          © {new Date().getFullYear()} BookSync. All rights reserved.
        </p>
      </div>

      {/* Right Column: Clean Minimalist Form Area */}
      <div className="flex flex-1 items-center justify-center px-4 py-8 md:px-8">
        <div className="w-full max-w-[440px]">
          <Link
            to="/"
            className="mb-6 flex items-center justify-center gap-2 text-2xl font-extrabold text-[#0b382c] lg:hidden"
          >
            <Icon name="calendar-check" size={26} />
            BookSync
          </Link>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-xl">
            {children}
          </div>
          {footer && (
            <p className="mt-5 text-center text-sm font-medium text-slate-600">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** The role choice at sign-up: two cards, not a dropdown. */
export function RoleChooser({ value, onChange, className }) {
  const options = [
    {
      key: 'user',
      icon: 'ticket',
      title: 'Book sessions',
      body: 'Browse the catalog, reserve a seat and manage your bookings.',
    },
    {
      key: 'creator',
      icon: 'dashboard',
      title: 'Host sessions',
      body: 'Publish sessions, set capacity and see who has booked.',
    },
  ];

  return (
    <div className={cx('grid gap-3 sm:grid-cols-2', className)} role="radiogroup">
      {options.map((option) => {
        const selected = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.key)}
            className={cx(
              'group relative rounded-2xl border p-4 text-left transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[#164e3d] focus:ring-offset-2',
              selected
                ? 'border-[#164e3d] bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm',
            )}
          >
            <span
              className={cx(
                'mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                selected
                  ? 'bg-[#164e3d] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200',
              )}
            >
              <Icon name={option.icon} size={20} />
            </span>
            <span className="block text-sm font-bold text-slate-900">{option.title}</span>
            <span className="mt-1 block text-xs text-slate-500 leading-relaxed">{option.body}</span>
            <span
              className={cx(
                'absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-all',
                selected
                  ? 'border-[#164e3d] bg-[#164e3d] text-white'
                  : 'border-slate-300 bg-transparent text-transparent',
              )}
            >
              <Icon name="check" size={12} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** "Or continue with" style divider. */
export function Divider({ children }) {
  return (
    <div className="relative my-lg">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-outline-variant" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-surface-container-lowest px-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
          {children}
        </span>
      </div>
    </div>
  );
}
