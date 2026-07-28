import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Activity, Users, BarChart2, Mic, Camera, FileText,
  ArrowRight, CheckCircle, Cpu, Shield, Zap, Star,
  TrendingUp, ChevronRight, Play, Award, Globe, Lock
} from 'lucide-react';
import type { Page } from '../lib/types';

interface Props {
  navigate: (page: Page) => void;
}

/* ─── Animated counter ─── */
function Counter({ to, suffix = '', duration = 1500 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setVal(Math.round(ease * to));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Particle canvas ─── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = 80;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96,165,250,${p.alpha})`;
        ctx.fill();
      });

      // draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(96,165,250,${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ─── Typewriter ─── */
function Typewriter({ words }: { words: string[] }) {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    if (pause) {
      const t = setTimeout(() => setPause(false), 1400);
      return () => clearTimeout(t);
    }
    const target = words[wordIdx];
    if (!deleting && displayed === target) {
      setPause(true);
      setDeleting(true);
      return;
    }
    if (deleting && displayed === '') {
      setDeleting(false);
      setWordIdx((p) => (p + 1) % words.length);
      return;
    }
    const speed = deleting ? 45 : 85;
    const t = setTimeout(() => {
      setDisplayed(deleting ? displayed.slice(0, -1) : target.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [displayed, deleting, pause, wordIdx, words]);

  return (
    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">
      {displayed}
      <span className="animate-pulse text-cyan-400">|</span>
    </span>
  );
}

/* ─── Scroll reveal wrapper ─── */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.12 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Live mock dashboard ─── */
function MockDashboard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const members = [
    { name: 'Alex', voice: 87, color: '#3B82F6' },
    { name: 'Priya', voice: 72, color: '#10B981' },
    { name: 'Sam', voice: 58, color: '#F59E0B' },
    { name: 'Jordan', voice: 91, color: '#EF4444' },
  ];

  const liveVoice = members.map((m) => ({
    ...m,
    cur: Math.min(100, m.voice + Math.sin((tick + m.voice) * 0.4) * 8),
  }));

  return (
    <div className="bg-[#0D1626] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-full">
      {/* titlebar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0A1020]">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="text-gray-500 text-xs ml-3 font-mono">ContribuTrack Dashboard</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Live</span>
        </div>
      </div>

      {/* content */}
      <div className="p-5 space-y-4">
        {/* stat row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Members', val: '6', icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Fairness', val: '94%', icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            { label: 'Sessions', val: '12', icon: Activity, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon size={14} className={s.color} />
              </div>
              <p className="text-white font-bold text-lg leading-none">{s.val}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* live voice bars */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <p className="text-xs text-gray-400 font-semibold mb-3 flex items-center gap-1.5">
            <Mic size={11} className="text-blue-400" /> Voice Contributions — Live
          </p>
          <div className="space-y-2.5">
            {liveVoice.map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-10 font-medium">{m.name}</span>
                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${m.cur}%`,
                      background: m.color,
                      transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                      boxShadow: `0 0 8px ${m.color}60`,
                    }}
                  />
                </div>
                <span className="text-xs font-bold w-8 text-right" style={{ color: m.color }}>
                  {Math.round(m.cur)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* mini pie placeholder */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <svg width="44" height="44" viewBox="0 0 44 44">
              {[
                { pct: 0.35, color: '#3B82F6', offset: 0 },
                { pct: 0.28, color: '#10B981', offset: 0.35 },
                { pct: 0.22, color: '#F59E0B', offset: 0.63 },
                { pct: 0.15, color: '#EF4444', offset: 0.85 },
              ].map((seg, i) => {
                const r = 18; const cx = 22; const cy = 22;
                const a1 = seg.offset * 2 * Math.PI - Math.PI / 2;
                const a2 = (seg.offset + seg.pct) * 2 * Math.PI - Math.PI / 2;
                const x1 = cx + r * Math.cos(a1); const y1 = cy + r * Math.sin(a1);
                const x2 = cx + r * Math.cos(a2); const y2 = cy + r * Math.sin(a2);
                const large = seg.pct > 0.5 ? 1 : 0;
                return (
                  <path
                    key={i}
                    d={`M${cx},${cy} L${x1},${y1} A${r},${r},0,${large},1,${x2},${y2} Z`}
                    fill={seg.color}
                    opacity="0.85"
                  />
                );
              })}
            </svg>
            <div>
              <p className="text-xs text-gray-400 font-medium">Contribution Split</p>
              <p className="text-white text-sm font-bold mt-0.5">4 Members</p>
            </div>
          </div>
          <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-300">94</p>
              <p className="text-xs text-gray-500 font-medium">Fairness Score</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  { icon: Mic, title: 'Voice Activity Tracking', desc: 'Smart microphones capture real-time speech from every member — timestamped and attributed automatically.', gradient: 'from-blue-500 to-cyan-400', glow: 'shadow-blue-500/20' },
  { icon: Camera, title: 'Face Detection', desc: 'Computer vision confirms physical presence and sustained engagement throughout every session.', gradient: 'from-emerald-500 to-teal-400', glow: 'shadow-emerald-500/20' },
  { icon: FileText, title: 'Writing Analysis', desc: 'Upload documents and get instant metrics: word count, vocabulary richness, and contribution score.', gradient: 'from-amber-500 to-orange-400', glow: 'shadow-amber-500/20' },
  { icon: BarChart2, title: 'Fairness Score', desc: 'AI computes a real-time fairness index using statistical deviation across all contribution signals.', gradient: 'from-rose-500 to-pink-400', glow: 'shadow-rose-500/20' },
  { icon: Cpu, title: 'IoT Device Integration', desc: 'One REST endpoint. Works with Arduino, Raspberry Pi, ESP32 — any device that can POST JSON.', gradient: 'from-sky-500 to-blue-400', glow: 'shadow-sky-500/20' },
  { icon: Shield, title: 'Bias-Free Results', desc: 'Data-driven scores remove subjectivity and give every member a verifiable, transparent record.', gradient: 'from-violet-500 to-blue-400', glow: 'shadow-violet-500/20' },
];

const testimonials = [
  { name: 'Dr. Sarah Chen', role: 'CS Professor, MIT', quote: 'ContribuTrack transformed how I grade group projects. The fairness score is indisputable.', avatar: 'SC', grad: 'from-blue-500 to-cyan-400' },
  { name: 'Marcus Rivera', role: 'Engineering Team Lead', quote: 'One person was doing 80% of the work. The data exposed it — and changed everything.', avatar: 'MR', grad: 'from-emerald-500 to-teal-400' },
  { name: 'Aisha Patel', role: 'Graduate Student', quote: 'Finally a system that records my effort accurately. No more unequal credit distribution.', avatar: 'AP', grad: 'from-amber-500 to-orange-400' },
];

const steps = [
  { num: '01', title: 'Register Your Team', desc: 'Add members, assign device IDs, and configure roles in under a minute.', icon: Users },
  { num: '02', title: 'Start a Session', desc: 'Connected devices stream voice and face data to the dashboard in real time.', icon: Play },
  { num: '03', title: 'Upload Documents', desc: 'Drop in written work and get instant contribution scores per member.', icon: FileText },
  { num: '04', title: 'Review & Share', desc: 'Export fairness charts and per-member breakdowns at a glance.', icon: BarChart2 },
];

export default function Landing({ navigate }: Props) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  const [navScrolled, setNavScrolled] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    const handleScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleMouseMove]);

  return (
    <div className="min-h-screen bg-[#060C1A] text-white font-sans overflow-x-hidden">

      {/* ══════ CURSOR GLOW ══════ */}
      <div
        className="fixed top-0 left-0 w-72 h-72 pointer-events-none z-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          transform: `translate(${mousePos.x - 144}px, ${mousePos.y - 144}px)`,
          transition: 'transform 0.15s ease',
        }}
      />

      {/* ══════ NAVBAR ══════ */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${navScrolled ? 'bg-[#060C1A]/95 border-b border-white/8 backdrop-blur-xl shadow-xl shadow-black/30' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/40">
              <Activity size={18} className="text-white" />
            </div>
            <span className="font-black text-white text-lg tracking-tight">ContribuTrack</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Testimonials', '#testimonials']].map(([label, href]) => (
              <a key={label} href={href} className="hover:text-white transition-colors duration-200 relative group">
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gradient-to-r from-blue-400 to-cyan-400 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('login')} className="text-sm text-gray-400 hover:text-white transition-colors font-medium px-3 py-2">
              Sign In
            </button>
            <button
              onClick={() => navigate('login')}
              className="relative text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-200 overflow-hidden group"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </div>
      </nav>

      {/* ══════ HERO ══════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-6 overflow-hidden">
        <ParticleField />

        {/* Background blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-[30%] right-[-15%] w-[600px] h-[600px] rounded-full bg-cyan-500/8 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-emerald-500/6 blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold px-4 py-2 rounded-full mb-8 backdrop-blur-sm animate-pulse-slow">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              AI-Powered Group Contribution Tracker
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-black leading-[1.04] tracking-tight mb-6">
              <span className="text-white">Track</span>{' '}
              <br className="hidden sm:block" />
              <Typewriter words={['Contributions', 'Fairness', 'Effort', 'Progress', 'Impact']} />
              <br />
              <span className="text-white">In Real Time.</span>
            </h1>

            <p className="text-lg text-gray-400 max-w-lg mb-10 leading-relaxed">
              Eliminate unfair credit distribution. ContribuTrack uses voice, face detection, and document analysis to give every team member an objective, verifiable contribution score.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button
                onClick={() => navigate('login')}
                className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-2xl font-bold text-base shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.03] transition-all duration-200 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Tracking Free
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-5 text-sm text-gray-500">
              {[
                { icon: CheckCircle, label: 'No credit card' },
                { icon: Lock, label: 'Secure & private' },
                { icon: Zap, label: 'Setup in 5 min' },
                { icon: Globe, label: 'Works anywhere' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon size={13} className="text-emerald-500" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right — live mock dashboard */}
          <div className="relative hidden lg:block">
            {/* Glow */}
            <div className="absolute -inset-8 bg-gradient-to-r from-blue-600/20 via-cyan-500/15 to-emerald-500/15 rounded-3xl blur-3xl" />
            <div className="relative">
              <MockDashboard />
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/40 flex items-center gap-1.5 animate-bounce">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
              {/* Second floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-[#0D1626] border border-white/10 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <TrendingUp size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">+18% fairness</p>
                  <p className="text-gray-500 text-xs">vs last session</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ STATS BAND ══════ */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/8 via-cyan-600/8 to-emerald-600/8" />
        <div className="absolute inset-0 border-y border-white/5" />
        <div className="relative max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[
            { val: 99, suffix: '%', label: 'Tracking Accuracy', color: 'from-blue-400 to-cyan-400' },
            { val: 3, suffix: 's', label: 'Real-time Latency', color: 'from-cyan-400 to-emerald-400' },
            { val: 6, suffix: '+', label: 'Contribution Signals', color: 'from-emerald-400 to-teal-400' },
            { val: 100, suffix: '%', label: 'Bias Eliminated', color: 'from-amber-400 to-orange-400' },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 80}>
              <p className={`text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r ${s.color}`}>
                <Counter to={s.val} suffix={s.suffix} />
              </p>
              <p className="text-gray-500 text-sm mt-2 font-medium">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-20">
              <span className="text-blue-400 text-sm font-bold uppercase tracking-widest">Features</span>
              <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-4">Everything Your Team Needs</h2>
              <p className="text-gray-400 max-w-xl mx-auto text-lg">A complete contribution intelligence platform — from voice to documents to fairness.</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="group relative bg-white/[0.02] border border-white/6 rounded-2xl p-7 hover:bg-white/[0.05] hover:border-white/15 transition-all duration-300 cursor-default overflow-hidden h-full">
                  {/* Hover glow */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />
                  {/* Top line accent */}
                  <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${f.gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />

                  <div className={`relative w-13 h-13 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${f.gradient} shadow-lg ${f.glow} group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon size={22} className="text-white" />
                  </div>
                  <h3 className="relative font-bold text-white text-base mb-2.5">{f.title}</h3>
                  <p className="relative text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  <div className={`relative mt-5 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1 text-transparent bg-clip-text bg-gradient-to-r ${f.gradient}`}>
                    Learn more <ChevronRight size={12} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section id="how-it-works" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute left-[-15%] top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <Reveal>
            <div className="text-center mb-20">
              <span className="text-cyan-400 text-sm font-bold uppercase tracking-widest">Process</span>
              <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-4">Up and Running in Minutes</h2>
              <p className="text-gray-400 max-w-xl mx-auto text-lg">Four simple steps to turn any group into a trackable, fair team.</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {steps.map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="group relative bg-white/[0.025] border border-white/6 rounded-2xl p-8 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 overflow-hidden h-full">
                  {/* Big ghost number */}
                  <div className="absolute top-0 right-0 text-[130px] font-black text-white/[0.025] leading-none select-none translate-x-6 -translate-y-6 group-hover:text-white/[0.04] transition-colors duration-300">
                    {s.num}
                  </div>
                  <div className="relative flex items-start gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:border-blue-500/40 transition-colors duration-300">
                      <s.icon size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-400/70 mb-2 block">{s.num}</span>
                      <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ TESTIMONIALS ══════ */}
      <section id="testimonials" className="py-32 px-6 relative">
        <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-600/6 blur-[100px] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Testimonials</span>
              <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-4">Loved by Teams Worldwide</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="group relative bg-white/[0.025] border border-white/6 rounded-2xl p-7 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 h-full flex flex-col">
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-1 mb-6">"{t.quote}"</p>
                  <div className="flex items-center gap-3 pt-5 border-t border-white/5">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.grad} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="py-32 px-6">
        <Reveal>
          <div className="max-w-4xl mx-auto text-center relative">
            {/* Multi-layer glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-500/15 to-emerald-600/20 rounded-3xl blur-3xl" />
            <div className="absolute inset-2 bg-gradient-to-r from-blue-600/10 via-transparent to-emerald-600/10 rounded-3xl blur-2xl" />

            <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 rounded-3xl py-20 px-8 overflow-hidden">
              {/* Decorative corner lines */}
              <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-blue-500/20 rounded-tl-3xl" />
              <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-emerald-500/20 rounded-br-3xl" />

              <div className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-bold px-4 py-1.5 rounded-full mb-6">
                <TrendingUp size={12} />
                Join teams improving fairness today
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight">
                Make Group Work
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">
                  Finally Fair.
                </span>
              </h2>
              <p className="text-gray-400 mb-10 text-lg max-w-xl mx-auto">
                Set up ContribuTrack in minutes. No hardware required to start — just sign up and begin tracking.
              </p>
              <button
                onClick={() => navigate('login')}
                className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.03] transition-all duration-200 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started — It's Free
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-200" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              <div className="flex flex-wrap justify-center gap-6 mt-10 text-xs text-gray-500">
                {['No credit card', 'Free forever', 'Open API', 'Real-time data'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-emerald-500" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Activity size={15} className="text-white" />
            </div>
            <span className="font-black text-white tracking-tight">ContribuTrack</span>
          </div>
          <p className="text-gray-600 text-sm">© 2024 ContribuTrack — AI-Powered Group Contribution Tracker</p>
          <div className="flex gap-6 text-sm text-gray-600">
            {['Privacy', 'Terms', 'API Docs'].map((t) => (
              <a key={t} href="#" className="hover:text-gray-300 transition-colors duration-200">{t}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
