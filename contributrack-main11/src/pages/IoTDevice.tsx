import { useState, useEffect } from 'react';
import {
  Send, Cpu, CheckCircle, AlertCircle, Loader, Copy, RefreshCw,
  Mic, Eye, MessageSquare, TrendingUp, TrendingDown, Minus,
  Zap, AlertTriangle, XCircle, Tag, ChevronDown, ChevronUp,
  Moon, Smartphone, EyeOff, Activity, Laptop
} from 'lucide-react';
import { supabase, IOT_FUNCTION_URL } from '../lib/supabase';
import type { Member, Session } from '../lib/types';

type FaceExpression = 'ENGAGED' | 'FOCUSED' | 'DISTRACTED' | 'DROWSY' | 'NEUTRAL' | 'ABSENT';

interface VoiceAnalysis {
  voice_quality: 'PRODUCTIVE' | 'NEUTRAL' | 'OFF_TOPIC' | 'DISRUPTIVE';
  voice_quality_score: number;
  voice_sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  detected_language: string;
  voice_topics: string[];
  voice_flags: string[];
  voice_summary: string;
}

interface TestResult {
  success: boolean;
  contribution_level?: string;
  contribution_pct?: number;
  engagement_score?: number;
  is_actively_engaged?: boolean;
  passive_presence?: boolean;
  face_expression?: FaceExpression;
  voice_analysis?: VoiceAnalysis | null;
  transcript?: string;
  error?: string;
  ts: string;
}

// ── Meta definitions ───────────────────────────────────────────────────────

const EXPR_META: Record<FaceExpression, {
  label: string; desc: string; color: string; bg: string; border: string;
  activeColor: string; activeBg: string; icon: React.ElementType;
}> = {
  ENGAGED:    { label: 'Engaged',    desc: 'Alert, eye contact, attentive',      color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', activeColor: 'text-emerald-100', activeBg: 'bg-emerald-500/25', icon: Activity },
  FOCUSED:    { label: 'Focused',    desc: 'Working on laptop, head down',        color: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    activeColor: 'text-cyan-100',    activeBg: 'bg-cyan-500/25',    icon: Laptop },
  NEUTRAL:    { label: 'Neutral',    desc: 'Face present, no strong signal',      color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    activeColor: 'text-blue-100',    activeBg: 'bg-blue-500/25',    icon: Eye },
  DISTRACTED: { label: 'Distracted', desc: 'Looking away or on phone',            color: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   activeColor: 'text-amber-100',   activeBg: 'bg-amber-500/25',   icon: Smartphone },
  DROWSY:     { label: 'Drowsy',     desc: 'Eyes drooping, half-asleep',          color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  activeColor: 'text-orange-100',  activeBg: 'bg-orange-500/25',  icon: Moon },
  ABSENT:     { label: 'Absent',     desc: 'Not visible in frame',                color: 'text-gray-400',    bg: 'bg-gray-500/10',    border: 'border-gray-500/30',    activeColor: 'text-gray-200',    activeBg: 'bg-gray-500/25',    icon: EyeOff },
};

const QUALITY_META = {
  PRODUCTIVE: { label: 'Productive', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Zap },
  NEUTRAL:    { label: 'Neutral',    color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       icon: Minus },
  OFF_TOPIC:  { label: 'Off-Topic',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     icon: AlertTriangle },
  DISRUPTIVE: { label: 'Disruptive', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         icon: XCircle },
} as const;

const SENTIMENT_META = {
  POSITIVE: { label: 'Positive', color: 'text-emerald-400', icon: TrendingUp },
  NEUTRAL:  { label: 'Neutral',  color: 'text-gray-400',    icon: Minus },
  NEGATIVE: { label: 'Negative', color: 'text-red-400',     icon: TrendingDown },
} as const;

const LEVEL_COLORS: Record<string, string> = {
  HIGH:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  LOW:    'bg-red-500/10 text-red-400 border-red-500/20',
};

// ── Sub-components ────────────────────────────────────────────────────────

function EngagementRing({ score, isActive }: { score: number; isActive: boolean }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-bold text-white leading-none">{score}</span>
        {isActive
          ? <span className="text-[8px] text-emerald-400 font-semibold">ACTIVE</span>
          : <span className="text-[8px] text-gray-600 font-semibold">PASSIVE</span>}
      </div>
    </div>
  );
}

function VoiceAnalysisCard({ analysis, transcript }: { analysis: VoiceAnalysis; transcript: string }) {
  const qm = QUALITY_META[analysis.voice_quality];
  const sm = SENTIMENT_META[analysis.voice_sentiment];
  const QIcon = qm.icon;
  const SIcon = sm.icon;
  const [expanded, setExpanded] = useState(false);
  const circ2 = 2 * Math.PI * 14;
  const dash2 = (analysis.voice_quality_score / 100) * circ2;

  return (
    <div className={`rounded-xl border p-3.5 space-y-2.5 ${qm.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QIcon size={13} className={qm.color} />
          <span className={`text-xs font-bold ${qm.color}`}>{qm.label}</span>
          {analysis.detected_language && analysis.detected_language !== 'en' && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/8 text-gray-400 border border-white/10 uppercase">
              {analysis.detected_language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SIcon size={11} className={sm.color} />
          <span className={`text-[10px] font-semibold ${sm.color}`}>{sm.label}</span>
          <span className="text-xs font-mono font-bold text-white">{analysis.voice_quality_score}/100</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${analysis.voice_quality_score}%` }} />
        </div>
      </div>

      {analysis.voice_summary && (
        <p className="text-[11px] text-gray-300 leading-relaxed">{analysis.voice_summary}</p>
      )}

      {analysis.voice_topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {analysis.voice_topics.map((t, i) => (
            <span key={i} className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/8 text-gray-400 px-1.5 py-0.5 rounded-full">
              <Tag size={8} />{t}
            </span>
          ))}
        </div>
      )}

      {analysis.voice_flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {analysis.voice_flags.map((f, i) => (
            <span key={i} className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-semibold">
              {f}
            </span>
          ))}
        </div>
      )}

      <button onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
        {expanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
        {expanded ? 'Hide transcript' : 'Show transcript'}
      </button>
      {expanded && (
        <p className="text-[11px] text-gray-500 italic border-t border-white/5 pt-2 leading-relaxed">
          "{transcript}"
        </p>
      )}
    </div>
  );
}

function ExpressionPicker({ value, onChange }: { value: FaceExpression; onChange: (v: FaceExpression) => void }) {
  const expressions: FaceExpression[] = ['ENGAGED', 'FOCUSED', 'NEUTRAL', 'DISTRACTED', 'DROWSY', 'ABSENT'];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
      {expressions.map((expr) => {
        const m = EXPR_META[expr];
        const Icon = m.icon;
        const active = value === expr;
        return (
          <button key={expr} onClick={() => onChange(expr)}
            className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all ${
              active ? `${m.activeBg} border-current ${m.activeColor}` : `bg-white/[0.02] border-white/8 ${m.color} hover:border-white/20`
            }`}>
            <Icon size={15} />
            <span className="text-[9px] font-bold leading-none">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function IoTDevice() {
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [deviceId, setDeviceId] = useState('device_1');
  const [voice, setVoice] = useState(1);
  const [face, setFace] = useState(1);
  const [faceExpression, setFaceExpression] = useState<FaceExpression>('ENGAGED');
  const [sessionId, setSessionId] = useState('');
  const [transcript, setTranscript] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('members').select('*').order('name'),
      supabase.from('sessions').select('*').eq('status', 'active').order('created_at', { ascending: false }),
    ]).then(([mRes, sRes]) => {
      if (mRes.data) setMembers(mRes.data);
      if (sRes.data) setSessions(sRes.data);
    });
  }, []);

  // Auto-set face=0 when ABSENT selected
  const handleExpressionChange = (expr: FaceExpression) => {
    setFaceExpression(expr);
    if (expr === 'ABSENT') setFace(0);
    else setFace(1);
  };

  const selectedMember = members.find((m) => m.device_id === deviceId);
  const deviceSecret = selectedMember?.device_secret ?? '';

  const handleSend = async () => {
    setSending(true);
    try {
      const body: Record<string, unknown> = { device_id: deviceId, device_secret: deviceSecret, voice, face, face_expression: faceExpression };
      if (sessionId) body.session = sessionId;
      if (transcript.trim() && voice === 1) body.transcript = transcript.trim();

      const res = await fetch(IOT_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResults((r) => [{
        success: res.ok,
        contribution_level: data.contribution_level,
        contribution_pct: data.contribution_pct,
        engagement_score: data.engagement_score,
        is_actively_engaged: data.is_actively_engaged,
        passive_presence: data.passive_presence,
        face_expression: faceExpression,
        voice_analysis: data.voice_analysis ?? null,
        transcript: transcript.trim() || undefined,
        error: data.error,
        ts: new Date().toLocaleTimeString(),
      }, ...r.slice(0, 14)]);
    } catch (err) {
      setResults((r) => [{ success: false, error: String(err), ts: new Date().toLocaleTimeString() }, ...r.slice(0, 14)]);
    } finally {
      setSending(false);
    }
  };

  const curlBody = JSON.stringify({
    device_id: deviceId, device_secret: deviceSecret || '<paired member device secret>', voice, face, face_expression: faceExpression,
    ...(sessionId ? { session: sessionId } : {}),
    ...(transcript.trim() && voice === 1 ? { transcript: transcript.trim() } : {}),
  }, null, 2);

  const curlCommand = `curl -X POST "${IOT_FUNCTION_URL}" \\\n  -H "Content-Type: application/json" \\\n  -H "Apikey: ${import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 20)}..." \\\n  -d '${JSON.stringify({ device_id: deviceId, device_secret: deviceSecret || '<paired member device secret>', voice, face, face_expression: faceExpression, ...(sessionId ? { session: sessionId } : {}), ...(transcript.trim() && voice === 1 ? { transcript: transcript.trim() } : {}) })}'`;

  const handleCopy = () => { navigator.clipboard.writeText(curlCommand); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const exprM = EXPR_META[faceExpression];
  const ExprIcon = exprM.icon;

  const isDrowsyWarning = faceExpression === 'DROWSY';
  const isDistractedWarning = faceExpression === 'DISTRACTED';

  return (
    <div className="min-h-screen bg-[#070E1A] p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">IoT Device Simulator</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Simulate camera + microphone readings — face expression drives true engagement scoring
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Simulator ── */}
        <div className="space-y-4">
          <div className="bg-[#0D1626] border border-white/8 rounded-2xl p-6 space-y-5">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Cpu size={15} className="text-blue-400" /> Send IoT Reading
            </h3>

            {/* Device ID */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Device ID</label>
              <div className="flex gap-2">
                <input value={deviceId} onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="device_1"
                  className="flex-1 px-3 py-2.5 text-sm bg-black/30 border border-white/8 rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 font-mono" />
                {members.filter(m => m.device_id).length > 0 && (
                  <select onChange={(e) => { if (e.target.value) setDeviceId(e.target.value); }}
                    className="px-3 py-2.5 text-sm bg-black/30 border border-white/8 rounded-xl text-gray-300 focus:outline-none focus:border-blue-500/50">
                    <option value="">Pick member</option>
                    {members.filter(m => m.device_id).map((m) => (
                      <option key={m.id} value={m.device_id!}>{m.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Voice toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                <Mic size={11} className="text-blue-400" /> Microphone Signal
              </label>
              <div className="flex gap-2">
                {[0, 1].map((v) => (
                  <button key={v} onClick={() => setVoice(v)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      voice === v ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'border-white/8 text-gray-600 hover:border-white/20 hover:text-gray-400'
                    }`}>
                    {v === 1 ? 'Voice ON' : 'Voice OFF'}
                  </button>
                ))}
              </div>
            </div>

            {/* Face Expression — the key new control */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                <Eye size={11} className="text-emerald-400" /> Camera — Face Expression
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${exprM.bg} ${exprM.border} ${exprM.color}`}>
                  {exprM.label}
                </span>
              </label>
              <ExpressionPicker value={faceExpression} onChange={handleExpressionChange} />

              {/* Warnings */}
              {faceExpression === 'FOCUSED' && (
                <div className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                  <Laptop size={12} className="text-cyan-400 flex-shrink-0" />
                  <p className="text-[11px] text-cyan-300">
                    <span className="font-bold">Focused on laptop</span> — this is a positive state. Score 60–80. Use when the device is in the center of a group and members are working heads-down.
                  </p>
                </div>
              )}
              {isDrowsyWarning && (
                <div className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <Moon size={12} className="text-orange-400 flex-shrink-0" />
                  <p className="text-[11px] text-orange-300">
                    <span className="font-bold">Drowsy detected</span> — engagement score will be very low (5–15). Face detected but sleeping = passive presence only.
                  </p>
                </div>
              )}
              {isDistractedWarning && (
                <div className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Smartphone size={12} className="text-amber-400 flex-shrink-0" />
                  <p className="text-[11px] text-amber-300">
                    <span className="font-bold">Distracted detected</span> — partial credit only. Engagement score will be 20–30 range.
                  </p>
                </div>
              )}
            </div>

            {/* Session */}
            {sessions.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Link to Session (optional)</label>
                <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-black/30 border border-white/8 rounded-xl text-gray-300 focus:outline-none focus:border-blue-500/50">
                  <option value="">No session</option>
                  {sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            )}

            {/* Transcript */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                <MessageSquare size={11} className="text-amber-400" />
                Voice Transcript
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${
                  voice === 1 ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-white/5 text-gray-600 border-white/8'
                }`}>
                  {voice === 1 ? 'any language — Claude analyses' : 'voice must be ON'}
                </span>
              </label>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
                placeholder={voice === 1 ? 'Paste what was said in any language…' : 'Turn voice ON to enable transcript analysis'}
                disabled={voice === 0} rows={3}
                className="w-full px-3 py-2.5 text-sm bg-black/30 border border-white/8 rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/40 resize-none disabled:opacity-30 disabled:cursor-not-allowed" />
            </div>

            {/* Send */}
            <button onClick={handleSend} disabled={sending || !deviceId.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all font-semibold text-sm disabled:opacity-50 shadow-lg shadow-blue-500/10">
              {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? (transcript.trim() && voice === 1 ? 'Analysing with Claude…' : 'Sending…') : 'Send to IoT Endpoint'}
            </button>
          </div>

          {/* Bulk simulate */}
          <div className="bg-[#0D1626] border border-white/8 rounded-2xl p-5">
            <h3 className="font-semibold text-white text-sm mb-1">Bulk Simulate</h3>
            <p className="text-xs text-gray-600 mb-3">Random expressions + voice for all members with device IDs</p>
            <button
              onClick={async () => {
                const EXPRS: FaceExpression[] = ['ENGAGED', 'FOCUSED', 'FOCUSED', 'NEUTRAL', 'DISTRACTED', 'DROWSY'];
                const devMembers = members.filter((m) => m.device_id);
                for (const m of devMembers) {
                  const v = Math.random() > 0.3 ? 1 : 0;
                  const expr = EXPRS[Math.floor(Math.random() * EXPRS.length)];
                  const f = expr === 'ABSENT' ? 0 : 1;
                  await fetch(IOT_FUNCTION_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
                    body: JSON.stringify({ device_id: m.device_id, device_secret: m.device_secret, voice: v, face: f, face_expression: expr }),
                  });
                }
                setResults((r) => [{ success: true, contribution_level: 'BULK', ts: new Date().toLocaleTimeString() }, ...r.slice(0, 14)]);
              }}
              disabled={members.filter((m) => m.device_id).length === 0}
              className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/8 text-gray-300 py-2.5 rounded-xl hover:bg-white/8 transition-all font-medium text-sm disabled:opacity-40">
              <RefreshCw size={14} />
              Simulate All ({members.filter((m) => m.device_id).length} devices)
            </button>
          </div>
        </div>

        {/* ── RIGHT: Results + reference ── */}
        <div className="space-y-4">
          {/* Response log */}
          <div className="bg-[#0D1626] border border-white/8 rounded-2xl p-5">
            <h3 className="font-semibold text-white text-sm mb-4">Response Log</h3>
            {results.length === 0 ? (
              <div className="text-center py-10 text-gray-700">
                <Send size={22} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Send a reading to see results</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {results.map((r, i) => {
                  const exprInfo = r.face_expression ? EXPR_META[r.face_expression] : null;
                  const EIcon = exprInfo?.icon;
                  return (
                    <div key={i} className={`rounded-xl border p-3.5 space-y-3 ${
                      r.success ? 'bg-white/[0.02] border-white/8' : 'bg-red-500/5 border-red-500/15'
                    }`}>
                      {/* Top row */}
                      <div className="flex items-center gap-3">
                        {r.success
                          ? <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                          : <AlertCircle size={13} className="text-red-400 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          {r.success ? (
                            <p className="text-xs font-semibold text-gray-200">
                              {r.contribution_level === 'BULK' ? 'Bulk simulation complete' : `${r.contribution_level} — ${r.contribution_pct}% contribution`}
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-red-400 truncate">{r.error}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-600 flex-shrink-0">{r.ts}</span>
                      </div>

                      {/* Engagement breakdown */}
                      {r.success && r.engagement_score !== undefined && r.contribution_level !== 'BULK' && (
                        <div className="flex items-center gap-3">
                          <EngagementRing score={r.engagement_score} isActive={r.is_actively_engaged ?? false} />
                          <div className="flex-1 space-y-1.5">
                            {/* Expression badge */}
                            {exprInfo && EIcon && (
                              <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${exprInfo.bg} ${exprInfo.border} ${exprInfo.color}`}>
                                <EIcon size={11} />
                                {exprInfo.label}
                                <span className="font-normal text-[10px] opacity-70">— {exprInfo.desc}</span>
                              </div>
                            )}
                            {/* Status pills */}
                            <div className="flex flex-wrap gap-1.5">
                              {r.is_actively_engaged ? (
                                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Actively Engaged</span>
                              ) : (
                                <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-semibold">Not Engaged</span>
                              )}
                              {r.passive_presence && (
                                <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">Passive Presence</span>
                              )}
                              {r.contribution_level && r.contribution_level !== 'BULK' && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[r.contribution_level] ?? ''}`}>
                                  {r.contribution_level}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Voice analysis */}
                      {r.voice_analysis && r.transcript && (
                        <VoiceAnalysisCard analysis={r.voice_analysis} transcript={r.transcript} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* cURL */}
          <div className="bg-[#0D1626] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm">cURL Command</h3>
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-black/50 text-emerald-400 text-[11px] p-4 rounded-xl overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-white/5">
              {curlCommand}
            </pre>
          </div>

          {/* Expression reference */}
          <div className="bg-[#0D1626] border border-white/8 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-white text-sm">Engagement Scoring Logic</h3>
            <div className="space-y-1.5">
              {(Object.entries(EXPR_META) as [FaceExpression, typeof EXPR_META[FaceExpression]][]).map(([k, v]) => {
                const Icon = v.icon;
                const scoreRange = { ENGAGED: '75–100', FOCUSED: '60–80', NEUTRAL: '35–55', DISTRACTED: '15–30', DROWSY: '5–15', ABSENT: '0' }[k];
                return (
                  <div key={k} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-[11px] ${v.bg} ${v.border}`}>
                    <Icon size={12} className={v.color} />
                    <span className={`font-bold w-20 flex-shrink-0 ${v.color}`}>{v.label}</span>
                    <span className="text-gray-600 flex-1">{v.desc}</span>
                    <span className={`font-mono font-bold flex-shrink-0 ${v.color}`}>{scoreRange}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-600 pt-1">
              Voice activity adds up to +25pts on top of expression base. Drowsy or distracted members are flagged in AI insights even if their face was technically "detected".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
