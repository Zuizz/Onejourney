export function buildShareUrl(screen = 'home', ticketId = null) {
  const base = window.location.origin + window.location.pathname;
  const hash = ticketId ? `${screen}?ticket=${ticketId}` : screen;
  return `${base}#${hash}`;
}

export function downloadTicket(booking) {
  const payload = {
    ticketId: booking.ticketId,
    from: booking.from,
    to: booking.to,
    date: booking.date,
    mode: booking.mode,
    cost: booking.cost,
    duration: booking.duration,
    co2Saved: booking.co2Saved,
    issuedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${booking.ticketId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareTicket(booking, screen = 'booking') {
  const url = buildShareUrl(screen, booking.ticketId);
  const text = `OneJourney ticket ${booking.ticketId}: ${booking.from} → ${booking.to} on ${booking.date} (${booking.mode}, ${booking.cost})`;

  if (navigator.share) {
    await navigator.share({ title: 'OneJourney Ticket', text, url });
    return { method: 'native' };
  }

  await navigator.clipboard.writeText(`${text}\n${url}`);
  return { method: 'clipboard' };
}

export function qrCodeUrl(data, size = 120) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
