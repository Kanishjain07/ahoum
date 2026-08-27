import { useState } from 'react';
import Icon, { Spinner } from './Icon';

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ Button */

const VARIANTS = {
  // Primary: teal fill, reserved for high-intent actions (book, create, save).
  primary:
    'bg-primary text-on-primary shadow-sm hover:bg-surface-tint hover:shadow-md focus-visible:ring-primary',
  // Secondary: indigo outline, for navigation-ish actions.
  secondary:
    'border border-secondary text-secondary hover:bg-secondary hover:text-on-secondary focus-visible:ring-secondary',
  // Ghost: no chrome, for cancel / go back.
  ghost: 'text-primary hover:bg-surface-container-high focus-visible:ring-primary',
  outline:
    'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-high focus-visible:ring-primary',
  danger:
    'border border-error-container text-error hover:bg-error-container focus-visible:ring-error',
};

const SIZES = {
  sm: 'px-md py-1.5 text-label-sm gap-xs',
  md: 'px-lg py-2.5 text-label-md gap-sm',
  lg: 'px-lg py-md text-label-md gap-sm w-full',
};

export function Button({
  as: As = 'button',
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  loading = false,
  className,
  children,
  disabled,
  ...rest
}) {
  return (
    <As
      className={cx(
        'inline-flex items-center justify-center rounded-lg transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-variant',
        'disabled:text-outline disabled:shadow-none disabled:hover:bg-surface-variant',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={18} /> : icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {iconAfter && !loading ? <Icon name={iconAfter} size={18} /> : null}
    </As>
  );
}

/* ------------------------------------------------------------------- Badge */

const TONES = {
  success: 'bg-success-container text-success',
  warning: 'bg-warning-container text-warning',
  error: 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-variant text-on-surface-variant',
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary-fixed text-on-secondary-container',
};

export function Badge({ tone = 'neutral', dot = false, icon, children, className }) {
  return (
    <span
      className={cx(
        'inline-flex w-fit items-center gap-xs whitespace-nowrap rounded-full px-sm py-1 text-label-sm',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({ as: As = 'div', className, children, ...rest }) {
  return (
    <As
      className={cx(
        'rounded-xl border border-surface-variant bg-surface-container-lowest shadow-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

/* ------------------------------------------------------------------ Banner */

const BANNERS = {
  error: { tone: 'border-error/30 bg-error-container/60 text-on-error-container', icon: 'alert' },
  success: { tone: 'border-success/20 bg-success-container text-success', icon: 'check-circle' },
  info: {
    tone: 'border-outline-variant bg-surface-container-low text-on-surface-variant',
    icon: 'info',
  },
};

export function Banner({ kind = 'info', title, children, onDismiss }) {
  const style = BANNERS[kind];
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-sm rounded-lg border px-md py-sm text-body-sm animate-fade-in-up',
        style.tone,
      )}
    >
      <Icon name={style.icon} size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        {title && <p className="text-label-md">{title}</p>}
        {children && <p className={title ? 'mt-xs' : undefined}>{children}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({ icon = 'search', title, children, action, dashed = false }) {
  return (
    <div
      className={cx(
        'flex min-h-[320px] flex-col items-center justify-center rounded-xl bg-surface-container-lowest p-2xl text-center',
        dashed ? 'border border-dashed border-outline-variant' : 'border border-surface-variant shadow-sm',
      )}
    >
      <div className="mb-lg flex h-20 w-20 items-center justify-center rounded-full bg-surface-container text-primary">
        <Icon name={icon} size={34} />
      </div>
      <h2 className="mb-sm text-headline-sm text-on-surface">{title}</h2>
      {children && (
        <p className="mb-xl max-w-sm text-body-md text-on-surface-variant">{children}</p>
      )}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ Fields */

let fieldSeq = 0;

export function Field({
  label,
  id,
  as = 'input',
  error,
  hint,
  prefix,
  className,
  children,
  ...rest
}) {
  const fieldId = id || `field-${(fieldSeq += 1)}`;
  const Element = as;
  return (
    <div className={cx('relative', error && 'field-error', className)}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-md top-1/2 z-10 -translate-y-1/2 pt-3 text-body-md text-on-surface-variant">
            {prefix}
          </span>
        )}
        <Element
          id={fieldId}
          placeholder=" "
          className={cx('field-input peer', prefix && 'pl-8', as === 'textarea' && 'resize-none')}
          aria-invalid={Boolean(error)}
          {...rest}
        >
          {children}
        </Element>
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
      </div>
      {(error || hint) && (
        <p className={cx('mt-xs text-label-sm', error ? 'text-error' : 'text-on-surface-variant')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({ user, size = 40, className }) {
  const name = user?.display_name || user?.username || '?';
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        width={size}
        height={size}
        className={cx('rounded-full border border-surface-variant object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-surface-container-highest font-semibold text-tertiary',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  );
}

/* ------------------------------------------------------------- Cover / mesh */

/* Five palettes, each a layered mesh rather than a single linear ramp: two
   soft radial lights over a diagonal base. A flat two-stop gradient reads as a
   missing image; this reads as artwork. */
export const PALETTES = [
  {
    base: 'linear-gradient(135deg,#00312c 0%,#00685f 55%,#008378 100%)',
    lights:
      'radial-gradient(120% 90% at 12% 8%, rgba(137,245,231,.55), transparent 60%), radial-gradient(90% 80% at 88% 92%, rgba(0,0,0,.35), transparent 55%)',
    ink: '#89f5e7',
  },
  {
    base: 'linear-gradient(135deg,#1c1856 0%,#3b35a7 55%,#8f8bff 100%)',
    lights:
      'radial-gradient(110% 85% at 80% 12%, rgba(226,223,255,.5), transparent 58%), radial-gradient(95% 90% at 8% 95%, rgba(0,0,0,.4), transparent 55%)',
    ink: '#e2dfff',
  },
  {
    base: 'linear-gradient(140deg,#0b1c30 0%,#213145 50%,#515c71 100%)',
    lights:
      'radial-gradient(100% 80% at 25% 15%, rgba(188,199,222,.42), transparent 60%), radial-gradient(120% 100% at 95% 85%, rgba(0,104,95,.5), transparent 55%)',
    ink: '#bcc7de',
  },
  {
    base: 'linear-gradient(130deg,#005049 0%,#008378 45%,#6bd8cb 100%)',
    lights:
      'radial-gradient(95% 85% at 85% 20%, rgba(255,255,255,.45), transparent 55%), radial-gradient(110% 90% at 5% 90%, rgba(11,28,48,.45), transparent 60%)',
    ink: '#00201d',
  },
  {
    base: 'linear-gradient(145deg,#231791 0%,#544fc0 50%,#00685f 100%)',
    lights:
      'radial-gradient(100% 90% at 15% 85%, rgba(107,216,203,.45), transparent 55%), radial-gradient(90% 80% at 90% 10%, rgba(226,223,255,.4), transparent 55%)',
    ink: '#c3c0ff',
  },
];

/* Fine diagonal hatching. Barely visible, but it stops large fills from
   looking like flat CSS. */
const TEXTURE =
  'repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 1px, transparent 1px 7px)';

export function paletteFor(seed = 0) {
  return PALETTES[Math.abs(Number(seed) || 0) % PALETTES.length];
}

function monogram(text = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'BS';
  return (words[0][0] + (words[1]?.[0] ?? words[0][1] ?? '')).toUpperCase();
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1542744094-3a317272018a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
];

export function Cover({ session, className, children }) {
  const [failed, setFailed] = useState(false);

  // Pick cover URL if available, else pick deterministic high quality fallback photo
  const fallbackSrc = FALLBACK_IMAGES[Math.abs(Number(session?.id) || 0) % FALLBACK_IMAGES.length];
  const imgSrc = session?.cover_url && !failed ? session.cover_url : fallbackSrc;

  return (
    <div className={cx('relative overflow-hidden bg-slate-900', className)}>
      <img
        src={imgSrc}
        alt={session?.title || 'Session cover'}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
      {children}
    </div>
  );
}

/** Large decorative mesh panel — hero backgrounds, the auth split screen. */
export function MeshPanel({ seed = 0, className, children }) {
  const palette = paletteFor(seed);
  return (
    <div
      className={cx('relative overflow-hidden', className)}
      style={{ backgroundImage: `${TEXTURE}, ${palette.lights}, ${palette.base}` }}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- Skeletons */

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded bg-surface-container-high', className)} />;
}

export function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-40 rounded-none" />
      <div className="space-y-sm p-lg">
        <div className="flex items-center gap-sm">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <div className="flex items-center justify-between border-t border-surface-variant bg-surface-container-low p-lg">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </Card>
  );
}

export function SkeletonRow() {
  return (
    <Card className="flex items-center justify-between gap-md p-lg">
      <div className="w-full space-y-sm">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <Skeleton className="h-9 w-28 shrink-0" />
    </Card>
  );
}

/* ------------------------------------------------------------------ Loader */

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-md text-on-surface-variant">
      <Spinner size={28} className="text-primary" />
      <p className="text-body-sm">{label}</p>
    </div>
  );
}
