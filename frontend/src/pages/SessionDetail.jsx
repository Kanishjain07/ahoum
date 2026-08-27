import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  Cover,
  EmptyState,
  PageLoader,
} from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { availability, formatDate, formatDuration, formatPrice, formatSlot } from '../lib/format';

function ConfirmationModal({ session, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-margin_mobile">
      <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-[2px]" onClick={onClose} />
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-confirmed"
        className="relative w-full max-w-[440px] p-xl text-center shadow-lg animate-fade-in-up"
      >
        <div className="relative mx-auto mb-lg flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-low">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
          <Icon name="check-circle" size={40} className="relative text-primary" />
        </div>
        <h2 id="booking-confirmed" className="mb-sm text-headline-sm text-on-background">
          Booking confirmed
        </h2>
        <p className="mb-xl text-body-md text-on-surface-variant">
          Your seat for “{session.title}” is reserved for {formatSlot(session.starts_at, session.duration_minutes)}.
        </p>
        <div className="space-y-md">
          <Button as={Link} to="/bookings" size="lg" iconAfter="arrow-right">
            View my bookings
          </Button>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Stay on this page
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MetaRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-body-md text-on-surface-variant">{label}</span>
      <span className={accent ? 'text-label-md text-primary' : 'text-label-md text-on-surface'}>
        {value}
      </span>
    </div>
  );
}

export default function SessionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const load = useCallback(
    () =>
      api
        .get(`/sessions/${id}/`)
        .then(setSession)
        .catch((err) => setLoadError(err.message)),
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function book() {
    setBusy(true);
    try {
      await api.post('/bookings/', { session_id: Number(id) });
      setConfirmed(true);
    } catch (err) {
      // A 409 is an expected outcome, not a page failure: the server is the
      // only authority on whether the seat was still free at write time.
      toast.error(
        err.code === 'session_full' ? 'Session full' : 'Could not complete booking',
        err.message,
      );
    } finally {
      // Refetch either way — a failed attempt usually means the counts moved.
      await load();
      setBusy(false);
    }
  }

  async function cancelBooking() {
    setCancelling(true);
    try {
      await api.post(`/bookings/${session.my_booking.id}/cancel/`);
      toast.success('Booking cancelled', 'Your seat has been released.');
    } catch (err) {
      toast.error('Could not cancel', err.message);
    } finally {
      await load();
      setCancelling(false);
    }
  }

  if (loadError) {
    return (
      <Layout>
        <EmptyState
          icon="calendar"
          title="This session is not available"
          action={
            <Button as={Link} to="/" icon="compass">
              Back to the catalog
            </Button>
          }
        >
          It may have been removed by its host, or the link may be out of date.
        </EmptyState>
      </Layout>
    );
  }
  if (!session) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  const status = availability(session);
  const isOwner = user?.id === session.creator.id;
  const soldOut = session.seats_remaining === 0;
  const bookedPercent = Math.round((session.seats_taken / session.capacity) * 100);

  return (
    <Layout>
      <Link
        to="/"
        className="mb-md inline-flex items-center gap-xs text-body-sm text-tertiary transition-colors hover:text-primary"
      >
        <Icon name="arrow-left" size={16} />
        Back to catalog
      </Link>

      <div className="flex flex-col gap-xl lg:flex-row">
        {/* Left column: the session itself */}
        <div className="flex-1 space-y-xl">
          <header className="space-y-md">
            <Badge tone="primary" icon="calendar-check">
              Live session
            </Badge>
            <h1 className="text-headline-lg-mobile text-on-background md:text-headline-lg">
              {session.title}
            </h1>
            <div className="flex flex-wrap items-center gap-md pt-sm text-on-surface-variant">
              <span className="flex items-center gap-xs text-body-md">
                <Icon name="calendar" size={20} />
                {formatDate(session.starts_at)}
              </span>
              <span className="flex items-center gap-xs text-body-md">
                <Icon name="clock" size={20} />
                {formatSlot(session.starts_at, session.duration_minutes).split('• ')[1]}
              </span>
              <span className="flex items-center gap-xs text-body-md">
                <Icon name="users" size={20} />
                {session.capacity} seats
              </span>
            </div>
          </header>

          <Cover
            session={session}
            className="h-56 w-full rounded-xl border border-surface-variant shadow-sm md:h-80"
          />

          <section className="space-y-md">
            <h2 className="text-headline-md text-on-background">About this session</h2>
            <p className="whitespace-pre-line text-body-md text-on-surface-variant">
              {session.description || 'The creator has not added a description yet.'}
            </p>
          </section>

          <Card className="flex flex-col items-start gap-lg p-lg sm:flex-row">
            <Avatar user={session.creator} size={72} className="shrink-0" />
            <div className="flex-1 space-y-sm">
              <div>
                <h3 className="text-headline-sm text-on-background">
                  {session.creator.display_name || session.creator.username}
                </h3>
                <p className="text-label-sm text-on-surface-variant">
                  Host on BookSync{session.creator.email ? ` • ${session.creator.email}` : ''}
                </p>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {session.creator.bio || 'This host has not written a bio yet.'}
              </p>
            </div>
          </Card>
        </div>

        {/* Right column: the booking box */}
        <aside className="w-full shrink-0 lg:w-[360px]">
          <Card className="sticky top-[104px] flex flex-col gap-lg p-lg shadow-md">
            <div className="flex items-start justify-between border-b border-surface-variant pb-md">
              <div>
                <div className="text-headline-lg text-on-background">
                  {formatPrice(session.price_cents)}
                </div>
                <div className="mt-xs text-body-sm text-on-surface-variant">per participant</div>
              </div>
              <Badge tone={status.tone} icon={soldOut ? 'x' : 'check-circle'}>
                {status.label}
              </Badge>
            </div>

            <div className="space-y-sm">
              <MetaRow label="Capacity" value={`${session.capacity} max`} />
              <MetaRow
                label="Remaining"
                value={`${session.seats_remaining} seats`}
                accent={!soldOut}
              />
              <MetaRow label="Duration" value={formatDuration(session.duration_minutes)} />
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-variant">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${bookedPercent}%` }}
                />
              </div>
            </div>

            {session.has_started ? (
              <Banner kind="info" title="This session has already started">
                Bookings closed when the session began.
              </Banner>
            ) : isOwner ? (
              <div className="space-y-md">
                <Banner kind="info">You are the host of this session.</Banner>
                <Button
                  as={Link}
                  to={`/creator/sessions/${session.id}/edit`}
                  size="lg"
                  variant="outline"
                  icon="edit"
                >
                  Edit session
                </Button>
                <Button
                  as={Link}
                  to={`/creator/sessions/${session.id}/attendees`}
                  size="lg"
                  variant="ghost"
                  icon="users"
                >
                  View attendees
                </Button>
              </div>
            ) : session.my_booking ? (
              <div className="space-y-md">
                <Banner kind="success" title="Your seat is confirmed">
                  Booked on {formatDate(session.my_booking.created_at)}.
                </Banner>
                <Button as={Link} to="/bookings" size="lg" variant="outline" icon="ticket">
                  View my bookings
                </Button>
                <Button
                  size="lg"
                  variant="danger"
                  icon="x"
                  loading={cancelling}
                  onClick={cancelBooking}
                >
                  Cancel booking
                </Button>
              </div>
            ) : user ? (
              <>
                <Button
                  size="lg"
                  onClick={book}
                  loading={busy}
                  disabled={soldOut}
                  iconAfter={soldOut ? undefined : 'arrow-right'}
                >
                  {soldOut ? 'Sold out' : busy ? 'Booking…' : 'Book this session'}
                </Button>
                <p className="text-center text-label-sm text-on-surface-variant">
                  Seats are confirmed by the server at the moment you book.
                </p>
              </>
            ) : (
              <Button size="lg" icon="github" onClick={() => navigate('/login')}>
                Sign in to book
              </Button>
            )}
          </Card>
        </aside>
      </div>

      {confirmed && <ConfirmationModal session={session} onClose={() => setConfirmed(false)} />}
    </Layout>
  );
}
