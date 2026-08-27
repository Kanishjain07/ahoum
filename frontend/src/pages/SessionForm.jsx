import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { FocusLayout } from '../components/Layout';
import { useToast } from '../components/Toast';
import { Banner, Button, Card, Cover, Field, PageLoader } from '../components/ui';

import { api } from '../lib/api';

const EMPTY = {
  title: '',
  description: '',
  cover_url: '',
  starts_at: '',
  duration_minutes: 60,
  capacity: 10,
  price_dollars: '0',
};

// <input type="datetime-local"> speaks local wall-clock time with no zone;
// the API speaks ISO 8601 UTC. Convert explicitly in both directions.
function toLocalInput(iso) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function SessionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;
    api
      .get(`/sessions/${id}/`)
      .then((session) =>
        setForm({
          title: session.title,
          description: session.description,
          cover_url: session.cover_url || '',
          starts_at: toLocalInput(session.starts_at),
          duration_minutes: session.duration_minutes,
          capacity: session.capacity,
          price_dollars: (session.price_cents / 100).toFixed(2),
        }),
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const body = {
      title: form.title,
      description: form.description,
      cover_url: form.cover_url.trim(),
      starts_at: new Date(form.starts_at).toISOString(),
      duration_minutes: Number(form.duration_minutes),
      capacity: Number(form.capacity),
      price_cents: Math.round(Number(form.price_dollars || 0) * 100),
    };

    try {
      const saved = id
        ? await api.patch(`/sessions/${id}/`, body)
        : await api.post('/sessions/', body);
      toast.success(id ? 'Session updated' : 'Session published', `“${saved.title}” is live.`);
      navigate(`/sessions/${saved.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <FocusLayout>
      <div className="w-full max-w-2xl py-lg">
        <Card className="overflow-hidden">
          <div className="border-b border-surface-variant bg-surface-container-low/50 px-lg py-md">
            <h2 className="text-headline-sm text-on-surface">
              {id ? 'Edit session' : 'Create new session'}
            </h2>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              Define the details for your booking slot. Capacity cannot be set below the seats
              already booked.
            </p>
          </div>

          {loading ? (
            <PageLoader />
          ) : (
            <>
              <form id="session-form" onSubmit={submit} className="flex flex-col gap-lg p-lg">
                {error && <Banner kind="error" title="Could not save">{error}</Banner>}

                <Field label="Session title" required value={form.title} onChange={update('title')} />

                <Field
                  as="textarea"
                  rows="4"
                  label="Description"
                  value={form.description}
                  onChange={update('description')}
                />

                <div>
                  <Field
                    label="Cover image URL (optional)"
                    type="url"
                    value={form.cover_url}
                    onChange={update('cover_url')}
                    hint="Leave empty to use a generated gradient cover."
                  />
                  <div className="mt-sm flex items-center gap-md">
                    <Cover
                      session={{ id: Number(id) || 0, cover_url: form.cover_url }}
                      className="h-16 w-28 shrink-0 rounded-lg border border-surface-variant"
                    />
                    <span className="flex items-center gap-xs text-label-sm text-on-surface-variant">
                      <Icon name="image" size={16} />
                      Cover preview
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                  <Field
                    label="Starts at"
                    type="datetime-local"
                    required
                    value={form.starts_at}
                    onChange={update('starts_at')}
                  />
                  <Field
                    label="Duration (minutes)"
                    type="number"
                    min="15"
                    step="15"
                    required
                    value={form.duration_minutes}
                    onChange={update('duration_minutes')}
                  />
                  <Field
                    label="Capacity"
                    type="number"
                    min="1"
                    required
                    value={form.capacity}
                    onChange={update('capacity')}
                  />
                  <Field
                    label="Price"
                    type="number"
                    min="0"
                    step="0.01"
                    prefix="₹"
                    required
                    value={form.price_dollars}
                    onChange={update('price_dollars')}
                    hint="0 for a free session."
                  />
                </div>
              </form>

              <div className="flex justify-end gap-md border-t border-surface-variant bg-surface-container-low px-lg py-md">
                <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" form="session-form" loading={busy} icon="check">
                  Save session
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </FocusLayout>
  );
}
