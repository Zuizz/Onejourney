import { useJourney } from '../App';
import { CheckCircle, Download, Share2, Leaf } from 'lucide-react';

export default function BookingConfirmation() {
  const { booking, navigate } = useJourney();

  if (!booking) {
    return (
      <div className="screen-pad flex flex-col gap-16 animate-fade-in" style={{ alignItems: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: '2rem' }}>🎫</div>
        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No booking yet</p>
        <p className="text-xs text-muted" style={{ textAlign: 'center' }}>Search and book a route first</p>
        <button className="btn btn-primary" onClick={() => navigate('home')}>Go to Home</button>
      </div>
    );
  }

  return (
    <div className="screen-pad flex flex-col gap-16 animate-fade-in" style={{ alignItems: 'center', paddingTop: 32 }}>
      {/* Green Checkmark */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--green-400), var(--green-600))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 30px rgba(16,185,129,0.35)',
        animation: 'pulse 2s ease infinite',
      }}>
        <CheckCircle size={36} style={{ color: '#fff' }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Booking Confirmed!</h2>
        <p className="text-sm text-muted mt-8">Your journey has been booked successfully</p>
      </div>

      {/* Ticket Card */}
      <div style={{
        width: '100%', background: '#fff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Top Section */}
        <div style={{
          background: 'linear-gradient(135deg, var(--indigo-600), var(--indigo-800))',
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

        {/* Punched Hole Divider */}
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

        {/* Bottom Section */}
        <div style={{ padding: '16px 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Date', value: booking.date },
              { label: 'Mode', value: booking.mode },
              { label: 'Cost', value: booking.cost },
            ].map(d => (
              <div key={d.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.6rem', color: 'var(--slate-500)' }}>{d.label}</p>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, marginTop: 2 }}>{d.value}</p>
              </div>
            ))}
          </div>

          {/* QR Placeholder */}
          <div style={{
            width: 120, height: 120, margin: '0 auto',
            background: 'var(--slate-50)', borderRadius: 'var(--radius-md)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            border: '2px dashed var(--slate-200)',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
              width: 70, height: 70,
            }}>
              {Array.from({ length: 49 }, (_, i) => (
                <div key={i} style={{
                  background: [0,1,2,6,7,8,14,21,28,35,42,43,44,48,4,5,3,11,12,13,18,19,20,24,25,26,30,31,32,36,37,38,40,41,46,47].includes(i)
                    ? 'var(--slate-800)' : 'transparent',
                  borderRadius: 1,
                }} />
              ))}
            </div>
            <p style={{ fontSize: '0.55rem', color: 'var(--slate-400)', marginTop: 6 }}>SCAN TO BOARD</p>
          </div>
        </div>
      </div>

      {/* Eco Strip */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(135deg, var(--green-50), #ecfdf5)',
        border: '1px solid var(--green-100)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
      }}>
        <div className="flex items-center gap-8 mb-12">
          <Leaf size={16} style={{ color: 'var(--green-600)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-700)' }}>Eco Impact</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--green-700)' }}>{booking.co2Saved} CO₂</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--green-600)' }}>saved vs driving alone</p>
          </div>
          <div style={{
            background: '#fff', borderRadius: 'var(--radius-md)',
            padding: '8px 12px', textAlign: 'center',
            border: '1px solid var(--green-100)',
          }}>
            <p style={{ fontSize: '0.55rem', color: 'var(--slate-500)' }}>Powered by</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--indigo-600)' }}>ONDC</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-8 w-full">
        <button className="btn w-full" style={{
          background: 'var(--slate-100)', color: 'var(--slate-700)', border: '1px solid var(--slate-200)',
        }}>
          <Download size={16} /> Save
        </button>
        <button className="btn w-full" style={{
          background: 'var(--slate-100)', color: 'var(--slate-700)', border: '1px solid var(--slate-200)',
        }}>
          <Share2 size={16} /> Share
        </button>
      </div>

      {/* Track Button */}
      <button className="btn btn-primary w-full" onClick={() => navigate('active')} style={{ padding: '14px' }}>
        Track Live Journey
      </button>
    </div>
  );
}
