import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import Layout, { PageHeader } from '../components/Layout';
import { useToast } from '../components/Toast';
import { Badge, Banner, Button, Card, EmptyState, SkeletonRow, cx } from '../components/ui';
import { api } from '../lib/api';
import { formatDate, formatDuration, formatPrice, formatTime } from '../lib/format';

function Stat({ icon, label, value }) {
  return (
    <Card className="p-lg">
      <div className="mb-sm flex items-center gap-sm text-on-surface-variant">
        <Icon name={icon} size={20} />
        <h3 className="text-label-sm uppercase tracking-wider">{label}</h3>
      </div>
      <p className="text-headline-lg text-on-surface">{value}</p>
    </Card>
  );
}

function SeatMeter({ session }) {
  const percent = Math.round((session.seats_taken / session.capacity) * 100);
  return (
    <div className="flex items-center gap-sm">
      <div className="h-2 w-full max-w-[100px] overflow-hidden rounded-full bg-surface-variant">
        <div
          className={cx('h-full transition-all', percent === 100 ? 'bg-secondary' : 'bg-primary')}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-label-sm">
        {session.seats_taken}/{session.capacity}
      </span>
    </div>
  );
}

function RowActions({ session, onDelete, deleting }) {
  return (
    <div className="flex justify-end gap-sm opacity-100 transition-opacity md:opacity-60 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      <Link
        to={`/creator/sessions/${session.id}/attendees`}
        title="View attendees"
        aria-label="View attendees"
        className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
      >
        <Icon name="users" size={20} />
      </Link>
      <Link
        to={`/creator/sessions/${session.id}/edit`}
        title="Edit session"
        aria-label="Edit session"
        className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-secondary"
      >
        <Icon name="edit" size={20} />
      </Link>
      <button
        onClick={() => onDelete(session)}
        disabled={deleting}
        title="Delete session"
        aria-label="Delete session"
        className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-error-container hover:text-error disabled:opacity-50"
      >
        <Icon name="trash" size={20} />
      </button>
    </div>
  );
}

export default function CreatorDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/sessions/?mine=1&when=all')
      .then((data) => setSessions(data.results))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const stats = useMemo(() => {
    const upcoming = sessions.filter((session) => !session.has_started);
    const seats = sessions.reduce((total, session) => total + session.seats_taken, 0);
    const value = sessions.reduce(
      (total, session) => total + session.seats_taken * session.price_cents,
      0,
    );
    return { upcoming: upcoming.length, seats, value };
  }, [sessions]);

  async function remove(session) {
    if (
      !window.confirm(
        `Delete “${session.title}”? Its ${session.seats_taken} booking(s) are deleted with it.`,
      )
    ) {
      return;
    }
    setDeletingId(session.id);
    try {
      await api.del(`/sessions/${session.id}/`);
      toast.success('Session deleted', `“${session.title}” is no longer listed.`);
      load();
    } catch (err) {
      toast.error('Could not delete session', err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Layout>
      <PageHeader
        title="Creator dashboard"
        subtitle="Manage your sessions and track bookings."
        actions={
          <Button onClick={() => navigate('/creator/sessions/new')} icon="plus">
            Create new session
          </Button>
        }
      />

      {error && (
        <div className="mb-lg">
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      <div className="mb-xl grid grid-cols-1 gap-gutter md:grid-cols-3">
        <Stat icon="calendar-check" label="Upcoming sessions" value={stats.upcoming} />
        <Stat icon="users" label="Seats booked" value={stats.seats} />
        <Stat icon="trending-up" label="Booked value" value={formatPrice(stats.value)} />
      </div>

      {loading ? (
        <div className="space-y-md">
          {[0, 1, 2].map((key) => (
            <SkeletonRow key={key} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          dashed
          icon="calendar"
          title="No sessions yet"
          action={
            <Button as={Link} to="/creator/sessions/new" icon="plus">
              Create your first session
            </Button>
          }
        >
          Publish a session and it appears in the public catalog immediately.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low">
                  {['Session', 'Date & time', 'Bookings', 'Status', ''].map((heading) => (
                    <th
                      key={heading}
                      className={cx(
                        'whitespace-nowrap px-lg py-md text-label-md text-on-surface-variant',
                        heading === '' && 'text-right',
                      )}
                    >
                      {heading || 'Actions'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-body-md text-on-surface">
                {sessions.map((session) => (
                  <tr key={session.id} className="group transition-colors hover:bg-surface-container-low/60">
                    <td className="px-lg py-md">
                      <Link
                        to={`/sessions/${session.id}`}
                        className="text-headline-sm transition-colors hover:text-primary"
                      >
                        {session.title}
                      </Link>
                      <div className="mt-xs text-body-sm text-on-surface-variant">
                        {formatPrice(session.price_cents)} · {formatDuration(session.duration_minutes)}
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-xs text-on-surface-variant">
                        <Icon name="calendar" size={16} />
                        <span>{formatDate(session.starts_at)}</span>
                      </div>
                      <div className="mt-xs flex items-center gap-xs text-on-surface-variant">
                        <Icon name="clock" size={16} />
                        <span>{formatTime(session.starts_at)}</span>
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      <SeatMeter session={session} />
                    </td>
                    <td className="px-lg py-md">
                      {session.has_started ? (
                        <Badge tone="neutral">Started</Badge>
                      ) : session.seats_remaining === 0 ? (
                        <Badge tone="warning">Full</Badge>
                      ) : (
                        <Badge tone="success" dot>
                          Open
                        </Badge>
                      )}
                    </td>
                    <td className="px-lg py-md text-right">
                      <RowActions
                        session={session}
                        onDelete={remove}
                        deleting={deletingId === session.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-outline-variant/30 bg-surface-container-lowest px-lg py-md text-body-sm text-on-surface-variant">
            Showing {sessions.length} session{sessions.length === 1 ? '' : 's'}
          </div>
        </Card>
      )}
    </Layout>
  );
}
