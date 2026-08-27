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
export function AuthShell({ eyebrow, headline, children, footer }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-white antialiased">
      {/* Full-Page Looping Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover opacity-35 filter brightness-90 saturate-125 transition-all duration-1000 scale-105 pointer-events-none"
        poster="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80"
      >
        <source
          src="https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41549-large.mp4"
          type="video/mp4"
        />
      </video>

      {/* Full-Page Vignette & Radial Lighting */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950/98 backdrop-blur-[3px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/15 blur-[160px]" />

      {/* Main Centered Container */}
      <div className="relative z-10 w-full max-w-[480px] animate-fade-in-up">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 text-3xl font-extrabold tracking-tight text-white transition-transform hover:scale-105"
          >
            <Icon name="calendar-check" size={32} className="text-emerald-400 drop-shadow-md" />
            BookSync
          </Link>
        </div>

        {/* Centered Glassmorphic Form Card */}
        <div className="rounded-3xl border border-white/20 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-2xl md:p-10">
          <div className="mb-6 text-center">
            {eyebrow && (
              <span className="mb-3 inline-block rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300 backdrop-blur-md">
                {eyebrow}
              </span>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              {headline}
            </h1>
          </div>

          {children}
        </div>

        {/* Footer Link */}
        {footer && (
          <p className="mt-6 text-center text-sm font-medium text-slate-300 drop-shadow">
            {footer}
          </p>
        )}

        {/* Copyright Footer */}
        <p className="mt-8 text-center text-xs font-medium text-slate-500">
          © {new Date().getFullYear()} BookSync. All rights reserved.
        </p>
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
      body: 'Browse catalog & book seats.',
    },
    {
      key: 'creator',
      icon: 'dashboard',
      title: 'Host sessions',
      body: 'Publish workshops & host.',
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
              'focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2',
              selected
                ? 'border-[#164e3d] bg-emerald-50 text-slate-900 shadow-md ring-2 ring-[#164e3d]/30'
                : 'border-slate-200 bg-slate-50/80 text-slate-800 hover:bg-slate-100 hover:border-slate-300',
            )}
          >
            <span
              className={cx(
                'mb-2 flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                selected
                  ? 'bg-[#164e3d] text-white shadow-md'
                  : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300',
              )}
            >
              <Icon name={option.icon} size={18} />
            </span>
            <span className={cx('block text-sm font-bold', selected ? 'text-[#164e3d]' : 'text-slate-900')}>
              {option.title}
            </span>
            <span className={cx('mt-0.5 block text-xs leading-tight', selected ? 'text-emerald-900 font-medium' : 'text-slate-500')}>
              {option.body}
            </span>
            <span
              className={cx(
                'absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-all',
                selected
                  ? 'border-[#164e3d] bg-[#164e3d] text-white font-bold'
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
