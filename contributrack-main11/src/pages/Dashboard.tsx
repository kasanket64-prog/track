import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Users, Clock, FileText, Mic, Camera,
  RefreshCw, Wifi, WifiOff, Activity, Award, Brain,
  ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Timer, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Member, IotData, Session, Document, AiInsight } from '../lib/types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#EC4899'];

/* ─── Animated mini particle canvas ─── */
function MiniParticles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let id: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const pts = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() + 0.4, a: Math.random() * 0.35 + 0.08,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96,165,250,${p.a})`; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 80) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(96,165,250,${0.06 * (1 - d / 80)})`; ctx.lineWidth = 0.5; ctx.stroke(); }
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ─── Animated count-up ─── */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; obs.disconnect();
      const start = Date.now(); const dur = 900;
      const tick = () => {
        const t = Math.min((Date.now() - start) / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        setVal(Math.round(ease * to));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Live pulse dot ─── */
function PulseDot({ color = 'bg-emerald-400' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

/* ─── Glass card ─── */
function GlassCard({ children, className = '', glow }: { children: React.ReactNode; className?: string; glow?: string }) {
  return (
    <div className={`relative bg-white/[0.025] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 ${className}`}>
      {glow && <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none ${glow}`} />}
      {children}
    </div>
  );
}

/* ─── Stat card ─── */
interface StatCardProps {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  sub: string;
  gradient: string;
  glowClass: string;
  iconColor: string;
}
function StatCard({ icon: Icon, label, value, suffix = '', sub, gradient, glowClass, iconColor }: StatCardProps) {
  return (
    <GlassCard glow={glowClass}>
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${gradient} opacity-50`} />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon size={18} className="text-white" />
          </div>
          <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${iconColor}`}>LIVE</div>
        </div>
        <p className="text-3xl font-black text-white leading-none">
          <CountUp to={value} suffix={suffix} />
        </p>
        <p className="text-xs font-semibold text-gray-300 mt-1.5">{label}</p>
        <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>
      </div>
    </GlassCard>
  );
}

/* ─── Donut ring ─── */
function DonutRing({ value, color, size = 56 }: { value: number; color: string; size?: number }) {
  const r = (size - 8) / 2; const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${(value / 100) * circ} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  );
}

/* ─── Fairness Gauge ─── */
function FairnessGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Moderate' : 'Low';
  const r = 50; const cx = 72; const cy = 66;
  const toXY = (deg: number) => ({ x: cx + r * Math.cos((deg * Math.PI) / 180), y: cy + r * Math.sin((deg * Math.PI) / 180) });
  const arc = (from: number, to: number, c: string) => {
    const s = toXY(from); const e = toXY(to);
    return <path d={`M${cx},${cy} L${s.x},${s.y} A${r},${r},0,${to - from > 180 ? 1 : 0},1,${e.x},${e.y} Z`} fill={c} opacity="0.12" />;
  };
  const needle = toXY(180 + (score / 100) * 180);
  return (
    <div className="flex flex-col items-center">
      <svg width={144} height={82} viewBox="0 0 144 82">
        <defs>
          <filter id="ng"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {arc(180, 240, '#EF4444')}{arc(240, 300, '#F59E0B')}{arc(300, 360, '#10B981')}
        {(() => { const s = toXY(180); const e = needle; const pct = score / 100; const large = pct > 0.5 ? 1 : 0; return <path d={`M${cx},${cy} L${s.x},${s.y} A${r},${r},0,${large},1,${e.x},${e.y} Z`} fill={color} opacity="0.2" />; })()}
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={color} strokeWidth={2.5} strokeLinecap="round" filter="url(#ng)" />
        <circle cx={cx} cy={cy} r={4} fill={color} filter="url(#ng)" />
        <text x={cx} y={cy - 12} textAnchor="middle" fontSize={20} fontWeight="900" fill={color}>{score}</text>
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={8} fill="rgba(156,163,175,0.8)">{label}</text>
        <text x={20} y={80} fontSize={7} fill="rgba(156,163,175,0.5)">0</text>
        <text x={118} y={80} fontSize={7} fill="rgba(156,163,175,0.5)">100</text>
      </svg>
    </div>
  );
}

/* ─── Score dial (5-pack) ─── */
function ScoreDial({ value, color, label, sub }: { value: number; color: string; label: string; sub: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3 text-center flex flex-col items-center gap-1.5">
      <div className="relative w-11 h-11">
        <DonutRing value={value} color={color} size={44} />
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black" style={{ color }}>{value}</span>
      </div>
      <p className="text-[11px] font-bold text-gray-200">{label}</p>
      <p className="text-[10px] text-gray-600 leading-tight">{sub}</p>
    </div>
  );
}

/* ─── Mini bar chart (inline SVG, no deps) ─── */
function BarChart({ data, height = 120 }: { data: { label: string; value: number; color: string }[]; height?: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(32, Math.floor(240 / data.length) - 6);
  const totalW = data.length * (barW + 8);
  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(totalW, 200)} height={height + 28} style={{ display: 'block', margin: '0 auto' }}>
        {data.map((d, i) => {
          const bh = Math.max(4, (d.value / max) * height);
          const x = i * (barW + 8) + 4;
          const y = height - bh;
          return (
            <g key={i}>
              <rect x={x} y={height} width={barW} height={0} fill={d.color} opacity="0.1" rx={4} />
              <rect x={x} y={y} width={barW} height={bh} fill={d.color} opacity="0.75" rx={4}
                style={{ filter: `drop-shadow(0 0 6px ${d.color}60)` }} />
              <text x={x + barW / 2} y={height + 16} textAnchor="middle" fontSize={9} fill="rgba(156,163,175,0.7)" fontWeight="600">
                {d.label.slice(0, 5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Pie chart ─── */
function PieChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const cx = size / 2; const cy = size / 2; const r = size / 2 - 10;
  let offset = -Math.PI / 2;
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(offset); const y1 = cy + r * Math.sin(offset);
    offset += angle;
    const x2 = cx + r * Math.cos(offset); const y2 = cy + r * Math.sin(offset);
    const large = angle > Math.PI ? 1 : 0;
    return { path: `M${cx},${cy} L${x1},${y1} A${r},${r},0,${large},1,${x2},${y2} Z`, color: d.color, label: d.label, value: Math.round(d.value) };
  });
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="pie-glow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity="0.85" filter="url(#pie-glow)" className="transition-all duration-700" />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.42} fill="#0D1626" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill="rgba(156,163,175,0.7)" fontWeight="600">Split</text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            {s.label.split(' ')[0]} · {s.value}%
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Line sparkline ─── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1); const w = 240; const h = 60;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 6)}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#sg)" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [iotData, setIotData] = useState<IotData[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    const [mRes, iRes, sRes, dRes] = await Promise.all([
      supabase.from('members').select('*').order('created_at'),
      supabase.from('iot_data').select('*, members(name,email)').order('created_at', { ascending: false }).limit(100),
      supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('documents').select('id, word_count, member_id').order('created_at', { ascending: false }),
    ]);
    if (mRes.data) setMembers(mRes.data);
    if (iRes.data) setIotData(iRes.data);
    if (sRes.data) setSessions(sRes.data);
    if (dRes.data) setDocuments(dRes.data as Document[]);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  const fetchInsights = useCallback(async () => {
    const { data } = await supabase.from('ai_insights').select('*').order('overall_score', { ascending: false });
    if (data) setInsights(data as AiInsight[]);
  }, []);

  // analyzingRef guards against overlapping runs: analyze-contribution loops
  // a Claude call per member sequentially, so it can easily still be running
  // when the next trigger fires. Without this, realtime inserts (one per
  // sensor reading), the 3s live-poll tick, and the 2-minute timer could all
  // kick off concurrent full re-analyses of every member.
  const analyzingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runAnalysis = useCallback(async () => {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    setAnalyzing(true);
    try {
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: sessionData } = await supabase.auth.getSession();
      const userToken = sessionData.session?.access_token;
      if (!userToken) return; // not signed in — nothing to analyze as
      const res = await fetch(`${url}/functions/v1/analyze-contribution`, {
        method: 'GET',
        headers: { 'Apikey': key, 'Authorization': `Bearer ${userToken}` },
      });
      if (res.ok) await fetchInsights();
    } catch { /* silent */ } finally {
      analyzingRef.current = false;
      setAnalyzing(false);
    }
  }, [fetchInsights]);

  // Coalesce bursts of realtime inserts (e.g. several members' devices
  // reporting in the same 30s window) into a single analysis run instead of
  // one full Claude re-analysis per row.
  const scheduleAnalysis = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { runAnalysis(); }, 10_000);
  }, [runAnalysis]);

  useEffect(() => {
    fetchAll().then(() => { fetchInsights(); runAnalysis(); });
    const ch = supabase.channel('db-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'iot_data' }, () => { fetchAll(); scheduleAnalysis(); })
      .subscribe();
    const di = setInterval(() => { if (live) fetchAll(); }, 3000);
    const ai = setInterval(() => runAnalysis(), 120_000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(di);
      clearInterval(ai);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchAll, fetchInsights, runAnalysis, scheduleAnalysis, live]);

  /* ── Derived data ── */
  const insightMap = Object.fromEntries(insights.map(ins => [ins.member_id, ins]));

  const memberStats = members.map((m, i) => {
    const ins = insightMap[m.id];
    const reads = iotData.filter(d => d.member_id === m.id);
    const iotAvg = reads.length ? Math.round(reads.reduce((s, d) => s + d.contribution_pct, 0) / reads.length) : 0;
    return {
      member: m, color: COLORS[i % COLORS.length], insight: ins ?? null,
      overallScore: ins?.overall_score ?? 0,
      contributionPct: ins?.contribution_pct ?? iotAvg,
      engagementLevel: ins?.engagement_level ?? null,
      voiceScore: ins?.voice_score ?? 0,
      presenceScore: ins?.presence_score ?? 0,
      writingScore: ins?.writing_score ?? 0,
      consistencyScore: ins?.consistency_score ?? 0,
      activeMinutes: ins?.active_time_minutes ?? 0,
      sessionMinutes: ins?.session_duration_minutes ?? 0,
      readingCount: ins?.reading_count ?? reads.length,
      wordCount: ins?.word_count ?? 0,
      docCount: ins?.doc_count ?? documents.filter(d => d.member_id === m.id).length,
    };
  });

  const fairScores = memberStats.filter(m => m.readingCount > 0).map(m => m.contributionPct);
  const fairnessScore = (() => {
    if (fairScores.length < 2) return 100;
    const avg = fairScores.reduce((a, b) => a + b, 0) / fairScores.length;
    const variance = fairScores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / fairScores.length;
    return Math.max(0, Math.round(100 - Math.sqrt(variance) * 0.8));
  })();

  const totalReadings = iotData.length;
  const docCount = documents.length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const totalActiveMinutes = memberStats.reduce((s, m) => s + m.activeMinutes, 0);

  const pieData = memberStats.filter(m => m.contributionPct > 0)
    .map(m => ({ label: m.member.name, value: m.contributionPct, color: m.color }));

  const voiceSparkline = [...iotData].reverse().slice(-20).map(d => d.voice);

  const writingData = memberStats.filter(m => m.wordCount > 0)
    .map(m => ({ label: m.member.name.split(' ')[0], value: m.wordCount, color: m.color })).slice(0, 6);

  const activeData = memberStats.filter(m => m.activeMinutes > 0)
    .map(m => ({ label: m.member.name.split(' ')[0], value: m.activeMinutes, color: m.color })).slice(0, 6);

  const latestByMember: Record<string, IotData> = {};
  for (const d of iotData) { if (d.member_id && !latestByMember[d.member_id]) latestByMember[d.member_id] = d; }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full border border-cyan-500/30 animate-pulse" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 space-y-5 min-h-full overflow-hidden">
      {/* Background glow blobs */}
      <div className="fixed top-0 left-64 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/4 blur-[120px] pointer-events-none" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <PulseDot />
          <span className="text-xs text-gray-500 font-medium">Updated {lastUpdate.toLocaleTimeString()}</span>
          {analyzing && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg font-semibold">
              <RefreshCw size={11} className="animate-spin" /> Updating…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive(p => !p)}
            className={`flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-xl border font-semibold transition-all duration-200 ${
              live ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-gray-500 border-white/8'
            }`}
          >
            {live ? <Wifi size={12} /> : <WifiOff size={12} />}
            {live ? 'Live' : 'Paused'}
          </button>
          <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl border border-white/8 text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all font-medium">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Team Members" value={members.length} sub="Registered & tracked"
          gradient="from-blue-500 to-cyan-500" glowClass="bg-blue-500" iconColor="text-blue-400 bg-blue-500/10 border-blue-500/20" />
        <StatCard icon={Clock} label="Active Sessions" value={activeSessions} sub={`${sessions.length} total sessions`}
          gradient="from-emerald-500 to-teal-500" glowClass="bg-emerald-500" iconColor="text-emerald-400 bg-emerald-500/10 border-emerald-500/20" />
        <StatCard icon={Timer} label="Active Time" value={totalActiveMinutes} suffix="m" sub="Combined participation"
          gradient="from-amber-500 to-orange-500" glowClass="bg-amber-500" iconColor="text-amber-400 bg-amber-500/10 border-amber-500/20" />
        <StatCard icon={FileText} label="Documents" value={docCount} sub="Written contributions"
          gradient="from-rose-500 to-pink-500" glowClass="bg-rose-500" iconColor="text-rose-400 bg-rose-500/10 border-rose-500/20" />
      </div>

      {/* ── Row 1: Pie + Voice Sparkline + Fairness ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Contribution Share */}
        <GlassCard>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Contribution Share</h3>
                <p className="text-xs text-gray-500 mt-0.5">Each member's participation %</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <TrendingUp size={15} className="text-white" />
              </div>
            </div>
            {pieData.length > 0 ? (
              <PieChart data={pieData} size={140} />
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-600">
                <TrendingUp size={24} className="mb-2 opacity-30" />
                <p className="text-xs">{analyzing ? 'Calculating…' : 'No data yet'}</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Voice Activity */}
        <GlassCard>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Voice Activity</h3>
                <p className="text-xs text-gray-500 mt-0.5">Last 20 sensor readings</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Mic size={15} className="text-white" />
              </div>
            </div>
            <Sparkline data={voiceSparkline} color="#06B6D4" />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-600">{totalReadings} total readings</span>
              <span className="text-xs font-bold text-cyan-400">{voiceSparkline.filter(v => v === 1).length} active</span>
            </div>
          </div>
        </GlassCard>

        {/* Fairness */}
        <GlassCard>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-white text-sm">Fairness Score</h3>
                <p className="text-xs text-gray-500 mt-0.5">Participation balance</p>
              </div>
              <Award size={16} className="text-amber-400" />
            </div>
            <FairnessGauge score={fairnessScore} />
            <div className="mt-3 space-y-2">
              {memberStats.filter(m => m.readingCount > 0).slice(0, 3).map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="text-[11px] text-gray-500 flex-1 truncate">{m.member.name}</span>
                  <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.contributionPct}%`, backgroundColor: m.color }} />
                  </div>
                  <span className="text-[11px] font-bold w-7 text-right" style={{ color: m.color }}>{m.contributionPct}%</span>
                </div>
              ))}
              {memberStats.filter(m => m.readingCount > 0).length === 0 && (
                <p className="text-xs text-gray-600 text-center py-2">{analyzing ? 'Calculating…' : 'No data yet'}</p>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Row 2: Member Presence + Writing + Active Time ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Member Presence */}
        <GlassCard>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Member Presence</h3>
                <p className="text-xs text-gray-500 mt-0.5">Live attendance & score</p>
              </div>
              <Camera size={16} className="text-gray-500" />
            </div>
            {memberStats.length > 0 ? (
              <div className="space-y-2.5">
                {memberStats.map((ms, i) => {
                  const latest = latestByMember[ms.member.id];
                  const present = latest ? latest.face === 1 : false;
                  const voice = latest ? latest.voice === 1 : false;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: ms.color }}>
                          {ms.member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0D1626] ${present ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-gray-200 truncate">{ms.member.name}</p>
                          {voice && present && <Mic size={9} className="text-blue-400 flex-shrink-0" />}
                        </div>
                        <p className={`text-[10px] ${present ? 'text-emerald-500' : 'text-gray-600'}`}>
                          {latest ? (present ? 'Present' : 'Absent') : 'No data'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-14 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ms.contributionPct}%`, backgroundColor: ms.color, boxShadow: `0 0 6px ${ms.color}60` }} />
                        </div>
                        <span className="text-[11px] font-black w-7 text-right" style={{ color: ms.color }}>{ms.contributionPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-gray-600">
                <Users size={20} className="mb-2 opacity-30" /><p className="text-xs">No members yet</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Writing */}
        <GlassCard>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Document Writing</h3>
                <p className="text-xs text-gray-500 mt-0.5">Words per member</p>
              </div>
              <FileText size={16} className="text-gray-500" />
            </div>
            {writingData.length > 0 ? <BarChart data={writingData} height={110} /> : (
              <div className="flex flex-col items-center justify-center h-28 text-gray-600">
                <FileText size={20} className="mb-2 opacity-30" />
                <p className="text-xs">{analyzing ? 'Calculating…' : 'No documents yet'}</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Active Time */}
        <GlassCard>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-rose-500/0 via-rose-500/50 to-rose-500/0" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Active Time</h3>
                <p className="text-xs text-gray-500 mt-0.5">Engaged minutes per member</p>
              </div>
              <Timer size={16} className="text-gray-500" />
            </div>
            {activeData.length > 0 ? <BarChart data={activeData} height={110} /> : (
              <div className="flex flex-col items-center justify-center h-28 text-gray-600">
                <Timer size={20} className="mb-2 opacity-30" />
                <p className="text-xs">{analyzing ? 'Calculating…' : 'No time data yet'}</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── Member Contribution Table ── */}
      <GlassCard>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-cyan-500/40 to-blue-500/0" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-white text-sm">Member Contribution Overview</h3>
              <p className="text-xs text-gray-500 mt-0.5">Voice · Presence · Writing · Active Time — all in one view</p>
            </div>
            <div className="flex items-center gap-2">
              <PulseDot />
              <span className="text-xs text-gray-500">{totalReadings} readings</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {['Member', 'Contribution', 'Voice', 'Presence', 'Writing', 'Active Time', 'Score', 'Level'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memberStats.map((ms) => {
                  const ec = ms.engagementLevel === 'HIGH' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                    ms.engagementLevel === 'MEDIUM' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                    'text-gray-500 bg-white/5 border-white/8';
                  return (
                    <tr key={ms.member.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: ms.color, boxShadow: `0 0 8px ${ms.color}40` }}>
                            {ms.member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-200">{ms.member.name}</p>
                            <p className="text-[10px] text-gray-600">{ms.member.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${ms.contributionPct}%`, backgroundColor: ms.color, boxShadow: `0 0 6px ${ms.color}60` }} />
                          </div>
                          <span className="font-black text-gray-200">{ms.contributionPct}%</span>
                        </div>
                      </td>
                      {[
                        { value: ms.voiceScore, color: '#3B82F6' },
                        { value: ms.presenceScore, color: '#10B981' },
                        { value: ms.writingScore, color: '#F59E0B' },
                      ].map(({ value, color }, ci) => (
                        <td key={ci} className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-gray-400 font-semibold">{value}</span>
                          </div>
                        </td>
                      ))}
                      <td className="py-3 px-3 text-gray-400 font-semibold">
                        {ms.activeMinutes > 0 ? `${ms.activeMinutes}m` : '—'}
                        {ms.sessionMinutes > 0 && <span className="text-gray-600"> / {ms.sessionMinutes}m</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-lg font-black" style={{ color: ms.color, textShadow: `0 0 12px ${ms.color}60` }}>{ms.overallScore}</span>
                        <span className="text-gray-700 text-[10px]">/100</span>
                      </td>
                      <td className="py-3 px-3">
                        {ms.engagementLevel ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ec}`}>{ms.engagementLevel}</span>
                        ) : (
                          <span className="text-gray-700 text-[10px]">{analyzing ? '…' : '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {memberStats.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-600">
                    <Activity size={24} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No members yet</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GlassCard>

      {/* ── Live IoT Feed ── */}
      <GlassCard>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-white text-sm">Live Sensor Feed</h3>
              <p className="text-xs text-gray-500 mt-0.5">Raw voice &amp; presence readings per person</p>
            </div>
            <div className="flex items-center gap-2"><PulseDot /><span className="text-xs text-gray-500">{totalReadings} total</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {['Time', 'Member', 'Present', 'Voice', 'Level'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {iotData.slice(0, 8).map((d, idx) => {
                  const mi = members.findIndex(m => m.id === d.member_id);
                  const color = mi >= 0 ? COLORS[mi % COLORS.length] : '#6B7280';
                  const lc = d.contribution_level === 'HIGH' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                    d.contribution_level === 'MEDIUM' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                    'text-gray-500 bg-white/5 border-white/8';
                  return (
                    <tr key={d.id} className={`border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors ${idx === 0 ? 'bg-blue-500/[0.04]' : ''}`}>
                      <td className="py-3 px-3 text-gray-600 font-mono text-[11px]">{new Date(d.created_at).toLocaleTimeString()}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}>
                            {d.members?.name ? d.members.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="text-gray-300 font-semibold">{d.members?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${d.face ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-gray-600 bg-white/5 border-white/8'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${d.face ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                          {d.face ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${d.voice ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-gray-600 bg-white/5 border-white/8'}`}>
                          <Mic size={9} />{d.voice ? 'Active' : 'Silent'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${lc}`}>{d.contribution_level}</span>
                      </td>
                    </tr>
                  );
                })}
                {iotData.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-600">
                    <Activity size={24} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No sensor data yet</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GlassCard>

      {/* ── Contribution Insights ── */}
      <GlassCard>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/50 via-cyan-500/50 to-blue-500/0" />
        <MiniParticles />
        <div className="relative p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Brain size={17} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Contribution Insights</h3>
                <p className="text-xs text-gray-500 mt-0.5">Voice · Presence · Time · Documents — full breakdown per member</p>
              </div>
            </div>
            {analyzing && (
              <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl font-semibold">
                <RefreshCw size={12} className="animate-spin" /> Updating…
              </div>
            )}
          </div>

          {insights.length === 0 && analyzing && (
            <div className="flex flex-col items-center justify-center py-14 text-gray-600">
              <div className="relative w-10 h-10 mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              </div>
              <p className="text-sm font-medium text-gray-400">Calculating contribution scores…</p>
              <p className="text-xs mt-1 max-w-xs text-center">Processing voice, presence, time and documents for each member</p>
            </div>
          )}

          {insights.length === 0 && !analyzing && (
            <div className="flex flex-col items-center justify-center py-14 text-gray-600">
              <Brain size={32} className="mb-3 opacity-15" />
              <p className="text-sm font-medium text-gray-500">No data to score yet</p>
              <p className="text-xs mt-1 max-w-xs text-center">Add members and send IoT readings — scores update automatically.</p>
            </div>
          )}

          {insights.length > 0 && (
            <div className="space-y-3">
              {insights.map((ins, i) => {
                const ms = memberStats.find(m => m.member.id === ins.member_id);
                const color = ms?.color ?? '#6B7280';
                const name = ms?.member.name ?? 'Unknown';
                const isOpen = expandedInsight === ins.member_id;
                const ec = ins.engagement_level === 'HIGH' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  ins.engagement_level === 'MEDIUM' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                  'text-red-400 bg-red-500/10 border-red-500/20';

                return (
                  <div key={ins.member_id} className="border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-300">
                    <button
                      onClick={() => setExpandedInsight(isOpen ? null : ins.member_id)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors text-left"
                    >
                      <span className="text-xs font-black text-gray-700 w-4 flex-shrink-0">#{i + 1}</span>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}40` }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-100 text-sm">{name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ec}`}>{ins.engagement_level}</span>
                        </div>
                        <p className="text-xs text-gray-600 truncate mt-0.5">{ins.narrative.slice(0, 90)}…</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-center">
                          <p className="text-xl font-black" style={{ color, textShadow: `0 0 16px ${color}50` }}>{ins.overall_score}</p>
                          <p className="text-[9px] text-gray-600 -mt-0.5">/ 100</p>
                        </div>
                        <div className="hidden sm:flex flex-col gap-1 w-24">
                          {[
                            { label: 'Voice', value: ins.voice_score, color: '#3B82F6' },
                            { label: 'Presence', value: ins.presence_score, color: '#10B981' },
                            { label: 'Writing', value: ins.writing_score, color: '#F59E0B' },
                          ].map(s => (
                            <div key={s.label} className="flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-600 w-10 flex-shrink-0">{s.label}</span>
                              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${s.value}%`, backgroundColor: s.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        {isOpen ? <ChevronUp size={15} className="text-gray-600" /> : <ChevronDown size={15} className="text-gray-600" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-5 border-t border-white/5 bg-white/[0.015]">
                        <div className="mt-4 bg-white/[0.03] border border-white/8 rounded-xl p-4 text-sm text-gray-300 leading-relaxed">
                          {ins.narrative}
                        </div>

                        {/* 5 score dials */}
                        <div className="grid grid-cols-5 gap-3 mt-4">
                          <ScoreDial value={ins.voice_score} color="#3B82F6" label="Voice" sub={`${ins.reading_count} readings`} />
                          <ScoreDial value={ins.presence_score} color="#10B981" label="Presence" sub="Face detection" />
                          <ScoreDial value={ins.writing_score} color="#F59E0B" label="Writing" sub={`${ins.word_count.toLocaleString()} words`} />
                          <ScoreDial value={ins.consistency_score} color="#06B6D4" label="Consistency" sub="Stability" />
                          <ScoreDial value={Math.round(ins.session_duration_minutes > 0 ? (ins.active_time_minutes / ins.session_duration_minutes) * 100 : 0)}
                            color="#F97316" label="Active %" sub={`${ins.active_time_minutes}m / ${ins.session_duration_minutes}m`} />
                        </div>

                        {/* Time stat row */}
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          {[
                            { label: 'Session Duration', value: `${ins.session_duration_minutes}m`, icon: Clock },
                            { label: 'Active Time', value: `${ins.active_time_minutes}m`, icon: Timer },
                            { label: 'Documents', value: `${ins.doc_count ?? 0} files · ${ins.word_count.toLocaleString()} words`, icon: FileText },
                          ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="bg-white/[0.03] border border-white/8 rounded-xl p-3 flex items-center gap-2.5">
                              <Icon size={14} className="text-gray-600 flex-shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-600">{label}</p>
                                <p className="text-xs font-bold text-gray-200">{value}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl p-4">
                            <p className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1">
                              <CheckCircle size={12} /> Strengths
                            </p>
                            <ul className="space-y-1.5">
                              {(ins.strengths as string[]).map((s, j) => (
                                <li key={j} className="text-xs text-gray-400 flex items-start gap-1.5">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-4">
                            <p className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
                              <AlertTriangle size={12} /> To Improve
                            </p>
                            <ul className="space-y-1.5">
                              {(ins.improvements as string[]).map((s, j) => (
                                <li key={j} className="text-xs text-gray-400 flex items-start gap-1.5">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-700 mt-3 text-right">Last scored: {new Date(ins.created_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
