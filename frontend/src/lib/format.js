const DATE = { dateStyle: 'medium' };
const TIME = { hour: 'numeric', minute: '2-digit' };

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, DATE);
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, TIME);
}

/** "Oct 24, 2024 • 10:00 AM – 11:30 AM" */
export function formatSlot(iso, durationMinutes) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + (durationMinutes || 0) * 60000);
  return `${formatDate(iso)} • ${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDuration(minutes) {
  if (!minutes) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatPrice(cents) {
  if (!cents) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

/** Availability badge state, shared by the catalog and the detail sidebar. */
export function availability(session) {
  if (session.has_started) return { tone: 'neutral', label: 'Started' };
  if (session.seats_remaining === 0) return { tone: 'error', label: 'Sold out' };
  if (session.seats_remaining <= Math.max(1, Math.ceil(session.capacity * 0.2))) {
    return { tone: 'warning', label: 'Filling fast' };
  }
  return { tone: 'success', label: 'Available' };
}
