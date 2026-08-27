import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Layout, { PageHeader } from '../components/Layout';
import { Avatar, Badge, Banner, Button, Card, EmptyState, PageLoader } from '../components/ui';
import { api } from '../lib/api';
import { formatSlot } from '../lib/format';

export default function SessionAttendees() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([api.get(`/sessions/${id}/`), api.get(`/sessions/${id}/bookings/`)])
      .then(([sessionData, roster]) => {
        setSession(sessionData);
        setAttendees(roster);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return attendees;
    return attendees.filter((entry) =>
      entry.user.display_name.toLowerCase().includes(needle),
    );
  }, [attendees, query]);

  if (loading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Banner kind="error" title="Could not load attendees">
          {error}
        </Banner>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        back={{ to: '/creator', label: 'Back to dashboard' }}
        title={`Attendees for ${session.title}`}
        subtitle={formatSlot(session.starts_at, session.duration_minutes)}
        actions={
          <Button as={Link} to={`/creator/sessions/${session.id}/edit`} variant="outline" icon="edit">
            Edit session
          </Button>
        }
      />

      <Card className="mb-lg flex flex-col items-center justify-between gap-md p-md md:flex-row">
        <div className="relative w-full md:max-w-md">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search attendees by name…"
            aria-label="Search attendees"
            className="w-full rounded-lg border border-outline-variant bg-transparent py-2 pl-10 pr-4 text-body-md text-on-surface transition-all placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-sm">
          <Badge tone="primary" icon="users">
            {attendees.length} confirmed
          </Badge>
          <Badge tone="neutral">{session.seats_remaining} seats left</Badge>
        </div>
      </Card>

      {visible.length === 0 ? (
        <EmptyState
          dashed
          icon="users"
          title={attendees.length === 0 ? 'No attendees yet' : 'No attendees match that search'}
        >
          {attendees.length === 0
            ? 'Bookings for this session will appear here as soon as someone reserves a seat.'
            : 'Try a different name.'}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
          {visible.map((entry) => (
            <Card key={entry.id} className="group flex flex-col gap-md p-md transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-sm">
                <div className="flex items-center gap-md">
                  <Avatar user={entry.user} size={48} />
                  <h3 className="text-headline-sm text-on-surface transition-colors group-hover:text-primary">
                    {entry.user.display_name}
                  </h3>
                </div>
                <Badge tone="success" dot>
                  Confirmed
                </Badge>
              </div>
              <div className="border-t border-surface-variant/60 pt-sm">
                <p className="text-label-sm text-tertiary">Booked on</p>
                <p className="text-body-sm text-on-surface">
                  {new Date(entry.created_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
