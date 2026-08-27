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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MeshPanel
        seed={0}
        className="hidden flex-col justify-between p-2xl text-on-primary lg:flex lg:w-[46%] xl:w-[42%]"
      >
        <Link to="/" className="relative z-10 flex items-center gap-sm text-headline-md font-extrabold">
          <Icon name="calendar-check" size={26} />
          BookSync
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="mb-md text-label-md uppercase tracking-[0.18em] text-primary-fixed">
            {eyebrow}
          </p>
          <h1 className="text-display leading-[1.05] text-on-primary">{headline}</h1>
          <ul className="mt-2xl space-y-lg">
            {points.map((point) => (
              <li key={point.title} className="flex gap-md">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-primary/10 text-primary-fixed ring-1 ring-inset ring-on-primary/20">
                  <Icon name={point.icon} size={18} />
                </span>
                <span>
                  <span className="block text-label-md text-on-primary">{point.title}</span>
                  <span className="mt-1 block text-body-sm text-on-primary/70">
                    {point.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-body-sm text-on-primary/60">
          © {new Date().getFullYear()} BookSync
        </p>
      </MeshPanel>

      <div className="flex flex-1 items-center justify-center bg-surface px-margin_mobile py-2xl md:px-margin_desktop">
        <div className="w-full max-w-[440px]">
          <Link
            to="/"
            className="mb-xl flex items-center justify-center gap-sm text-headline-md font-extrabold text-primary lg:hidden"
          >
            <Icon name="calendar-check" size={24} />
            BookSync
          </Link>
          <Card className="p-lg shadow-md md:p-xl">{children}</Card>
          {footer && (
            <p className="mt-lg text-center text-body-sm text-on-surface-variant">{footer}</p>
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
    <div className={cx('grid gap-sm sm:grid-cols-2', className)} role="radiogroup">
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
              'group relative rounded-xl border p-md text-left transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              selected
                ? 'border-primary bg-primary/[0.06] shadow-sm'
                : 'border-outline-variant bg-surface-container-lowest hover:-translate-y-px hover:border-outline hover:shadow-sm',
            )}
          >
            <span
              className={cx(
                'mb-sm flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                selected
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant',
              )}
            >
              <Icon name={option.icon} size={20} />
            </span>
            <span className="block text-label-md text-on-surface">{option.title}</span>
            <span className="mt-1 block text-body-sm text-on-surface-variant">{option.body}</span>
            <span
              className={cx(
                'absolute right-md top-md flex h-5 w-5 items-center justify-center rounded-full border transition-all',
                selected
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant bg-transparent text-transparent',
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
