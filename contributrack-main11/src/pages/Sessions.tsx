import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, X, Check, Loader, Play, Pause, Clock, Activity,
  Users, UserPlus, UserMinus, Radio, CircleDashed, CheckCircle2,
  Layers, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Session, IotData, Member } from '../lib/types';

const initForm = { title: '', description: '' };
const MEMBER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#EC4899'];

function formatDuration(start: string, end?: string | null) {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = Math.floor((e - s) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const sec = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/* ─── Live clock for active sessions ─── */
function LiveDuration({ start }: { start: string }) {
  const [label, setLabel] = useState(formatDuration(start));
  useEffect(() => {
    const id = setInterval(() => setLabel(formatDuration(start)), 1000);
    return () => clearInterval(id);
  }, [start]);
  return <span>{label}</span>;
}

function GlassCard({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative bg-white/[0.025] border border-white/8 rounded-2xl overflow-hidden transition-all duration-300 ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ─── Mini live feed for one active session ─── */
function ActiveSessionFeed({ session, allMembers, memberIds, logs }: {
  session: Session;
  allMembers: Member[];
  memberIds: string[];
  logs: IotData[];
}) {
  const assignedMembers = allMembers.filter(m => memberIds.includes(m.id));
  const recentLogs = logs.slice(0, 6);
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] overflow-hidden">
      {/* Session title bar */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-200 truncate">{session.title}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">
            <LiveDuration start={session.started_at} /> · {assignedMembers.length} member{assignedMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Member avatars */}
        {assignedMembers.length > 0 && (
          <div className="flex -space-x-1.5 flex-shrink-0">
            {assignedMembers.slice(0, 4).map((m, i) => (
              <div key={m.id} className="w-6 h-6 rounded-full border-2 border-[#0B1120] flex items-center justify-center text-white text-[9px] font-bold"
                style={{ backgroundColor: MEMBER_COLORS[allMembers.indexOf(m) % MEMBER_COLORS.length], zIndex: 10 - i }}>
                {m.name.charAt(0)}
              </div>
            ))}
            {assignedMembers.length > 4 && (
              <div className="w-6 h-6 rounded-full border-2 border-[#0B1120] bg-white/10 flex items-center justify-center text-[9px] text-gray-400 font-bold">
                +{assignedMembers.length - 4}
              </div>
            )}
          </div>
        )}
        <Eye size={13} className={`text-gray-600 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-emerald-500/10">
          {/* Member contribution bars */}
          {assignedMembers.length > 0 && (
            <div className="mt-3 space-y-2">
              {assignedMembers.map((m) => {
                const memberLogs = logs.filter(l => l.member_id === m.id);
                const voiceActive = memberLogs.filter(l => l.voice).length;
                const pct = memberLogs.length > 0 ? Math.round((voiceActive / memberLogs.length) * 100) : 0;
                const color = MEMBER_COLORS[allMembers.indexOf(m) % MEMBER_COLORS.length];
                const latestLog = memberLogs[0];
                return (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                      style={{ backgroundColor: color }}>
                      {m.name.charAt(0)}
                    </div>
                    <span className="text-[11px] text-gray-400 w-20 truncate flex-shrink-0">{m.name.split(' ')[0]}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}60` }} />
                    </div>
                    <span className="text-[11px] font-bold w-7 text-right flex-shrink-0" style={{ color }}>{pct}%</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${latestLog?.voice ? 'bg-blue-400' : 'bg-gray-700'}`} title="Voice" />
                      <span className={`w-1.5 h-1.5 rounded-full ${latestLog?.face ? 'bg-emerald-400' : 'bg-gray-700'}`} title="Present" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent log entries */}
          {recentLogs.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Recent Readings</p>
              {recentLogs.map(log => {
                const lc = log.contribution_level === 'HIGH' ? '#10B981' : log.contribution_level === 'MEDIUM' ? '#F59E0B' : '#EF4444';
                return (
                  <div key={log.id} className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-700 font-mono w-14 flex-shrink-0">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="text-gray-400 flex-1 truncate">{(log.members as { name: string } | null)?.name ?? log.device_id}</span>
                    <span className={log.voice ? 'text-blue-400' : 'text-gray-700'}>V</span>
                    <span className={log.face ? 'text-emerald-400' : 'text-gray-700'}>F</span>
                    <span className="font-bold w-8 text-right" style={{ color: lc }}>{log.contribution_pct}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {recentLogs.length === 0 && assignedMembers.length === 0 && (
            <p className="text-xs text-gray-700 mt-3">No activity yet — assign members and send IoT data.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [sessionMemberMap, setSessionMemberMap] = useState<Record<string, string[]>>({});
  const [logsMap, setLogsMap] = useState<Record<string, IotData[]>>({});
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const logsMapRef = useRef(logsMap);
  logsMapRef.current = logsMap;

  /* ── Fetch ── */
  const fetchSessions = useCallback(async () => {
    const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
    if (data) {
      setSessions(data);
      setSelectedSession(prev => prev ? (data.find(s => s.id === prev.id) ?? prev) : null);
    }
    setLoading(false);
  }, []);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from('members').select('*').order('name');
    if (data) setAllMembers(data);
  }, []);

  const fetchSessionMembers = useCallback(async () => {
    const { data } = await supabase.from('session_members').select('session_id, member_id');
    if (data) {
      const map: Record<string, string[]> = {};
      for (const row of data) {
        if (!map[row.session_id]) map[row.session_id] = [];
        map[row.session_id].push(row.member_id);
      }
      setSessionMemberMap(map);
    }
  }, []);

  /* Fetch logs only for active sessions */
  const fetchActiveSessionLogs = useCallback(async (activeSessions: Session[]) => {
    if (activeSessions.length === 0) { setLogsMap({}); return; }
    const results = await Promise.all(
      activeSessions.map(s =>
        supabase.from('iot_data').select('*, members(name)')
          .eq('session_id', s.id).order('created_at', { ascending: false }).limit(30)
          .then(r => ({ id: s.id, data: r.data ?? [] }))
      )
    );
    const map: Record<string, IotData[]> = {};
    for (const r of results) map[r.id] = r.data;
    setLogsMap(map);
  }, []);

  /* Also fetch logs for the selected session detail (even if paused) */
  const fetchSelectedLogs = useCallback(async (sessionId: string) => {
    const { data } = await supabase.from('iot_data').select('*, members(name)')
      .eq('session_id', sessionId).order('created_at', { ascending: false }).limit(50);
    setLogsMap(prev => ({ ...prev, [sessionId]: data ?? [] }));
  }, []);

  useEffect(() => {
    fetchSessions(); fetchMembers(); fetchSessionMembers();
  }, [fetchSessions, fetchMembers, fetchSessionMembers]);

  useEffect(() => {
    const active = sessions.filter(s => s.status === 'active');
    fetchActiveSessionLogs(active);
  }, [sessions, fetchActiveSessionLogs]);

  useEffect(() => {
    if (selectedSession) fetchSelectedLogs(selectedSession.id);
  }, [selectedSession, fetchSelectedLogs]);

  /* Live polling for active sessions */
  useEffect(() => {
    const id = setInterval(() => {
      const active = sessions.filter(s => s.status === 'active');
      if (active.length > 0) fetchActiveSessionLogs(active);
    }, 4000);
    return () => clearInterval(id);
  }, [sessions, fetchActiveSessionLogs]);

  /* ── Actions ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      const { error: err } = await supabase.from('sessions')
        .insert({ title: form.title.trim(), description: form.description.trim() });
      if (err) throw err;
      setForm(initForm); setShowForm(false);
      await fetchSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create session.');
    } finally { setSaving(false); }
  };

  /* Toggle active ↔ paused (no ending, no deletion) */
  const toggleSession = async (s: Session) => {
    setTogglingId(s.id);
    const newStatus = s.status === 'active' ? 'paused' : 'active';
    await supabase.from('sessions').update({ status: newStatus }).eq('id', s.id);
    await fetchSessions();
    setTogglingId(null);
  };

  const toggleMember = async (memberId: string) => {
    if (!selectedSession) return;
    setAssigningId(memberId);
    const assigned = (sessionMemberMap[selectedSession.id] ?? []).includes(memberId);
    if (assigned) {
      await supabase.from('session_members').delete()
        .eq('session_id', selectedSession.id).eq('member_id', memberId);
    } else {
      await supabase.from('session_members')
        .insert({ session_id: selectedSession.id, member_id: memberId });
    }
    await fetchSessionMembers();
    setAssigningId(null);
  };

  /* ── Derived ── */
  const activeSessions = sessions.filter(s => s.status === 'active');
  const pausedSessions = sessions.filter(s => s.status !== 'active');
  const assignedMemberIds = selectedSession ? (sessionMemberMap[selectedSession.id] ?? []) : [];
  const assignedMembers = allMembers.filter(m => assignedMemberIds.includes(m.id));
  const selectedLogs = selectedSession ? (logsMap[selectedSession.id] ?? []) : [];

  return (
    <div className="relative p-6 space-y-5 min-h-full overflow-hidden">
      <div className="fixed top-20 right-20 w-96 h-96 rounded-full bg-blue-600/5 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-20 left-80 w-80 h-80 rounded-full bg-emerald-500/4 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Sessions</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeSessions.length > 0
              ? <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span className="text-emerald-400 font-semibold">{activeSessions.length} running</span>
                  <span className="text-gray-600">· {pausedSessions.length} paused · {sessions.length} total</span>
                </span>
              : `No active sessions · ${sessions.length} total`
            }
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200">
          <Plus size={16} /> New Session
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <GlassCard className="p-5">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">Create New Session</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-300"><X size={16} /></button>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl mb-4">{error}</div>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Session Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Sprint Planning Session"
                className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-gray-200 placeholder-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description…" rows={2}
                className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-gray-200 placeholder-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 resize-none transition-all" />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:scale-105 transition-all shadow-lg shadow-blue-500/20">
                {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />} Create Session
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-500 border border-white/10 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
            </div>
          </form>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ══ LEFT: Session list ══ */}
        <div className="lg:col-span-1 space-y-3">

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <GlassCard className="p-10 text-center">
              <Clock size={28} className="mx-auto text-gray-700 mb-2" />
              <p className="text-gray-500 text-sm">No sessions yet</p>
            </GlassCard>
          ) : (
            <>
              {/* Active sessions */}
              {activeSessions.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" /> Running Now
                  </p>
                  {activeSessions.map(s => (
                    <SessionCard key={s.id} s={s} allMembers={allMembers} sessionMemberMap={sessionMemberMap}
                      selected={selectedSession?.id === s.id} onSelect={() => { setSelectedSession(s); setShowAssign(false); }}
                      onToggle={() => toggleSession(s)} toggling={togglingId === s.id} />
                  ))}
                </>
              )}

              {/* Paused / other sessions */}
              {pausedSessions.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1 mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" /> Paused
                  </p>
                  {pausedSessions.map(s => (
                    <SessionCard key={s.id} s={s} allMembers={allMembers} sessionMemberMap={sessionMemberMap}
                      selected={selectedSession?.id === s.id} onSelect={() => { setSelectedSession(s); setShowAssign(false); }}
                      onToggle={() => toggleSession(s)} toggling={togglingId === s.id} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* ══ RIGHT: panels ══ */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Live data panel: only active sessions ── */}
          {activeSessions.length > 0 && (
            <GlassCard className="p-5">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/60 to-emerald-500/0" />
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Layers size={14} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Live Session Data</h3>
                  <p className="text-[10px] text-gray-600 mt-0.5">Showing data from {activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''} only</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-semibold">Live</span>
                </div>
              </div>
              <div className="space-y-3">
                {activeSessions.map(s => (
                  <ActiveSessionFeed key={s.id} session={s} allMembers={allMembers}
                    memberIds={sessionMemberMap[s.id] ?? []} logs={logsMap[s.id] ?? []} />
                ))}
              </div>
            </GlassCard>
          )}

          {activeSessions.length === 0 && !selectedSession && (
            <GlassCard className="flex items-center justify-center" style={{ minHeight: '200px' }}>
              <div className="text-center text-gray-600 p-10">
                <Radio size={28} className="mx-auto mb-3 opacity-15" />
                <p className="text-sm font-medium text-gray-500">No sessions running</p>
                <p className="text-xs mt-1">Resume a paused session or create a new one</p>
              </div>
            </GlassCard>
          )}

          {/* ── Selected session detail (members + activity log) ── */}
          {selectedSession && (
            <>
              {/* Session header */}
              <GlassCard className="p-5">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-cyan-500/40 to-blue-500/0" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-white text-base">{selectedSession.title}</h3>
                      {selectedSession.status === 'active'
                        ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                          </span>
                        : <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">PAUSED</span>
                      }
                    </div>
                    {selectedSession.description && <p className="text-sm text-gray-500 mt-1">{selectedSession.description}</p>}
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><Clock size={11} />Started: {new Date(selectedSession.started_at).toLocaleString()}</span>
                      <span className="font-semibold text-blue-400">
                        Duration: {selectedSession.status === 'active'
                          ? <LiveDuration start={selectedSession.started_at} />
                          : formatDuration(selectedSession.started_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Assign members */}
              <GlassCard className="p-5">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-400/40 to-blue-500/0" />
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2"><Users size={14} className="text-blue-400" />Working on this session</h4>
                    <p className="text-xs text-gray-600 mt-0.5">{assignedMembers.length} member{assignedMembers.length !== 1 ? 's' : ''} assigned</p>
                  </div>
                  <button onClick={() => setShowAssign(p => !p)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 font-semibold transition-all">
                    <UserPlus size={12} /> {showAssign ? 'Done' : 'Assign'}
                  </button>
                </div>

                {assignedMembers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {assignedMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-2.5 bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2.5 group">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: MEMBER_COLORS[allMembers.indexOf(m) % MEMBER_COLORS.length] }}>
                          {m.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-200 truncate">{m.name}</p>
                          <p className="text-[10px] text-gray-600">{m.role}</p>
                        </div>
                        <button onClick={() => toggleMember(m.id)} disabled={assigningId === m.id}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">
                          {assigningId === m.id ? <Loader size={12} className="animate-spin" /> : <UserMinus size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-700 mb-3 flex items-center gap-1.5"><Users size={12} className="opacity-40" />No members assigned — click Assign.</p>
                )}

                {showAssign && (
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">Click to toggle assignment</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {allMembers.map(m => {
                        const isAssigned = assignedMemberIds.includes(m.id);
                        const color = MEMBER_COLORS[allMembers.indexOf(m) % MEMBER_COLORS.length];
                        return (
                          <button key={m.id} onClick={() => toggleMember(m.id)} disabled={assigningId === m.id}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 ${
                              isAssigned ? 'bg-blue-500/10 border-blue-500/25 hover:bg-blue-500/20' : 'bg-white/[0.02] border-white/8 hover:bg-white/[0.05]'
                            }`}>
                            {assigningId === m.id
                              ? <Loader size={16} className="animate-spin text-gray-500 flex-shrink-0" />
                              : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                  style={{ backgroundColor: color }}>{m.name.charAt(0)}</div>
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-200 truncate">{m.name}</p>
                              <p className="text-[10px] text-gray-600">{m.role}</p>
                            </div>
                            {isAssigned && <Check size={12} className="text-blue-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                      {allMembers.length === 0 && <p className="text-xs text-gray-600 col-span-2 py-2">No members registered yet.</p>}
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Full activity log for selected session */}
              <GlassCard>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0" />
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Activity size={14} className="text-cyan-400" /> Full Activity Log
                    <span className="text-[10px] font-normal text-gray-600">({selectedLogs.length} entries)</span>
                  </h4>
                  {selectedSession.status !== 'active' && (
                    <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">Historical data</span>
                  )}
                </div>
                <div className="p-5 overflow-y-auto max-h-80">
                  {selectedLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">
                      <Activity size={22} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No activity logged yet</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5" />
                      <div className="space-y-2.5">
                        {selectedLogs.map(log => {
                          const lc = log.contribution_level === 'HIGH'
                            ? { ring: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400', text: '#10B981' }
                            : log.contribution_level === 'MEDIUM'
                            ? { ring: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400', text: '#F59E0B' }
                            : { ring: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-500', text: '#EF4444' };
                          return (
                            <div key={log.id} className="flex gap-3 items-start">
                              <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 z-10 ${lc.ring}`}>
                                <span className={`w-2 h-2 rounded-full ${lc.dot}`} />
                              </div>
                              <div className="flex-1 bg-white/[0.025] border border-white/8 rounded-xl p-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-gray-200">
                                    {(log.members as { name: string } | null)?.name ?? log.device_id}
                                  </p>
                                  <span className="text-[10px] text-gray-600 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex gap-3 mt-1 text-[11px]">
                                  <span className={log.voice ? 'text-blue-400' : 'text-gray-600'}>Voice: {log.voice ? 'Active' : 'Silent'}</span>
                                  <span className={log.face ? 'text-emerald-400' : 'text-gray-600'}>Present: {log.face ? 'Yes' : 'No'}</span>
                                  <span className="font-bold" style={{ color: lc.text }}>{log.contribution_pct}% — {log.contribution_level}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Session card component ─── */
function SessionCard({ s, allMembers, sessionMemberMap, selected, onSelect, onToggle, toggling }: {
  s: Session; allMembers: Member[]; sessionMemberMap: Record<string, string[]>;
  selected: boolean; onSelect: () => void; onToggle: () => void; toggling: boolean;
}) {
  const isActive = s.status === 'active';
  const memberIds = sessionMemberMap[s.id] ?? [];
  const sessionMembers = allMembers.filter(m => memberIds.includes(m.id));

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      isActive
        ? 'border-emerald-500/30 bg-emerald-500/[0.04] shadow-lg shadow-emerald-500/8'
        : 'border-white/8 bg-white/[0.02]'
    } ${selected ? 'ring-1 ring-blue-500/40' : ''}`}>
      <button onClick={onSelect} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            {isActive
              ? <Radio size={16} className="text-emerald-400 animate-pulse" />
              : <CircleDashed size={16} className="text-gray-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-bold text-gray-100 text-sm leading-tight">{s.title}</p>
              {isActive && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />LIVE
                </span>
              )}
            </div>
            {s.description && <p className="text-[11px] text-gray-600 truncate mb-1.5">{s.description}</p>}

            {sessionMembers.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex -space-x-1.5">
                  {sessionMembers.slice(0, 4).map((m, i) => (
                    <div key={m.id} className="w-5 h-5 rounded-full border-2 border-[#0B1120] flex items-center justify-center text-white text-[8px] font-bold"
                      style={{ backgroundColor: MEMBER_COLORS[allMembers.indexOf(m) % MEMBER_COLORS.length], zIndex: 10 - i }}>
                      {m.name.charAt(0)}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-gray-600">{sessionMembers.length} member{sessionMembers.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-gray-700">
              <Clock size={9} />
              {isActive ? <LiveDuration start={s.started_at} /> : formatDuration(s.started_at)}
              <span>·</span>
              <span>{new Date(s.started_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </button>

      {/* Toggle button */}
      <div className="px-4 pb-3" onClick={e => e.stopPropagation()}>
        <button onClick={onToggle} disabled={toggling}
          className={`w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-xl border font-semibold transition-all ${
            isActive
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
              : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/25 hover:from-blue-500/30 hover:to-cyan-500/30'
          }`}>
          {toggling
            ? <Loader size={11} className="animate-spin" />
            : isActive ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Resume</>
          }
        </button>
      </div>
    </div>
  );
}
