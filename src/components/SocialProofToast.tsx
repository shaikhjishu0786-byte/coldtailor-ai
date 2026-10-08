import { useState, useEffect, useRef } from 'react';
import { X, FileText, Users, Crown } from 'lucide-react';

interface ProofEvent {
  icon: typeof FileText;
  text: string;
  dotColor: string;
}

const events: ProofEvent[] = [
  { icon: FileText, text: 'tailored a resume for Senior Frontend at Stripe (Score: 92%)', dotColor: 'bg-emerald-400' },
  { icon: Users, text: 'shortlisted 3 candidates for DevOps Engineer at AWS', dotColor: 'bg-sky-400' },
  { icon: Crown, text: 'unlocked Weekly Hunter Pro Pass', dotColor: 'bg-amber-400' },
  { icon: FileText, text: 'boosted ATS score from 61% to 88% for Product Manager at Atlassian', dotColor: 'bg-emerald-400' },
  { icon: Users, text: 'screened 5 candidates for Backend Engineer at Razorpay', dotColor: 'bg-sky-400' },
  { icon: FileText, text: 'tailored a resume for Full Stack Developer at Vercel (Score: 94%)', dotColor: 'bg-emerald-400' },
  { icon: Crown, text: 'upgraded to Recruiter & Founder Pass', dotColor: 'bg-amber-400' },
  { icon: FileText, text: 'generated a cold LinkedIn note for DevOps at Cloudflare', dotColor: 'bg-emerald-400' },
  { icon: Users, text: 'rejected 2 candidates for Data Scientist at Swiggy - missing ML fundamentals', dotColor: 'bg-sky-400' },
  { icon: FileText, text: 'tailored a resume for Engineering Manager at Google (Score: 87%)', dotColor: 'bg-emerald-400' },
];

const names = ['Aarav S.', 'Priya K.', 'Rahul M.', 'Sneha R.', 'Vikram J.', 'Ananya D.', 'Karthik N.', 'Meera P.', 'Arjun V.', 'Divya L.'];
const roles = ['Job Seeker', 'Hiring Lead', 'Recruiter', 'Candidate', 'Talent Ops'];
const INTERVAL = 25000;
const DISPLAY_DURATION = 5000;

export function SocialProofToast() {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<ProofEvent | null>(null);
  const [currentName, setCurrentName] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const indexRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showNext = () => {
      const event = events[indexRef.current % events.length];
      indexRef.current++;
      const name = names[Math.floor(Math.random() * names.length)];
      const role = roles[Math.floor(Math.random() * roles.length)];
      setCurrent(event);
      setCurrentName(name);
      setCurrentRole(role);
      setVisible(true);

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, DISPLAY_DURATION);
    };

    const initialDelay = setTimeout(showNext, 4000);
    const interval = setInterval(showNext, INTERVAL);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!current) return null;

  const Icon = current.icon;

  return (
    <div
      className={`fixed bottom-5 left-5 z-[90] transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex max-w-xs items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-2xl backdrop-blur-2xl">
        <div className="relative flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
            <Icon className="h-4 w-4 text-slate-300" />
          </div>
          <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${current.dotColor} ring-2 ring-slate-900`}>
            <span className={`absolute inset-0 animate-ping rounded-full ${current.dotColor} opacity-75`} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-snug text-slate-300">
            <span className="font-semibold text-slate-100">{currentName}</span>{' '}
            <span className="text-slate-500">{currentRole}</span>{' '}
            {current.text}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-600">{Math.floor(Math.random() * 50 + 2)} seconds ago</p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 rounded p-0.5 text-slate-600 transition hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
