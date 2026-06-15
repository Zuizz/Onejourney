import { useState } from 'react';
import { useJourney } from '../App';
import { CheckCircle, Download, Share2, Leaf, Ticket } from 'lucide-react';
import { downloadTicket, shareTicket, qrCodeUrl } from '../utils/journeyActions';

export default function BookingConfirmation() {
  const { booking, navigate, showToast } = useJourney();
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!booking) {
    return (
      <div className="screen-pad flex flex-col gap-16 animate-fade-in" style={{ alignItems: 'center', paddingTop: 60 }}>
        <Ticket size={32} strokeWidth={1.5} style={{ color: '#6B7280' }} />
        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No booking yet</p>
        <p className="text-xs text-muted" style={{ textAlign: 'center' }}>Search and book a route first</p>
        <button className="btn btn-primary" onClick={() => navigate('home')}>Go to home</button>
      </div>
    );
  }

  const handleSave = () => {
    setSaving(true);
    try {
      downloadTicket(booking);
      showToast('Ticket saved to downloads', 'success');
    } catch {
      showToast('Could not save ticket', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const result = await shareTicket(booking);
      showToast(
        result.method === 'native' ? 'Shared successfully' : 'Link copied to clipboard',
        'success'
      );
    } catch {
      showToast('Share cancelled or failed', 'warning');
    } finally {
      setSharing(false);
    }
  };

  const qrData = `${booking.ticketId}|${booking.from}|${booking.to}|${booking.date}`;

  return (
    <div className="screen-pad flex flex-col gap-16 animate-fade-in" style={{ alignItems: 'center', paddingTop: 32 }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: '#059669',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CheckCircle size={36} strokeWidth={1.5} style={{ color: '#fff' }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Booking confirmed</h2>
        <p className="text-sm text-muted mt-8">Your journey has been booked successfully</p>
      </div>

      <div style={{
        width: '100%', background: '#fff',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden', position: 'relative',
        border: '1px solid #E5E7EB',
      }}>
        <div style={{
          background: '#4F46E5',
          padding: '20px', color: '#fff',
        }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.8 }}>TICKET ID</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.9 }}>{booking.ticketId}</span>
          </div>
          <div className="flex items-center justify-between mt-16">
            <div>
              <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>FROM</p>
              <p style={{ fontSize: '1rem', fontWeight: 700 }}>{booking.fromCode}</p>
              <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>{booking.from}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.4)' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.6)' }} />
                <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.4)' }} />
              </div>
              <p style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: 4 }}>{booking.duration}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>TO</p>
              <p style={{ fontSize: '1rem', fontWeight: 700 }}>{booking.toCode}</p>
              <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>{booking.to}</p>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', height: 20 }}>
          <div style={{
            position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)',
            width: 24, height: 24, borderRadius: '50%', background: 'var(--slate-100)',
          }} />
          <div style={{
            position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
            width: 24, height: 24, borderRadius: '50%', background: 'var(--slate-100)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: 24, right: 24,
            borderTop: '2px dashed var(--slate-200)',
          }} />
        </div>

        <div style={{ padding: '16px 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Date', value: booking.date },
              { label: 'Mode', value: booking.mode },
              { label: 'Cost', value: booking.cost },
            ].map(d => (
              <div key={d.label} className="metric-chip">
                <p className="metric-label">{d.label}</p>
                <p className="metric-value" style={{ fontSize: d.label === 'Mode' ? '0.82rem' : undefined }}>{d.value}</p>
              </div>
            ))}
          </div>

          <div style={{
            width: 120, height: 120, margin: '0 auto',
            background: 'var(--slate-50)', borderRadius: 'var(--radius-md)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            border: '2px dashed var(--slate-200)', overflow: 'hidden',
          }}>
            <img
              src={qrCodeUrl(qrData, 100)}
              alt={`QR code for ticket ${booking.ticketId}`}
              width={100}
              height={100}
              style={{ display: 'block' }}
            />
            <p style={{ fontSize: '0.55rem', color: '#6B7280', marginTop: 4, letterSpacing: '0.05em' }}>Scan to board</p>
          </div>
        </div>
      </div>

      <div style={{
        width: '100%',
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
      }}>
        <div className="flex items-center gap-8 mb-12">
          <Leaf size={16} strokeWidth={1.5} style={{ color: '#059669' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>Eco impact</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>{booking.co2Saved} CO₂</p>
            <p style={{ fontSize: '0.7rem', color: '#6B7280' }}>saved vs driving alone</p>
          </div>
          <div style={{
            background: '#fff', borderRadius: 'var(--radius-sm)',
            padding: '8px 12px', textAlign: 'center',
            border: '1px solid #E5E7EB',
          }}>
            <p style={{ fontSize: '0.55rem', color: '#6B7280' }}>Powered by</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>ONDC</p>
          </div>
        </div>
      </div>

      <div className="flex gap-8 w-full">
        <button
          className="btn w-full"
          style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', border: '1px solid var(--slate-200)' }}
          onClick={handleSave}
          disabled={saving}
        >
          <Download size={16} /> {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          className="btn w-full"
          style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', border: '1px solid var(--slate-200)' }}
          onClick={handleShare}
          disabled={sharing}
        >
          <Share2 size={16} /> {sharing ? 'Sharing...' : 'Share'}
        </button>
      </div>

      <button className="btn btn-primary w-full" onClick={() => navigate('active')} style={{ padding: '14px' }}>
        Track live journey
      </button>
    </div>
  );
}
