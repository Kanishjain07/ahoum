import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Layout, { PageHeader } from '../components/Layout';
import { useToast } from '../components/Toast';
import { Badge, Banner, Button, Card, EmptyState, SkeletonRow, cx } from '../components/ui';
import { api } from '../lib/api';
import { formatDuration, formatSlot } from '../lib/format';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
];

function BookingRow({ booking, onCancel, cancelling }) {
  const { session } = booking;
  const cancelled = booking.status === 'cancelled';

  return (
    <Card className="group flex flex-col justify-between gap-md p-lg transition-shadow hover:shadow-md md:flex-row md:items-center">
      <div className="flex w-full flex-col gap-xs md:w-auto">
        <div className="mb-1 flex flex-wrap items-center gap-sm">
          {cancelled ? (
            <Badge tone="neutral" icon="x">
              Cancelled
            </Badge>
          ) : booking.is_past ? (
            <Badge tone="neutral" icon="check">
              Completed
            </Badge>
          ) : (
            <Badge tone="success" dot>
              Upcoming
            </Badge>
          )}
          <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
            <Icon name="clock" size={16} />
            {formatDuration(session.duration_minutes)}
          </span>
        </div>

        <Link
          to={`/sessions/${session.id}`}
          className="text-headline-sm text-on-surface transition-colors hover:text-primary"
        >
          {session.title}
        </Link>

        <div className="mt-2 flex flex-col gap-sm text-body-sm text-on-surface-variant sm:flex-row sm:gap-lg">
          <span className="flex items-center gap-1">
            <Icon name="calendar" size={18} />
            {formatSlot(session.starts_at, session.duration_minutes)}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="user" size={18} />
            {session.creator.display_name || session.creator.username}
          </span>
        </div>
      </div>

      <div className="mt-4 flex w-full shrink-0 gap-sm md:mt-0 md:w-auto md:justify-end">
        <Button as={Link} to={`/sessions/${session.id}`} variant="secondary" size="sm">
          View details
        </Button>
        {!cancelled && !booking.is_past && (
          <Button
            variant="danger"
            size="sm"
            loading={cancelling}
            onClick={() => onCancel(booking)}
            icon="x"
          >
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function MyBookings() {
  const [tab, setTab] = useState('active');
  const [data, setData] = useState({ active: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/bookings/?scope=active'), api.get('/bookings/?scope=past')])
      .then(([active, past]) => setData({ active: active.results, past: past.results }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function cancel(booking) {
    setCancellingId(booking.id);
    try {
      await api.post(`/bookings/${booking.id}/cancel/`);
      toast.success('Booking cancelled', `Your seat for “${booking.session.title}” was released.`);
      load();
    } catch (err) {
      toast.error('Could not cancel', err.message);
    } finally {
      setCancellingId(null);
    }
  }

  const rows = data[tab];

  return (
    <Layout>
      <PageHeader
        title="My bookings"
        subtitle="Manage your upcoming sessions and review past ones."
        actions={
          <div className="flex w-full rounded-lg border border-outline-variant bg-surface-container-low p-1 shadow-sm md:w-auto">
            {TABS.map((option) => (
              <button
                key={option.key}
                onClick={() => setTab(option.key)}
                className={cx(
                  'flex-1 rounded px-4 py-2 text-label-md transition-all md:w-32',
                  tab === option.key
                    ? 'bg-primary text-on-primary shadow'
                    : 'text-on-surface-variant hover:bg-surface-variant',
                )}
              >
                {option.label}
                <span className="ml-xs opacity-70">{data[option.key].length}</span>
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <div className="mb-lg">
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div className="space-y-md">
          {[0, 1, 2].map((key) => (
            <SkeletonRow key={key} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          dashed
          icon="ticket"
          title={tab === 'active' ? 'No active bookings' : 'No past bookings yet'}
          action={
            <Button as={Link} to="/" icon="compass">
              Explore sessions
            </Button>
          }
        >
          {tab === 'active'
            ? 'Your schedule is clear. Browse the catalog to find your next session.'
            : 'Sessions you have attended or cancelled will appear here.'}
        </EmptyState>
      ) : (
        <div className="space-y-md">
          {rows.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              onCancel={cancel}
              cancelling={cancellingId === booking.id}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
