import { useState } from 'react';
import { ArrowRight, ArrowLeft, Train, Car, Bus, Eye } from 'lucide-react';

export default function OnboardingWizard({ onComplete, showToast }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    train: '',
    road: '',
    bus: '',
    priority: ''
  });
  const [loading, setLoading] = useState(false);

  const steps = [
    {
      id: 1,
      title: 'Local Train Preference',
      question: 'How do you prefer to ride Mumbai local trains?',
      icon: <Train size={24} color="var(--indigo-500)" />,
      options: [
        { id: 'ac', title: 'AC Local Train', desc: 'I value air conditioning and beating the humidity.' },
        { id: 'first', title: 'First Class (General)', desc: 'I want to avoid the worst of the crowd, but AC isn\'t essential.' },
        { id: 'second', title: 'Second Class (General)', desc: 'I want the cheapest option and don\'t mind general rush.' }
      ],
      field: 'train'
    },
    {
      id: 2,
      title: 'Road Transfers',
      question: 'For short station connections (last mile), what is your go-to?',
      icon: <Car size={24} color="var(--indigo-500)" />,
      options: [
        { id: 'cab', title: 'Direct Cabs (Uber/Ola/Kaali-Peeli)', desc: 'Direct, private, and air-conditioned.' },
        { id: 'auto', title: 'Auto Rickshaws', desc: 'Zipping through traffic lanes, fast and reasonably priced.' },
        { id: 'shared', title: 'Shared Auto / Walking', desc: 'Highly budget-focused or simple walking.' }
      ],
      field: 'road'
    },
    {
      id: 3,
      title: 'BEST Bus Preference',
      question: 'Which buses do you prefer for longer road commutes?',
      icon: <Bus size={24} color="var(--indigo-500)" />,
      options: [
        { id: 'premium', title: 'AC Bus', desc: 'Guaranteed seat, air conditioned, comfortable ride.' },
        { id: 'standard', title: 'Non-AC Bus', desc: 'Standard commute, highly affordable.' }
      ],
      field: 'bus'
    },
    {
      id: 4,
      title: 'Ultimate Goal',
      question: 'What is your absolute number one priority during travel?',
      icon: <Eye size={24} color="var(--indigo-500)" />,
      options: [
        { id: 'speed', title: 'Time (Speed)', desc: 'Get me to my destination as fast as possible.' },
        { id: 'cost', title: 'Budget (Cost)', desc: 'Save every single rupee possible.' },
        { id: 'comfort', title: 'Peace of Mind (Comfort)', desc: 'Avoid crowded platforms and heavy road traffic.' },
        { id: 'safety', title: 'Safety (Security)', desc: 'Secure routes, women-friendly options, and active safe zones.' }
      ],
      field: 'priority'
    }
  ];

  const currentStep = steps[step - 1];

  const selectOption = (val) => {
    setAnswers(prev => ({ ...prev, [currentStep.field]: val }));
  };

  const handleBack = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  const calculateDnaWeights = (ans) => {
    let cost = 50;
    let safety = 50;
    let speed = 50;
    let comfort = 50;

    // 1. Train adjustments
    if (ans.train === 'ac') { comfort += 25; cost -= 15; }
    else if (ans.train === 'first') { comfort += 15; cost -= 5; }
    else if (ans.train === 'second') { cost += 25; comfort -= 20; }

    // 2. Road transfers
    if (ans.road === 'cab') { comfort += 20; cost -= 15; speed += 5; }
    else if (ans.road === 'auto') { speed += 15; cost += 10; comfort -= 5; }
    else if (ans.road === 'shared') { cost += 20; speed -= 10; comfort -= 15; }

    // 3. Bus types
    if (ans.bus === 'premium') { comfort += 20; cost -= 5; }
    else if (ans.bus === 'standard') { cost += 20; comfort -= 15; }

    // 4. Primary Priority Override (strong bias)
    if (ans.priority === 'speed') speed = 90;
    else if (ans.priority === 'cost') cost = 90;
    else if (ans.priority === 'comfort') comfort = 90;
    else if (ans.priority === 'safety') safety = 95;

    const clamp = (val) => Math.max(10, Math.min(95, val));

    return {
      cost: clamp(cost),
      safety: clamp(safety),
      speed: clamp(speed),
      comfort: clamp(comfort)
    };
  };

  const handleFinish = async () => {
    if (!answers.priority) {
      showToast('Please select an option', 'warning');
      return;
    }

    setLoading(true);
    const computedPreferences = calculateDnaWeights(answers);

    try {
      const res = await fetch('/api/commute-dna', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: computedPreferences,
          answers: answers
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save preferences');
      }

      showToast('Commute DNA initialized!', 'success');
      onComplete();
    } catch (err) {
      showToast(err.message, 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-pad flex flex-col justify-between animate-fade-in" style={{ minHeight: '680px', padding: '24px' }}>
      
      {/* Progress Header */}
      <div>
        <div className="flex items-center justify-between mb-16">
          <span className="text-xs font-semibold text-muted" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Step {step} of 4: {currentStep.title}
          </span>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  width: 16, height: 4, borderRadius: 2,
                  background: i === step ? 'var(--indigo-500)' : i < step ? 'var(--indigo-200)' : 'var(--grey-200)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex flex-col gap-12 mb-16">
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'var(--indigo-50)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 8
          }}>
            {currentStep.icon}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--grey-900)', letterSpacing: '-0.3px' }}>
            {currentStep.question}
          </h2>
        </div>

        {/* Options List */}
        <div className="flex flex-col gap-12">
          {currentStep.options.map(opt => {
            const isSelected = answers[currentStep.field] === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => selectOption(opt.id)}
                className="card animate-fade-in"
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--indigo-400)' : 'var(--grey-200)',
                  background: isSelected ? 'var(--indigo-50)' : '#fff',
                  borderLeft: isSelected ? '4px solid var(--indigo-600)' : '1px solid var(--grey-200)',
                  boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                  transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  padding: '16px'
                }}
              >
                <div className="flex flex-col gap-4">
                  <span className="font-semibold text-sm" style={{ color: isSelected ? 'var(--indigo-700)' : 'var(--grey-900)' }}>
                    {opt.title}
                  </span>
                  <span className="text-xs text-muted">
                    {opt.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center mt-16" style={{ borderTop: '1px solid var(--grey-200)', paddingTop: 16 }}>
        <button
          onClick={handleBack}
          disabled={step === 1 || loading}
          className="btn"
          style={{
            background: 'transparent',
            color: step === 1 ? 'var(--grey-200)' : 'var(--grey-500)',
            opacity: step === 1 ? 0.3 : 1
          }}
        >
          <ArrowLeft size={16} style={{ marginRight: 4 }} />
          Back
        </button>

        {step === 4 ? (
          <button
            onClick={handleFinish}
            disabled={loading || !answers.priority}
            className="btn btn-primary"
            style={{ padding: '10px 24px' }}
          >
            {loading ? 'Saving...' : 'Finish Setup'}
            {!loading && <ArrowRight size={16} style={{ marginLeft: 4 }} />}
          </button>
        ) : (
          <button
            onClick={() => setStep(prev => prev + 1)}
            disabled={!answers[currentStep.field]}
            className={`btn ${answers[currentStep.field] ? 'btn-primary' : ''}`}
            style={{
              background: answers[currentStep.field] ? 'var(--indigo-600)' : 'var(--grey-100)',
              color: answers[currentStep.field] ? '#fff' : 'var(--grey-500)',
              cursor: answers[currentStep.field] ? 'pointer' : 'not-allowed',
              padding: '10px 24px'
            }}
          >
            Next
            <ArrowRight size={16} style={{ marginLeft: 4 }} />
          </button>
        )}
      </div>
    </div>
  );
}
