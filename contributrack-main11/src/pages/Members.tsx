import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserPlus, Trash2, CreditCard as Edit2, X, Check, Loader, Search, Cpu,
  Clock, Activity, Camera, Mic, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Tag, StopCircle, RefreshCw, Video, MicOff, Upload, FolderOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getBiometricSignedUrl } from '../lib/storage';
import type { Member } from '../lib/types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#EC4899'];
const ROLES = ['member', 'leader', 'facilitator', 'observer'];
const initForm = { name: '', email: '', role: 'member', device_id: '', voice_label: '', face_label: '' };

interface SessionInfo { id: string; title: string; status: string }

/* member-biometrics is a private bucket: face_image_url / voice_sample_url
   store the object path, not a public URL. These small components resolve
   that path to a short-lived signed URL just for rendering. */
function SignedBioImage({ path, alt, className, style, onMissing }: {
  path: string | null | undefined; alt: string; className?: string;
  style?: React.CSSProperties; onMissing?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
    getBiometricSignedUrl(path).then(signed => {
      if (cancelled) return;
      setUrl(signed);
      if (!signed) onMissing?.();
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} style={style} />;
}

function SignedBioAudio({ path, className }: { path: string | null | undefined; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
    getBiometricSignedUrl(path).then(signed => { if (!cancelled) setUrl(signed); });
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return null;
  return <audio src={url} controls className={className} />;
}

function DeviceSecretField({ memberId, secret, onRegenerated }: {
  memberId: string; secret: string | null; onRegenerated: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const copy = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const regenerate = async () => {
    if (!confirm('Regenerating invalidates the current secret — the paired device will need it updated before it can send readings again. Continue?')) return;
    setRegenerating(true);
    // 24 random bytes, base64-encoded client-side; the device only ever
    // needs to match this value, it doesn't need to come from the DB default.
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const newSecret = btoa(String.fromCharCode(...bytes));
    await supabase.from('members').update({ device_secret: newSecret }).eq('id', memberId);
    setRegenerating(false);
    setRevealed(true);
    onRegenerated();
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
        <Cpu size={10} />Device Secret <span className="text-gray-700 font-normal">— required by the device to send readings</span>
      </label>
      <div className="flex items-center gap-2">
        <input readOnly value={revealed ? (secret ?? '') : '••••••••••••••••••••••••'}
          className="flex-1 px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-gray-200 rounded-xl font-mono" />
        <button type="button" onClick={() => setRevealed(r => !r)}
          className="px-3 py-2.5 text-xs font-semibold text-gray-300 border border-white/10 rounded-xl hover:bg-white/5">
          {revealed ? 'Hide' : 'Reveal'}
        </button>
        <button type="button" onClick={copy} disabled={!secret}
          className="px-3 py-2.5 text-xs font-semibold text-gray-300 border border-white/10 rounded-xl hover:bg-white/5 disabled:opacity-40">
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" onClick={regenerate} disabled={regenerating}
          className="px-3 py-2.5 text-xs font-semibold text-amber-300 border border-amber-500/20 rounded-xl hover:bg-amber-500/10 disabled:opacity-40">
          {regenerating ? <Loader size={12} className="animate-spin" /> : 'Regenerate'}
        </button>
      </div>
    </div>
  );
}

function deriveLabel(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function BioPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
      ok ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-gray-600 bg-white/5 border-white/8'
    }`}>
      {ok ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
      {label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   LIVE CAMERA CAPTURE MODAL
════════════════════════════════════════════════════════════ */
function CameraModal({ onCapture, onClose }: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'live' | 'upload'>('live');
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBlob, setUploadBlob] = useState<Blob | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [err, setErr] = useState('');

  /* Start camera when on live tab */
  useEffect(() => {
    if (tab !== 'live') { streamRef.current?.getTracks().forEach(t => t.stop()); return; }
    setErr(''); setReady(false); setCaptured(null); setCapturedBlob(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); setReady(true); };
        }
      } catch {
        setErr('Camera access denied. Please allow camera permission in your browser.');
      }
    })();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [tab]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    c.toBlob(blob => { if (!blob) return; setCapturedBlob(blob); setCaptured(c.toDataURL('image/jpeg')); }, 'image/jpeg', 0.92);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadBlob(file);
    setUploadName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const confirm = () => {
    if (tab === 'live' && capturedBlob) { onClose(); onCapture(capturedBlob); }
    if (tab === 'upload' && uploadBlob) { onClose(); onCapture(uploadBlob); }
  };

  const tabBtn = (t: 'live' | 'upload', icon: React.ReactNode, label: string) => (
    <button onClick={() => setTab(t)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
        tab === t ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-gray-600 hover:text-gray-400 border border-transparent'
      }`}>
      {icon}{label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#0D1626] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Camera size={15} className="text-blue-400" />
            <span className="font-bold text-white text-sm">Face Photo</span>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300"><X size={16} /></button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 px-5 pt-4 pb-1">
          {tabBtn('live', <Video size={12} />, 'Live Camera')}
          {tabBtn('upload', <FolderOpen size={12} />, 'Upload File')}
        </div>

        <div className="p-5 space-y-4">
          {/* ── LIVE TAB ── */}
          {tab === 'live' && (
            err ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />{err}
                <p className="mt-2 text-[10px] text-gray-600">You can still <button onClick={() => setTab('upload')} className="text-blue-400 underline">upload a photo</button> instead.</p>
              </div>
            ) : (
              <>
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-white/8">
                  <video ref={videoRef} className={`w-full h-full object-cover ${captured ? 'hidden' : ''}`} muted playsInline />
                  {captured && <img src={captured} alt="Captured" className="w-full h-full object-cover" />}
                  {!ready && !captured && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader size={22} className="animate-spin text-blue-400" />
                    </div>
                  )}
                  {!captured && ready && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-36 h-44 rounded-full border-2 border-dashed border-white/30" />
                    </div>
                  )}
                  {captured && (
                    <div className="absolute top-2 right-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> Captured
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <p className="text-xs text-gray-600 text-center">
                  {captured ? 'Looks good? Confirm or retake.' : 'Position face inside the oval, then click Capture.'}
                </p>
                <div className="flex gap-2">
                  {!captured ? (
                    <button onClick={capture} disabled={!ready}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:scale-105 transition-all shadow-lg shadow-blue-500/20">
                      <Camera size={15} /> Capture Photo
                    </button>
                  ) : (
                    <>
                      <button onClick={() => { setCaptured(null); setCapturedBlob(null); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 transition-all">
                        <RefreshCw size={13} /> Retake
                      </button>
                      <button onClick={confirm}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:scale-105 transition-all shadow-lg shadow-emerald-500/20">
                        <Check size={15} /> Use This Photo
                      </button>
                    </>
                  )}
                </div>
              </>
            )
          )}

          {/* ── UPLOAD TAB ── */}
          {tab === 'upload' && (
            <>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
              {uploadPreview ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-white/8">
                    <img src={uploadPreview} alt="Preview" className="w-full h-full object-contain" />
                    <div className="absolute top-2 right-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> {uploadName}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setUploadPreview(null); setUploadBlob(null); fileRef.current?.click(); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 transition-all">
                      <RefreshCw size={13} /> Choose Again
                    </button>
                    <button onClick={confirm}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:scale-105 transition-all shadow-lg shadow-emerald-500/20">
                      <Check size={15} /> Use This Photo
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/15 rounded-xl py-10 text-gray-500 hover:border-blue-500/40 hover:text-blue-400 hover:bg-blue-500/5 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-blue-500/10 border border-white/8 group-hover:border-blue-500/20 flex items-center justify-center transition-all">
                    <Upload size={20} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Click to browse</p>
                    <p className="text-xs text-gray-600 mt-0.5">JPEG, PNG or WebP · max 10 MB</p>
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   LIVE VOICE RECORDING MODAL
════════════════════════════════════════════════════════════ */
function VoiceModal({ onCapture, onClose }: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tab, setTab] = useState<'live' | 'upload'>('live');
  const [state, setState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState('');
  const [uploadBlob, setUploadBlob] = useState<Blob | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadAudioUrl, setUploadAudioUrl] = useState<string | null>(null);

  const drawWave = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d')!;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    const sliceW = canvas.width / buf.length;
    let x = 0;
    for (let i = 0; i < buf.length; i++) {
      const y = (buf[i] / 128) * (canvas.height / 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.stroke();
    animRef.current = requestAnimationFrame(drawWave);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/webm' });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        setState('done');
        streamRef.current?.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
      drawWave();
    } catch {
      setErr('Microphone access denied. Please allow microphone permission in your browser.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
  };

  const reRecord = () => {
    setBlob(null); setAudioUrl(null); setState('idle'); setElapsed(0);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadBlob(file);
    setUploadName(file.name);
    setUploadAudioUrl(URL.createObjectURL(file));
    e.target.value = '';
  };

  const confirm = () => {
    if (tab === 'live' && blob) { onClose(); onCapture(blob); }
    if (tab === 'upload' && uploadBlob) { onClose(); onCapture(uploadBlob); }
  };

  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const tabBtn = (t: 'live' | 'upload', icon: React.ReactNode, label: string) => (
    <button onClick={() => setTab(t)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
        tab === t ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-gray-600 hover:text-gray-400 border border-transparent'
      }`}>
      {icon}{label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#0D1626] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/60 to-emerald-500/0" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Mic size={15} className="text-emerald-400" />
            <span className="font-bold text-white text-sm">Voice Sample</span>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300"><X size={16} /></button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 px-5 pt-4 pb-1">
          {tabBtn('live', <Mic size={12} />, 'Live Record')}
          {tabBtn('upload', <FolderOpen size={12} />, 'Upload File')}
        </div>

        <div className="p-5 space-y-4">
          {/* ── LIVE TAB ── */}
          {tab === 'live' && (
            err ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl flex flex-col gap-2">
                <div className="flex items-start gap-2"><AlertCircle size={14} className="flex-shrink-0 mt-0.5" />{err}</div>
                <p className="text-[10px] text-gray-600">You can still <button onClick={() => setTab('upload')} className="text-emerald-400 underline">upload an audio file</button> instead.</p>
              </div>
            ) : (
              <>
                <div className="relative rounded-xl bg-black/40 border border-white/8 h-28 flex items-center justify-center overflow-hidden">
                  <canvas ref={canvasRef} width={400} height={96} className="absolute inset-0 w-full h-full" />
                  {state === 'idle' && (
                    <div className="relative flex flex-col items-center gap-1">
                      <MicOff size={28} className="text-gray-700" />
                      <p className="text-xs text-gray-700">Click Record to start</p>
                    </div>
                  )}
                  {state === 'recording' && (
                    <div className="relative flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                      <span className="text-white font-mono text-xl font-bold">{fmt(elapsed)}</span>
                    </div>
                  )}
                  {state === 'done' && (
                    <div className="relative flex flex-col items-center gap-1">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                      <p className="text-xs text-emerald-400 font-semibold">{fmt(elapsed)} recorded</p>
                    </div>
                  )}
                </div>
                {audioUrl && <audio src={audioUrl} controls className="w-full h-9 rounded-xl" />}
                <p className="text-xs text-gray-600 text-center">
                  {state === 'idle' && 'Speak naturally for 5–10 seconds for best results.'}
                  {state === 'recording' && 'Recording… speak clearly. Click Stop when done.'}
                  {state === 'done' && 'Play back to verify, then confirm or re-record.'}
                </p>
                <div className="flex gap-2">
                  {state === 'idle' && (
                    <button onClick={startRecording}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:scale-105 transition-all shadow-lg shadow-emerald-500/20">
                      <Mic size={15} /> Start Recording
                    </button>
                  )}
                  {state === 'recording' && (
                    <button onClick={stopRecording}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-all">
                      <StopCircle size={15} /> Stop Recording
                    </button>
                  )}
                  {state === 'done' && (
                    <>
                      <button onClick={reRecord}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 transition-all">
                        <RefreshCw size={13} /> Re-record
                      </button>
                      <button onClick={confirm}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:scale-105 transition-all shadow-lg shadow-emerald-500/20">
                        <Check size={15} /> Use This Sample
                      </button>
                    </>
                  )}
                </div>
              </>
            )
          )}

          {/* ── UPLOAD TAB ── */}
          {tab === 'upload' && (
            <>
              <input ref={fileRef} type="file" accept="audio/wav,audio/mpeg,audio/mp3,audio/ogg,audio/webm,audio/m4a" className="hidden" onChange={handleFileChange} />
              {uploadAudioUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl px-4 py-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Mic size={16} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-200 truncate">{uploadName}</p>
                      <p className="text-[10px] text-emerald-600">Ready to upload</p>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  </div>
                  <audio src={uploadAudioUrl} controls className="w-full h-9 rounded-xl" />
                  <div className="flex gap-2">
                    <button onClick={() => { setUploadBlob(null); setUploadAudioUrl(null); fileRef.current?.click(); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 transition-all">
                      <RefreshCw size={13} /> Choose Again
                    </button>
                    <button onClick={confirm}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:scale-105 transition-all shadow-lg shadow-emerald-500/20">
                      <Check size={15} /> Use This Sample
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/15 rounded-xl py-10 text-gray-500 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-emerald-500/10 border border-white/8 group-hover:border-emerald-500/20 flex items-center justify-center transition-all">
                    <Upload size={20} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Click to browse</p>
                    <p className="text-xs text-gray-600 mt-0.5">WAV, MP3, OGG, WebM or M4A · max 10 MB</p>
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   BIOMETRIC PANEL
════════════════════════════════════════════════════════════ */
function BiometricPanel({ member, onUpdated }: { member: Member; onUpdated: () => void }) {
  const [showCamera, setShowCamera] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [editLabels, setEditLabels] = useState(false);
  const [voiceLabel, setVoiceLabel] = useState(member.voice_label ?? deriveLabel(member.name));
  const [faceLabel, setFaceLabel] = useState(member.face_label ?? deriveLabel(member.name));
  const [savingLabels, setSavingLabels] = useState(false);
  const [facePreviewPath, setFacePreviewPath] = useState<string | null>(member.face_image_url ?? null);
  const [voiceDuration, setVoiceDuration] = useState<string | null>(null);

  const uploadFace = async (blob: Blob) => {
    setShowCamera(false);
    setUploadingFace(true);
    const path = `faces/${member.id}_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('member-biometrics').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (!error) {
      // Store the object path — the bucket is private, so there is no
      // public URL to save. Signed URLs are generated on demand.
      await supabase.from('members').update({ face_image_url: path, face_label: faceLabel || deriveLabel(member.name) }).eq('id', member.id);
      setFacePreviewPath(path);
      onUpdated();
    }
    setUploadingFace(false);
  };

  const uploadVoice = async (blob: Blob) => {
    setShowVoice(false);
    setUploadingVoice(true);
    const path = `voices/${member.id}_${Date.now()}.webm`;
    const { error } = await supabase.storage.from('member-biometrics').upload(path, blob, { upsert: true, contentType: 'audio/webm' });
    if (!error) {
      await supabase.from('members').update({ voice_sample_url: path, voice_label: voiceLabel || deriveLabel(member.name) }).eq('id', member.id);
      setVoiceDuration('Sample saved');
      onUpdated();
    }
    setUploadingVoice(false);
  };

  const saveLabels = async () => {
    setSavingLabels(true);
    await supabase.from('members').update({ voice_label: voiceLabel, face_label: faceLabel }).eq('id', member.id);
    setSavingLabels(false);
    setEditLabels(false);
    onUpdated();
  };

  const hasFace = !!facePreviewPath || !!member.face_image_url;
  const hasVoice = !!member.voice_sample_url || !!voiceDuration;

  return (
    <>
      {showCamera && <CameraModal onCapture={uploadFace} onClose={() => setShowCamera(false)} />}
      {showVoice && <VoiceModal onCapture={uploadVoice} onClose={() => setShowVoice(false)} />}

      <div className="border-t border-white/5 pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">AI Recognition Profile</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <BioPill ok={hasFace} label="Face" />
          <BioPill ok={hasVoice} label="Voice" />
          <BioPill ok={!!(faceLabel || voiceLabel)} label="Labels set" />
        </div>

        {/* Face section */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5">
            <Camera size={10} className="text-blue-400" /> Face Photo
            <span className="text-gray-700 font-normal">— used by face-recognition model</span>
          </p>
          <div className="flex items-center gap-3">
            {/* Preview */}
            <div className="w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0"
              style={{ borderColor: hasFace ? '#3B82F660' : '#ffffff15' }}>
              {(facePreviewPath ?? member.face_image_url) ? (
                <SignedBioImage path={facePreviewPath ?? member.face_image_url} alt={member.name}
                  className="w-full h-full object-cover"
                  onMissing={() => setFacePreviewPath(null)} />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <Camera size={20} className="text-gray-700" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setShowCamera(true)}
                disabled={uploadingFace}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  hasFace
                    ? 'bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/20'
                    : 'bg-white/[0.03] border-white/10 text-gray-400 hover:bg-white/[0.07] hover:text-gray-200'
                }`}>
                {uploadingFace
                  ? <><Loader size={12} className="animate-spin" /> Saving…</>
                  : <><Video size={12} /> {hasFace ? 'Retake Photo' : 'Open Camera'}</>
                }
              </button>
              {hasFace && (
                <p className="text-[10px] text-gray-600">
                  Label: <code className="text-blue-400 bg-blue-500/10 px-1 rounded">{member.face_label ?? deriveLabel(member.name)}</code>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Voice section */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5">
            <Mic size={10} className="text-emerald-400" /> Voice Sample
            <span className="text-gray-700 font-normal">— used by voice model to identify speaker</span>
          </p>
          <div className="flex items-center gap-3">
            <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${
              hasVoice ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-dashed border-white/10 bg-white/5'
            }`}>
              {uploadingVoice
                ? <Loader size={18} className="animate-spin text-emerald-400" />
                : <Mic size={20} className={hasVoice ? 'text-emerald-400' : 'text-gray-700'} />
              }
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setShowVoice(true)}
                disabled={uploadingVoice}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  hasVoice
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-white/[0.03] border-white/10 text-gray-400 hover:bg-white/[0.07] hover:text-gray-200'
                }`}>
                {uploadingVoice
                  ? <><Loader size={12} className="animate-spin" /> Saving…</>
                  : <><Mic size={12} /> {hasVoice ? 'Re-record Sample' : 'Record Voice'}</>
                }
              </button>
              {hasVoice && (
                <p className="text-[10px] text-gray-600">
                  Label: <code className="text-emerald-400 bg-emerald-500/10 px-1 rounded">{member.voice_label ?? deriveLabel(member.name)}</code>
                </p>
              )}
            </div>
          </div>
          {/* Playback for existing sample */}
          {member.voice_sample_url && !uploadingVoice && (
            <SignedBioAudio path={member.voice_sample_url} className="w-full h-8 mt-1 rounded-xl" />
          )}
        </div>

        {/* Label editor */}
        <div className="space-y-2">
          <button onClick={() => setEditLabels(p => !p)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-widest">
            <Tag size={9} /> Edit AI Labels
            {editLabels ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
          </button>
          {editLabels && (
            <div className="bg-white/[0.02] border border-white/8 rounded-xl p-3 space-y-3">
              <p className="text-[10px] text-gray-600">
                These labels are sent by the IoT device when it detects this person. They must match exactly what your AI model outputs.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1 flex items-center gap-1"><Camera size={8} />Face label</label>
                  <input value={faceLabel} onChange={e => setFaceLabel(e.target.value)}
                    placeholder={deriveLabel(member.name)}
                    className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-blue-300 placeholder-gray-700 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1 flex items-center gap-1"><Mic size={8} />Voice label</label>
                  <input value={voiceLabel} onChange={e => setVoiceLabel(e.target.value)}
                    placeholder={deriveLabel(member.name)}
                    className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-emerald-300 placeholder-gray-700 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40" />
                </div>
              </div>
              <button onClick={saveLabels} disabled={savingLabels}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 font-semibold transition-all">
                {savingLabels ? <Loader size={11} className="animate-spin" /> : <Check size={11} />} Save Labels
              </button>
            </div>
          )}
        </div>

        {/* AI mapping summary */}
        {(hasFace || hasVoice) && (
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1.5">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">How the AI identifies this person</p>
            {hasFace && (
              <p className="text-[11px] text-gray-500 flex items-start gap-2">
                <Camera size={10} className="text-blue-400 mt-0.5 flex-shrink-0" />
                Face detected → label <code className="text-blue-400 bg-blue-500/10 px-1 rounded text-[10px]">{member.face_label ?? deriveLabel(member.name)}</code> → <span className="text-white font-semibold">{member.name}</span>
              </p>
            )}
            {hasVoice && (
              <p className="text-[11px] text-gray-500 flex items-start gap-2">
                <Mic size={10} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                Voice detected → label <code className="text-emerald-400 bg-emerald-500/10 px-1 rounded text-[10px]">{member.voice_label ?? deriveLabel(member.name)}</code> → <span className="text-white font-semibold">{member.name}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
const roleColors: Record<string, string> = {
  leader: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  member: 'text-gray-400 bg-white/5 border-white/10',
  facilitator: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  observer: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const statusColors: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  completed: 'text-gray-500 bg-white/5 border-white/10',
  paused: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-white/[0.025] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 hover:bg-white/[0.035] transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSessions, setMemberSessions] = useState<Record<string, SessionInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from('members').select('*').order('created_at');
    if (data) setMembers(data);
    setLoading(false);
  }, []);

  const fetchMemberSessions = useCallback(async () => {
    const { data } = await supabase.from('session_members').select('member_id, sessions(id, title, status)');
    if (data) {
      const map: Record<string, SessionInfo[]> = {};
      for (const row of data) {
        const mid = row.member_id as string;
        const sess = row.sessions as SessionInfo | null;
        if (!sess) continue;
        if (!map[mid]) map[mid] = [];
        map[mid].push(sess);
      }
      setMemberSessions(map);
    }
  }, []);

  useEffect(() => { fetchMembers(); fetchMemberSessions(); }, [fetchMembers, fetchMemberSessions]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    setSaving(true);
    try {
      const autoLabel = deriveLabel(form.name);
      if (editId) {
        const { error: err } = await supabase.from('members').update({
          name: form.name.trim(), email: form.email.trim(), role: form.role,
          device_id: form.device_id.trim() || null,
          voice_label: form.voice_label.trim() || null,
          face_label: form.face_label.trim() || null,
        }).eq('id', editId);
        if (err) throw err;
      } else {
        const color = COLORS[members.length % COLORS.length];
        const { error: err } = await supabase.from('members').insert({
          name: form.name.trim(), email: form.email.trim(), role: form.role,
          device_id: form.device_id.trim() || null, avatar_color: color,
          voice_label: form.voice_label.trim() || autoLabel,
          face_label: form.face_label.trim() || autoLabel,
        });
        if (err) throw err;
      }
      setForm(initForm); setShowForm(false); setEditId(null);
      await fetchMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save member.');
    } finally { setSaving(false); }
  };

  const handleEdit = (m: Member) => {
    setForm({
      name: m.name, email: m.email, role: m.role,
      device_id: m.device_id ?? '',
      voice_label: m.voice_label ?? '',
      face_label: m.face_label ?? '',
    });
    setEditId(m.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from('members').delete().eq('id', id);
    await fetchMembers();
    setDeletingId(null);
    if (expandedId === id) setExpandedId(null);
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const complete = members.filter(m => m.face_image_url && m.voice_sample_url).length;
  const partial = members.filter(m => (m.face_image_url || m.voice_sample_url) && !(m.face_image_url && m.voice_sample_url)).length;
  const none = members.length - complete - partial;

  return (
    <div className="relative p-6 space-y-5 min-h-full overflow-hidden">
      <div className="fixed top-20 left-64 w-96 h-96 rounded-full bg-blue-600/5 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-10 right-20 w-80 h-80 rounded-full bg-emerald-500/4 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Team Members</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {members.length} registered · {complete} fully profiled · {partial} partial · {none} missing biometrics
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(initForm); setError(''); }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200">
          <UserPlus size={16} /> Add Member
        </button>
      </div>

      {/* Warning banner */}
      {members.length > 0 && none > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0" />
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-300">{none} member{none !== 1 ? 's' : ''} missing AI recognition profile</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Expand a member card and use the live camera and microphone to capture their face and voice so the AI can identify them during sessions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <GlassCard className="p-5">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">{editId ? 'Edit Member' : 'Register New Member'}</h3>
            <button onClick={() => { setShowForm(false); setEditId(null); setError(''); }} className="text-gray-600 hover:text-gray-300"><X size={16} /></button>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl mb-4">{error}</div>}
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Full Name *', key: 'name', placeholder: 'e.g. Alice Johnson', type: 'text' },
              { label: 'Email Address *', key: 'email', placeholder: 'alice@example.com', type: 'email' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                <input type={type} value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-gray-200 placeholder-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all">
                {ROLES.map(r => <option key={r} value={r} className="bg-[#0D1626]">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Cpu size={10} />IoT Device ID</label>
              <input value={form.device_id} onChange={e => setForm(f => ({ ...f, device_id: e.target.value }))}
                placeholder="e.g. device_1"
                className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-gray-200 placeholder-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 font-mono transition-all" />
            </div>
            {editId && (
              <DeviceSecretField memberId={editId} secret={members.find(m => m.id === editId)?.device_secret ?? null} onRegenerated={fetchMembers} />
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Camera size={10} />Face Label (AI)</label>
              <input value={form.face_label} onChange={e => setForm(f => ({ ...f, face_label: e.target.value }))}
                placeholder={form.name ? deriveLabel(form.name) : 'auto-generated'}
                className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-blue-300 placeholder-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 font-mono transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Mic size={10} />Voice Label (AI)</label>
              <input value={form.voice_label} onChange={e => setForm(f => ({ ...f, voice_label: e.target.value }))}
                placeholder={form.name ? deriveLabel(form.name) : 'auto-generated'}
                className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-emerald-300 placeholder-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/30 font-mono transition-all" />
            </div>
            <div className="md:col-span-2 flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:scale-105 transition-all shadow-lg shadow-blue-500/20">
                {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
                {editId ? 'Save Changes' : 'Register Member'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setError(''); }}
                className="px-4 py-2 text-sm text-gray-500 border border-white/10 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 text-gray-200 placeholder-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all" />
      </div>

      {/* Member Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-14 text-center">
          <UserPlus size={32} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500 font-medium text-sm">No members yet</p>
          <p className="text-gray-600 text-xs mt-1">Click "Add Member" to register the first team member.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const color = COLORS[members.indexOf(m) % COLORS.length];
            const sessions = memberSessions[m.id] ?? [];
            const activeSessions = sessions.filter(s => s.status === 'active');
            const hasFace = !!m.face_image_url;
            const hasVoice = !!m.voice_sample_url;
            const isExpanded = expandedId === m.id;

            return (
              <GlassCard key={m.id} className="p-5">
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ backgroundImage: `linear-gradient(to right, transparent, ${color}60, transparent)` }} />

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {hasFace ? (
                        <SignedBioImage path={m.face_image_url} alt={m.name}
                          className="w-10 h-10 rounded-xl object-cover border-2 flex-shrink-0"
                          style={{ borderColor: color + '60' }} />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ backgroundColor: color, boxShadow: `0 0 16px ${color}40` }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {activeSessions.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0B1120] animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-100 text-sm">{m.name}</p>
                      <p className="text-xs text-gray-600 truncate max-w-[130px]">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(m)} className="p-1.5 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(m.id)} disabled={deletingId === m.id}
                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                      {deletingId === m.id ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleColors[m.role] ?? 'text-gray-400 bg-white/5 border-white/10'}`}>
                    {m.role}
                  </span>
                  {m.device_id && (
                    <span className="text-[10px] text-gray-500 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                      <Cpu size={9} />{m.device_id}
                    </span>
                  )}
                  <BioPill ok={hasFace} label={hasFace ? 'Face' : 'No Face'} />
                  <BioPill ok={hasVoice} label={hasVoice ? 'Voice' : 'No Voice'} />
                </div>

                {sessions.length > 0 && (
                  <div className="border-t border-white/5 pt-3 mb-3">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock size={9} />Sessions</p>
                    <div className="space-y-1">
                      {sessions.slice(0, 2).map(s => (
                        <div key={s.id} className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${statusColors[s.status]}`}>
                            {s.status === 'active' ? '● live' : s.status}
                          </span>
                          <span className="text-[11px] text-gray-400 truncate">{s.title}</span>
                        </div>
                      ))}
                      {sessions.length > 2 && <p className="text-[10px] text-gray-700">+{sessions.length - 2} more</p>}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-700">Joined {new Date(m.created_at).toLocaleDateString()}</p>
                  {activeSessions.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <Activity size={9} /> Active now
                    </span>
                  )}
                </div>

                <button onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className={`mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold py-2 rounded-xl border transition-all duration-200 ${
                    isExpanded
                      ? 'bg-white/5 border-white/10 text-gray-400'
                      : (!hasFace || !hasVoice)
                        ? 'bg-amber-500/8 border-amber-500/20 text-amber-500 hover:bg-amber-500/15'
                        : 'bg-emerald-500/8 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/15'
                  }`}>
                  {isExpanded
                    ? <><ChevronUp size={12} /> Hide AI Profile</>
                    : (!hasFace || !hasVoice)
                      ? <><AlertCircle size={12} /> Setup AI Recognition</>
                      : <><CheckCircle2 size={12} /> View AI Profile</>
                  }
                </button>

                {isExpanded && <BiometricPanel member={m} onUpdated={fetchMembers} />}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
