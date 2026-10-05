import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Practice = 'home' | 'calmer' | 'focused' | 'energized';
type PracticeStatus = 'ready' | 'active' | 'complete';
type FeedbackState = 'none' | 'form' | 'submitted';

type FeedbackOutcome = 'calmer' | 'clearer' | 'more_energized' | 'no_real_change';

const feedbackOutcomes: { id: FeedbackOutcome; label: string }[] = [
  { id: 'calmer', label: 'Calmer' },
  { id: 'clearer', label: 'Clearer' },
  { id: 'more_energized', label: 'More energized' },
  { id: 'no_real_change', label: 'No real change' },
];

type PracticeCopy = {
  label: string;
  title: string;
  instruction: string;
  secondary?: string;
};

const practiceCopy: Record<Exclude<Practice, 'home'>, PracticeCopy> = {
  calmer: {
    label: 'Calmer',
    title: 'Breathe with the circle',
    instruction: 'Inhale as it expands. Exhale as it gets smaller.',
    secondary: '4 sec in · 6 sec out',
  },
  focused: {
    label: 'More focused',
    title: 'Bring your attention to one place.',
    instruction: 'Keep your eyes on the center. Breathe naturally.',
    secondary: 'Count 1 → 10 → 1',
  },
  energized: {
    label: 'More energized',
    title: 'Wake up your body.',
    instruction: 'Stand up if you can.',
  },
};

const energyPhases = [
  { cue: 'Shake', instruction: 'Shake out your hands, arms, shoulders and legs. Let your whole body loosen up.', duration: 20 },
  { cue: 'Reach', instruction: 'Raise your arms overhead as you inhale. Lower them as you exhale. Keep moving with your breath.', duration: 20 },
  { cue: 'Expand', instruction: 'Stretch your arms out wide to the sides. Gently lift your chest and take a full breath.', duration: 10 },
  { cue: 'Stillness', instruction: 'Let your arms rest by your sides. Stand still and notice how your body feels.', duration: 10 },
];

const audioTracks: Record<Exclude<Practice, 'home'>, string> = {
  calmer: 'https://raw.githubusercontent.com/alesiatuasho-afk/synbreath-audio/main/calmer.mp3',
  focused: 'https://raw.githubusercontent.com/alesiatuasho-afk/synbreath-audio/main/focused.mp3',
  energized: 'https://raw.githubusercontent.com/alesiatuasho-afk/synbreath-audio/main/energized.mp3',
};

function App() {
  const [practice, setPractice] = useState<Practice>('home');
  const [status, setStatus] = useState<PracticeStatus>('ready');
  const [elapsed, setElapsed] = useState(0);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('none');

  const beginPractice = (nextPractice: Exclude<Practice, 'home'>) => {
    setPractice(nextPractice);
    setStatus('ready');
    setElapsed(0);
    setFeedbackState('none');
  };

  const returnHome = () => {
    setPractice('home');
    setStatus('ready');
    setElapsed(0);
    setFeedbackState('none');
  };

  useEffect(() => {
    if (status !== 'active') return undefined;

    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const nextElapsed = (now - startedAt) / 1000;
      const duration = practice === 'calmer' ? 50 : 60;
      if (nextElapsed >= duration) {
        setElapsed(duration);
        setStatus('complete');
        return;
      }
      setElapsed(nextElapsed);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [practice, status]);

  useEffect(() => {
    if (status !== 'active') return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  return (
    <main className={`app-shell ${practice !== 'home' ? 'practice-shell' : ''}`}>
      <div className="ambient-glow ambient-glow-one" />
      <div className="ambient-glow ambient-glow-two" />
      {practice === 'home' ? (
        <HomeScreen onChoose={beginPractice} />
      ) : feedbackState === 'none' ? (
        <PracticeScreen
          practice={practice}
          status={status}
          elapsed={elapsed}
          onStart={() => {
            setStatus('active');
            setElapsed(0);
          }}
          onReturnHome={returnHome}
          onComplete={() => setFeedbackState('form')}
        />
      ) : (
        <FeedbackScreen
          feedbackState={feedbackState}
          onSubmit={async (outcomes, written) => {
            const { error } = await supabase.from('practice_feedback').insert({
              practice,
              outcomes,
              feedback: written || null,
            });
            if (error) {
              console.error('[Synbreathe] Feedback save failed:', error);
            }
            setFeedbackState('submitted');
          }}
          onSkip={returnHome}
          onReturnHome={returnHome}
        />
      )}
    </main>
  );
}

function HomeScreen({ onChoose }: { onChoose: (practice: Exclude<Practice, 'home'>) => void }) {
  return (
    <section className="home-screen screen-frame">
      <div className="home-copy">
        <p className="eyebrow">A moment for your nervous system</p>
        <h1>
          How do you want
          <span>to feel right now?</span>
        </h1>
        <div className="choice-list" aria-label="Choose how you want to feel">
          <button type="button" onClick={() => onChoose('calmer')}>Calmer</button>
          <button type="button" onClick={() => onChoose('focused')}>More focused</button>
          <button type="button" onClick={() => onChoose('energized')}>More energized</button>
        </div>
      </div>
      <BreathForm />
      <div className="wordmark" aria-label="Synbreathe">S Y N B R E A T H</div>
    </section>
  );
}

function BreathForm() {
  const lines = useMemo(() => Array.from({ length: 29 }, (_, index) => index), []);
  return (
    <div className="breath-form" aria-hidden="true">
      <svg viewBox="0 0 420 560" role="presentation">
        <defs>
          <filter id="line-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {lines.map((line) => {
          const inset = line * 3.7;
          const wave = Math.sin(line * 0.52) * 15;
          return (
            <path
              key={line}
              className={line % 5 === 0 ? 'form-line form-line-bright' : 'form-line'}
              d={`M ${96 + wave} ${82 + inset * 0.57} C ${164 - wave} ${18 + inset * 0.18}, ${318 + wave} ${104 + inset * 0.12}, ${288 - wave} ${240 + inset * 0.3} C ${262 - wave} ${340 - inset * 0.04}, ${118 + wave} ${356 + inset * 0.21}, ${130 + wave} ${486 - inset * 0.22}`}
              filter={line % 5 === 0 ? 'url(#line-glow)' : undefined}
            />
          );
        })}
      </svg>
    </div>
  );
}

function PracticeScreen({
  practice,
  status,
  elapsed,
  onStart,
  onReturnHome,
  onComplete,
}: {
  practice: Exclude<Practice, 'home'>;
  status: PracticeStatus;
  elapsed: number;
  onStart: () => void;
  onReturnHome: () => void;
  onComplete: () => void;
}) {
  const copy = practiceCopy[practice];
  const complete = status === 'complete';
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeFrame = useRef<number | undefined>(undefined);
  const audioSrc = audioTracks[practice];

  useEffect(() => {
    const audio = new Audio(audioSrc);
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    return () => {
      if (fadeFrame.current !== undefined) cancelAnimationFrame(fadeFrame.current);
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [audioSrc]);

  useEffect(() => {
    soundRef.current = soundEnabled;
    const audio = audioRef.current;
    if (audio) audio.muted = !soundEnabled;
  }, [soundEnabled]);

  const stopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeFrame.current !== undefined) cancelAnimationFrame(fadeFrame.current);
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.3;
  };

  const startAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeFrame.current !== undefined) cancelAnimationFrame(fadeFrame.current);
    audio.currentTime = 0;
    audio.muted = !soundRef.current;
    audio.volume = 0.3;
    audio.play().catch((err) => console.error('[Synbreathe] Audio playback failed:', err));
  };

  useEffect(() => {
    if (status !== 'complete') return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;
    if (fadeFrame.current !== undefined) cancelAnimationFrame(fadeFrame.current);
    const startedAt = performance.now();
    const initialVolume = audio.volume;
    const fadeOut = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 2500);
      if (audio) audio.volume = initialVolume * (1 - progress);
      if (progress < 1) {
        fadeFrame.current = requestAnimationFrame(fadeOut);
      } else {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0.3;
        }
        onComplete();
      }
    };
    fadeFrame.current = requestAnimationFrame(fadeOut);
    return () => {
      if (fadeFrame.current !== undefined) cancelAnimationFrame(fadeFrame.current);
    };
  }, [status]);

  const handleStart = () => {
    startAudio();
    onStart();
  };

  const handleReturnHome = () => {
    stopAudio();
    onReturnHome();
  };

  return (
    <section className={`practice-screen screen-frame practice-${practice}`}>
      <button className="back-button" type="button" onClick={handleReturnHome} aria-label="Return to home">
        <span aria-hidden="true">↤</span> Back
      </button>
      <button
        className="sound-button"
        type="button"
        onClick={() => setSoundEnabled((enabled) => !enabled)}
        aria-label={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
        aria-pressed={soundEnabled}
      >
        {soundEnabled ? <Volume2 size={15} strokeWidth={1.5} /> : <VolumeX size={15} strokeWidth={1.5} />}
      </button>
      <div className="practice-content">
        <p className="eyebrow">{copy.label}</p>
        {complete ? (
          <>
            <h1>Notice how you feel now.</h1>
            <button className="primary-button" type="button" onClick={handleReturnHome}>Try another</button>
          </>
        ) : practice === 'energized' ? (
          <EnergizedPractice status={status} elapsed={elapsed} onStart={handleStart} />
        ) : practice === 'calmer' ? (
          <CalmerPractice status={status} elapsed={elapsed} onStart={handleStart} />
        ) : (
          <FocusedPractice status={status} elapsed={elapsed} onStart={handleStart} />
        )}
      </div>
      <p className="practice-footer">Synbreathe · take a small reset</p>
    </section>
  );
}

function CalmerPractice({ status, elapsed, onStart }: { status: PracticeStatus; elapsed: number; onStart: () => void }) {
  const phaseElapsed = elapsed % 10;
  const inhale = phaseElapsed < 4;
  const progress = inhale ? phaseElapsed / 4 : (phaseElapsed - 4) / 6;
  const scale = inhale ? 0.82 + progress * 0.18 : 1 - progress * 0.18;
  return (
    <>
      <h1>Breathe with the circle</h1>
      <p className="instruction">Inhale as it expands. Exhale as it gets smaller.</p>
      <p className="secondary">4 sec in <span>·</span> 6 sec out</p>
      <div className="calmer-visual">
        <div className={`breathing-circle ${status === 'active' ? 'breathing' : ''}`} style={{ transform: `scale(${status === 'active' ? scale : 0.88})` }}>
          {status === 'active' && <span>{inhale ? 'Inhale' : 'Exhale'}</span>}
        </div>
      </div>
      {status === 'active' ? <p className="live-cue">{inhale ? 'Inhale' : 'Exhale'}</p> : <button className="primary-button" type="button" onClick={onStart}>Start</button>}
    </>
  );
}

function FocusedPractice({ status, elapsed, onStart }: { status: PracticeStatus; elapsed: number; onStart: () => void }) {
  return (
    <>
      <h1>Bring your attention to one place.</h1>
      <p className="instruction">Keep your eyes on the center. Breathe naturally.</p>
      <p className="secondary focused-count">Count slowly from 1 to 10,<br />then back down to 1.</p>
      <PracticeVisual practice="focused" status={status} elapsed={elapsed} />
      {status === 'active' ? <p className="live-reminder">Lost your count? Begin again.</p> : <button className="primary-button" type="button" onClick={onStart}>Start</button>}
    </>
  );
}

function EnergizedPractice({ status, elapsed, onStart }: { status: PracticeStatus; elapsed: number; onStart: () => void }) {
  const phase = energyPhases.find((item, index) => elapsed < energyPhases.slice(0, index + 1).reduce((sum, current) => sum + current.duration, 0)) ?? energyPhases[3];
  return (
    <>
      {status === 'ready' ? (
        <>
          <h1>Wake up your body.</h1>
          <p className="instruction">Stand up if you can.</p>
          <div className="energy-ready-mark" aria-hidden="true"><i /><i /><i /></div>
          <button className="primary-button" type="button" onClick={onStart}>Start</button>
        </>
      ) : (
        <>
          <h1 className="phase-cue">{phase.cue}</h1>
          <p className="instruction">{phase.instruction}</p>
          <div className={`energy-visual energy-${phase.cue.toLowerCase()}`} aria-hidden="true"><i /><i /><i /><i /></div>
        </>
      )}
    </>
  );
}

function PracticeVisual({ practice, status, elapsed }: { practice: Exclude<Practice, 'home'>; status: PracticeStatus; elapsed: number }) {
  if (practice === 'focused') {
    return <div className={`focus-visual ${status === 'active' ? 'focus-active' : ''}`} style={{ animationDelay: `${-(elapsed % 7)}s` }} aria-hidden="true"><span /></div>;
  }
  if (practice === 'energized') return <div className="energy-complete-mark" aria-hidden="true"><span /><span /></div>;
  return <div className="complete-breath" aria-hidden="true" />;
}

function FeedbackScreen({
  feedbackState,
  onSubmit,
  onSkip,
  onReturnHome,
}: {
  feedbackState: FeedbackState;
  onSubmit: (outcomes: string[], written: string) => void;
  onSkip: () => void;
  onReturnHome: () => void;
}) {
  const [selected, setSelected] = useState<Set<FeedbackOutcome>>(new Set());
  const [written, setWritten] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleOutcome = (id: FeedbackOutcome) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    await onSubmit(Array.from(selected), written.trim());
  };

  if (feedbackState === 'submitted') {
    return (
      <section className="feedback-screen screen-frame practice-screen">
        <div className="practice-content feedback-content">
          <h1 className="feedback-thanks">Thank you.</h1>
          <p className="instruction">Your feedback helps us make SYNREBREATHE better.</p>
          <button className="primary-button" type="button" onClick={onReturnHome}>Back to Home</button>
        </div>
        <p className="practice-footer">Synbreathe · take a small reset</p>
      </section>
    );
  }

  return (
    <section className="feedback-screen screen-frame practice-screen">
      <button className="back-button" type="button" onClick={onSkip} aria-label="Return to home">
        <span aria-hidden="true">↤</span> Back
      </button>
      <div className="practice-content feedback-content">
        <p className="eyebrow">A moment to notice</p>
        <h1 className="feedback-heading">How do you feel now?</h1>
        <p className="feedback-question">What changed most?</p>
        <div className="feedback-options" role="group" aria-label="What changed most">
          {feedbackOutcomes.map((outcome) => {
            const isSelected = selected.has(outcome.id);
            return (
              <button
                key={outcome.id}
                type="button"
                className={`feedback-option ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleOutcome(outcome.id)}
                aria-pressed={isSelected}
              >
                {outcome.label}
              </button>
            );
          })}
        </div>
        <div className="feedback-text-area">
          <p className="feedback-text-label">Anything you noticed?</p>
          <p className="feedback-helper">Optional — a few words is enough.</p>
          <textarea
            className="feedback-input"
            value={written}
            onChange={(e) => setWritten(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder=""
            aria-label="Anything you noticed?"
          />
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
        <button type="button" className="feedback-skip" onClick={onSkip}>
          Skip
        </button>
      </div>
      <p className="practice-footer">Synbreathe · take a small reset</p>
    </section>
  );
}

export default App;
