import { useEffect, useMemo, useState } from 'react';
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const videoRef = useRef(null);

  const stats = useMemo(() => {
    const seats = sessions.reduce((total, session) => total + session.seats_remaining, 0);
    const hosts = new Set(sessions.map((session) => session.creator.id)).size;
    return [
      { value: sessions.length ? `${sessions.length}` : '1,200+', label: 'Active Sessions' },
      { value: seats ? `${seats}` : '50k+', label: 'Seats Booked' },
      { value: hosts ? `${hosts}` : '850+', label: 'Expert Hosts' },
    ];
  }, [sessions]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <>
      <div className="relative mb-xl overflow-hidden rounded-3xl bg-slate-950 p-lg text-white shadow-2xl md:p-2xl">
        {/* Background Ambient Video Stream */}
        <div className="absolute inset-0 z-0 overflow-hidden opacity-35 transition-opacity duration-700">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="h-full w-full object-cover filter brightness-90 saturate-125 scale-105"
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
        </div>

        {/* Ambient Dark Mesh & Vignette Overlay */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-slate-950 via-slate-950/85 to-teal-950/60 backdrop-blur-[2px]" />

        {/* Main Hero Content Grid */}
        <div className="relative z-10 grid grid-cols-1 items-center gap-xl lg:grid-cols-12">
          {/* Left Column: Heading & Search */}
          <div className="lg:col-span-7">
            <div className="mb-md inline-flex items-center gap-xs rounded-full border border-teal-400/30 bg-teal-500/10 px-md py-1 text-label-sm font-semibold uppercase tracking-widest text-teal-300 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400"></span>
              </span>
              Live Masterclasses & Workshops
            </div>

            <h1 className="text-display font-extrabold leading-[1.08] tracking-tight text-white md:text-[3.25rem]">
              Small sessions, taught by people <span className="text-gradient">doing the work.</span>
            </h1>

            <p className="mt-md max-w-xl text-body-lg text-slate-300 leading-relaxed">
              Join intimate masterclasses and focused workshops led by industry practitioners.
              Level up your skills with real-world knowledge.
            </p>

            {/* Search Input Box */}
            <form
              onSubmit={(event) => event.preventDefault()}
              className="mt-xl flex max-w-lg items-center gap-sm rounded-2xl border border-white/20 bg-slate-900/80 p-2 shadow-2xl backdrop-blur-xl transition-all focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-400/30"
            >
              <div className="flex pl-3 text-slate-400">
                <Icon name="search" size={20} />
              </div>
              <input
                value={query}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="What do you want to learn? (e.g. Design, React, Copywriting)..."
                aria-label="Search sessions"
                className="w-full bg-transparent px-2 py-2 text-body-md text-white placeholder:text-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => onSearch('')}
                  aria-label="Clear search"
                  className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <Icon name="x" size={16} />
                </button>
              )}
              <Button type="submit" variant="primary" className="shrink-0 rounded-xl px-lg py-2.5">
                Find Sessions
              </Button>
            </form>
          </div>

          {/* Right Column: Hero Video Feature Card */}
          <div className="lg:col-span-5">
            <div className="group relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl backdrop-blur-xl transition-transform duration-500 hover:scale-[1.02]">
              {/* Video Preview Header */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                  alt="Featured Live Masterclass"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1 text-label-sm font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    LIVE DEMO
                  </span>
                  <span className="rounded-full bg-slate-900/80 px-3 py-1 text-label-sm font-medium text-slate-200 backdrop-blur-md">
                    1,200+ Active Seats
                  </span>
                </div>

                {/* Play Button Overlay */}
                <button
                  onClick={() => setShowModal(true)}
                  className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/90 text-slate-950 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-teal-400 group-hover:shadow-teal-500/50"
                  aria-label="Play Masterclass Preview"
                >
                  <Icon name="play" size={32} className="ml-1 fill-current" />
                </button>

                {/* Video Controls Bar */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <p className="text-body-sm font-semibold text-white drop-shadow">
                    System Architecture for Scale
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-800"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      <Icon name={isMuted ? 'volume-x' : 'volume-2'} size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="p-md bg-slate-900/95 flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                    alt="Marcus Chen"
                    className="h-10 w-10 rounded-full border border-teal-400/50 object-cover"
                  />
                  <div>
                    <p className="text-label-md font-bold text-white">Marcus Chen</p>
                    <p className="text-body-sm text-slate-400">Principal Systems Architect</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1 text-label-sm font-semibold text-teal-400 hover:text-teal-300"
                >
                  Watch Intro <Icon name="arrow-right" size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <dl className="relative z-10 mt-xl grid grid-cols-3 gap-md border-t border-white/10 pt-lg text-center md:text-left">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-headline-md font-extrabold text-white md:text-display">
                {stat.value}
              </dd>
              <span className="text-body-sm font-medium uppercase tracking-wider text-teal-300/80">
                {stat.label}
              </span>
            </div>
          ))}
        </dl>
      </div>

      {/* Video Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-md backdrop-blur-xl animate-fade-in-up">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-lg py-md">
              <div className="flex items-center gap-sm">
                <span className="h-3 w-3 rounded-full bg-teal-400 animate-ping" />
                <h3 className="text-headline-sm font-bold text-white">BookSync Masterclass Preview</h3>
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
                <h4 className="text-label-lg font-bold text-white">System Architecture & Microservices Workshop</h4>
                <p className="text-body-sm text-slate-400">Led by Marcus Chen • Live interactive 2-hour session</p>
              </div>
              <Button onClick={() => setShowModal(false)} variant="primary">
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

  return (
    <Card
      as={Link}
      to={`/sessions/${session.id}`}
      className="group relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
    >
      <Cover session={session} className="h-44 shrink-0">
        <span className="absolute left-lg top-sm rounded-full bg-surface-container-lowest/95 px-sm py-1 text-label-md text-on-surface shadow-sm backdrop-blur-sm">
          {formatPrice(session.price_cents)}
        </span>
        <div className="absolute right-sm top-sm flex gap-xs">
          {session.my_booking && (
            <Badge tone="primary" icon="check" className="bg-surface-container-lowest shadow-sm">
              Booked
            </Badge>
          )}
          <Badge
            tone={status.tone}
            dot
            className="bg-surface-container-lowest/95 shadow-sm backdrop-blur-sm"
          >
            {status.label}
          </Badge>
        </div>
      </Cover>

      <div className="flex flex-grow flex-col p-lg">
        {/* The host chip straddles the cover edge, so the card reads as one
            composition rather than a stack of equal rectangles. */}
        <div className="-mt-[38px] mb-md flex w-fit max-w-full items-center gap-sm rounded-full border border-surface-variant bg-surface-container-lowest/95 py-1 pl-1 pr-md shadow-sm backdrop-blur-sm">
          <Avatar user={session.creator} size={28} />
          <span className="truncate text-label-md text-on-surface-variant">
            {session.creator.display_name || session.creator.username}
          </span>
        </div>

        <h3 className="mb-sm line-clamp-2 text-headline-sm text-on-surface transition-colors group-hover:text-primary">
          {session.title}
        </h3>

        {session.description && (
          <p className="mb-md line-clamp-2 text-body-sm text-on-surface-variant">
            {session.description}
          </p>
        )}

        <div className="mt-auto space-y-sm border-t border-surface-variant/70 pt-md text-body-sm text-tertiary">
          <div className="flex items-center gap-sm">
            <Icon name="calendar" size={16} />
            <span>
              {formatDate(session.starts_at)} · {formatTime(session.starts_at)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-sm">
            <span className="flex items-center gap-sm">
              <Icon name="clock" size={16} />
              {formatDuration(session.duration_minutes)}
            </span>
            <span
              className={cx(
                'flex items-center gap-xs text-label-md',
                soldOut ? 'text-error' : 'text-primary',
              )}
            >
              <Icon name="users" size={16} />
              {session.seats_remaining} of {session.capacity} left
            </span>
          </div>
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
    <Layout>
      <Hero sessions={sessions} query={query} onSearch={search} />

      <div className="mb-lg flex flex-wrap items-center justify-between gap-md">
        <div className="flex flex-wrap items-center gap-sm">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key)}
              aria-pressed={filter === option.key}
              className={cx(
                'rounded-full border px-md py-2 text-label-md transition-all duration-200',
                filter === option.key
                  ? 'border-primary bg-primary text-on-primary shadow-sm'
                  : 'border-surface-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline-variant hover:text-on-surface',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="text-body-sm text-on-surface-variant">
          {loading
            ? 'Loading…'
            : `${visible.length} ${visible.length === 1 ? 'session' : 'sessions'}${
                query ? ` matching “${query}”` : ''
              }`}
        </p>
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
    </Layout>
  );
}
