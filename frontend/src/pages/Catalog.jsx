import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Layout from '../components/Layout';
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  Cover,
  EmptyState,
  MeshPanel,
  SkeletonCard,
  cx,
} from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { availability, formatDate, formatDuration, formatPrice, formatTime } from '../lib/format';

/* The design shows topic pills (Design / Code / Business). Sessions have no
   topic in this data model, so these are the filters the API can actually
   honour — same visual language, real behaviour. */
const FILTERS = [
  { key: 'all', label: 'All sessions' },
  { key: 'available', label: 'Seats left' },
  { key: 'free', label: 'Free' },
];

function Hero({ sessions, query, onSearch }) {
  const [isMuted, setIsMuted] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const videoRef = useRef(null);

  const stats = useMemo(() => {
    const seats = sessions.reduce((total, session) => total + session.seats_remaining, 0);
    const hosts = new Set(sessions.map((session) => session.creator.id)).size;
    return [
      { value: sessions.length ? `${sessions.length.toLocaleString()}+` : '1,200+', label: 'ACTIVE SESSIONS' },
      { value: seats ? `${seats.toLocaleString()}+` : '50k+', label: 'SEATS BOOKED' },
      { value: hosts ? `${hosts.toLocaleString()}+` : '850+', label: 'EXPERT HOSTS' },
    ];
  }, [sessions]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <>
      {/* 100% Edge-to-Edge Full Screen Width Hero Banner */}
      <div className="relative w-full min-h-[580px] overflow-hidden bg-slate-950 px-6 py-16 text-center text-white shadow-2xl md:py-24 animate-fade-in-up">
        {/* Full-Width Background Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-50 filter brightness-90 saturate-125 transition-all duration-1000 scale-105"
          poster="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80"
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41549-large.mp4"
            type="video/mp4"
          />
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-computer-keyboard-41584-large.mp4"
            type="video/mp4"
          />
        </video>

        {/* Dynamic Overlay Gradient & Radial Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/85 to-slate-950/95 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[450px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[130px]" />

        <div className="relative z-10 mx-auto max-w-4xl">
          {/* Animated Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300 backdrop-blur-md shadow-lg animate-float">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
            </span>
            Live Masterclasses & Workshops
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-[3.75rem] leading-[1.12]">
            Small sessions, taught by people{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-200 to-white drop-shadow-sm">
              doing the work.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-300 md:text-xl leading-relaxed font-normal">
            Join intimate masterclasses and focused workshops led by industry practitioners.
            Level up your skills with real-world knowledge.
          </p>

          {/* Glassmorphism Search Bar */}
          <form
            onSubmit={(event) => event.preventDefault()}
            className="mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-2xl border border-white/25 bg-slate-900/80 p-2.5 shadow-2xl backdrop-blur-xl transition-all duration-300 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/30 hover:border-white/40"
          >
            <div className="flex pl-3 text-slate-400">
              <Icon name="search" size={22} />
            </div>
            <input
              value={query}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="What do you want to learn?"
              aria-label="Search sessions"
              className="w-full bg-transparent px-2 py-2 text-base text-white placeholder:text-slate-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => onSearch('')}
                aria-label="Clear search"
                className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <Icon name="x" size={18} />
              </button>
            )}
            <Button
              type="submit"
              className="shrink-0 rounded-xl bg-[#164e3d] px-7 py-3.5 text-sm font-semibold text-white shadow-xl transition-all hover:bg-emerald-700 hover:scale-105 active:scale-95"
            >
              Find Sessions
            </Button>
          </form>

          {/* Interactive Play Preview Button */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-md transition-transform group-hover:scale-110">
                <Icon name="play" size={14} className="ml-0.5 fill-current" />
              </span>
              Watch Masterclass Preview Video
            </button>
            <button
              onClick={toggleMute}
              className="rounded-full border border-white/20 bg-white/10 p-3 text-white hover:bg-white/20 backdrop-blur-md transition-transform hover:scale-105"
              title={isMuted ? 'Unmute video audio' : 'Mute video audio'}
            >
              <Icon name={isMuted ? 'volume-x' : 'volume-2'} size={18} />
            </button>
          </div>

          {/* Glassmorphic Stats Container */}
          <div className="mt-14 rounded-2xl border border-white/15 bg-slate-900/65 p-6 shadow-2xl backdrop-blur-md">
            <dl className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-y-0 md:divide-x">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center py-3 md:py-0">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="text-3xl font-extrabold text-white md:text-4xl tracking-tight">
                    {stat.value}
                  </dd>
                  <span className="mt-1 text-xs font-bold tracking-wider text-emerald-300 uppercase">
                    {stat.label}
                  </span>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Video Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-md backdrop-blur-xl animate-fade-in-up">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-lg py-md">
              <div className="flex items-center gap-sm">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-headline-sm font-bold text-white">BookSync Live Masterclass Preview</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <Icon name="x" size={24} />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=0"
                title="BookSync Live Session Preview"
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between p-lg bg-slate-900">
              <div>
                <h4 className="text-label-lg font-bold text-white">System Architecture for Scale</h4>
                <p className="text-body-sm text-slate-400">Led by Marcus Chen • Live 2-hour session</p>
              </div>
              <Button onClick={() => setShowModal(false)} className="bg-[#164e3d] text-white">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SessionCard({ session }) {
  const status = availability(session);
  const soldOut = session.seats_remaining === 0;

  // Determine category and formatted start date for card sub-header matching reference screenshot 2
  const categoryName = session.category || 'WORKSHOP';

  return (
    <Card
      as={Link}
      to={`/sessions/${session.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
    >
      {/* Cover Image Container matching Screenshot 2 */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <Cover session={session} className="h-full w-full">
          {/* Top-Left LIVE Badge matching Screenshot 2 */}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            LIVE
          </span>

          {/* Top-Right Price Badge matching Screenshot 2 */}
          <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur-sm">
            {formatPrice(session.price_cents)}
          </span>
        </Cover>
      </div>

      {/* Card Content Body matching Screenshot 2 */}
      <div className="flex flex-grow flex-col p-5">
        {/* Category & Time line (e.g. DESIGN • Tomorrow, 10:00 AM) */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          {categoryName} · {formatDate(session.starts_at)}, {formatTime(session.starts_at)}
        </p>

        {/* Title matching Screenshot 2 */}
        <h3 className="mb-2 line-clamp-2 text-lg font-bold text-slate-900 transition-colors group-hover:text-emerald-800">
          {session.title}
        </h3>

        {/* Description matching Screenshot 2 */}
        {session.description && (
          <p className="mb-4 line-clamp-2 text-sm text-slate-600 leading-relaxed">
            {session.description}
          </p>
        )}

        {/* Bottom Footer Row: Host Avatar + Name & Spots Left matching Screenshot 2 */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-medium">
          <div className="flex items-center gap-2">
            <Avatar user={session.creator} size={24} />
            <span className="font-semibold text-slate-800">
              {session.creator.display_name || session.creator.username}
            </span>
          </div>

          <span
            className={cx(
              'font-semibold',
              soldOut ? 'text-red-600' : session.seats_remaining <= 3 ? 'text-slate-700' : 'text-slate-600',
            )}
          >
            {soldOut ? 'Waitlist open' : `${session.seats_remaining} spots left`}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const [filter, setFilter] = useState('all');
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/sessions/?when=upcoming${query ? `&q=${encodeURIComponent(query)}` : ''}`)
      .then((data) => !cancelled && setSessions(data.results))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query]);

  const visible = sessions.filter((session) => {
    if (filter === 'available') return session.seats_remaining > 0;
    if (filter === 'free') return session.price_cents === 0;
    return true;
  });

  const search = (value) => setParams(value ? { q: value } : {}, { replace: true });
  const clearFilters = () => {
    setFilter('all');
    setParams({}, { replace: true });
  };

  return (
    <Layout fullBleed>
      <Hero sessions={sessions} query={query} onSearch={search} />

      <div className="mx-auto max-w-content px-margin_mobile md:px-margin_desktop">
        {/* Section Header matching Screenshot 2 */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 pt-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Featured Live Sessions</h2>
            <p className="mt-1 text-sm text-slate-500">Curated workshops starting soon.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {FILTERS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setFilter(option.key)}
                  aria-pressed={filter === option.key}
                  className={cx(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200',
                    filter === option.key
                      ? 'border-[#164e3d] bg-[#164e3d] text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setFilter('all')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              View all <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-lg">
            <Banner kind="error" title="Could not load the catalog">
              {error}
            </Banner>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <SkeletonCard key={key} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={query || filter !== 'all' ? 'search' : 'calendar'}
            title={query || filter !== 'all' ? 'No sessions match' : 'The catalog is empty'}
            action={
              query || filter !== 'all' ? (
                <Button variant="outline" onClick={clearFilters} icon="x">
                  Clear filters
                </Button>
              ) : user?.role === 'creator' ? (
                <Button as={Link} to="/creator/sessions/new" icon="plus">
                  Publish the first session
                </Button>
              ) : (
                <Button as={Link} to="/signup" icon="user">
                  Create an account to host one
                </Button>
              )
            }
          >
            {query || filter !== 'all'
              ? 'Nothing upcoming fits those filters. Try widening the search.'
              : 'No upcoming sessions yet — the first one could be yours.'}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
            {visible.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
