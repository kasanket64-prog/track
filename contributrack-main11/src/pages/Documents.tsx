import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, FileText, Trash2, Loader, AlertCircle, BarChart2,
  CheckCircle, Users, FileSpreadsheet, Presentation, File
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Document, Member } from '../lib/types';

// ── File type detection ────────────────────────────────────────────────────

type FileCategory = 'text' | 'pdf' | 'word' | 'pptx' | 'excel' | 'unknown';

interface FileMeta {
  category: FileCategory;
  label: string;
  color: string;
  iconColor: string;
  bg: string;
}

function getFileMeta(name: string, mime: string): FileMeta {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['txt', 'md', 'csv', 'json', 'html', 'htm', 'js', 'ts', 'tsx', 'jsx', 'py', 'xml', 'yaml', 'yml', 'css', 'sh', 'c', 'cpp', 'java', 'rb', 'go', 'rs', 'sql'].includes(ext) || mime.startsWith('text/'))
    return { category: 'text',    label: ext.toUpperCase() || 'TXT',  color: '#3B82F6', iconColor: 'text-blue-500',   bg: 'bg-blue-50'   };
  if (ext === 'pdf' || mime === 'application/pdf')
    return { category: 'pdf',     label: 'PDF',  color: '#EF4444', iconColor: 'text-red-500',    bg: 'bg-red-50'    };
  if (['doc', 'docx'].includes(ext) || mime.includes('word') || mime.includes('document'))
    return { category: 'word',    label: ext.toUpperCase(),  color: '#2563EB', iconColor: 'text-blue-700',  bg: 'bg-blue-50'   };
  if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint'))
    return { category: 'pptx',    label: ext.toUpperCase(),  color: '#EA580C', iconColor: 'text-orange-600', bg: 'bg-orange-50' };
  if (['xls', 'xlsx', 'ods'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel'))
    return { category: 'excel',   label: ext.toUpperCase(),  color: '#16A34A', iconColor: 'text-green-600',  bg: 'bg-green-50'  };
  return   { category: 'unknown', label: ext.toUpperCase() || 'FILE', color: '#6B7280', iconColor: 'text-gray-500',   bg: 'bg-gray-50'   };
}

function FileIcon({ category, className }: { category: FileCategory; className?: string }) {
  if (category === 'excel') return <FileSpreadsheet size={16} className={className} />;
  if (category === 'pptx')  return <Presentation    size={16} className={className} />;
  if (category === 'unknown') return <File           size={16} className={className} />;
  return <FileText size={16} className={className} />;
}

// ── Text extraction ────────────────────────────────────────────────────────

async function extractText(file: File, category: FileCategory): Promise<string> {
  switch (category) {
    case 'text':
      return file.text();

    case 'pdf': {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const parts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        parts.push(content.items.map((item: { str?: string }) => item.str ?? '').join(' '));
      }
      return parts.join('\n');
    }

    case 'word': {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    case 'pptx': {
      const JSZip = (await import('jszip')).default;
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles = Object.keys(zip.files)
        .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
        .sort((a, b) => {
          const na = parseInt(a.match(/\d+/)?.[0] ?? '0');
          const nb = parseInt(b.match(/\d+/)?.[0] ?? '0');
          return na - nb;
        });
      const parts: string[] = [];
      for (const path of slideFiles) {
        const xml = await zip.files[path].async('text');
        // Extract all <a:t> text nodes (DrawingML text runs)
        const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
        const text = matches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ');
        if (text.trim()) parts.push(text.trim());
      }
      return parts.join('\n');
    }

    case 'excel': {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const parts: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        parts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
      }
      return parts.join('\n\n');
    }

    default:
      return file.text();
  }
}

// ── Text analysis ──────────────────────────────────────────────────────────

function analyzeText(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = content.replace(/\s/g, '').length;
  const sentences = content.split(/[.!?]+/).filter(Boolean).length;
  const avgWordLength = wordCount > 0 ? Math.round((charCount / wordCount) * 10) / 10 : 0;
  const readabilityScore = Math.max(0, Math.min(100, Math.round(100 - (avgWordLength - 4) * 5)));
  const contributionScore = Math.min(100, Math.round((wordCount / Math.max(200, wordCount)) * 100));
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
  const vocabularyRichness = wordCount > 0 ? Math.round((uniqueWords / wordCount) * 100) : 0;
  return { wordCount, charCount, sentences, avgWordLength, readabilityScore, contributionScore, uniqueWords, vocabularyRichness };
}

// ── Constants ──────────────────────────────────────────────────────────────

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];
const MAX_SIZE_MB = 25;
const ACCEPT = '.txt,.md,.csv,.json,.html,.htm,.js,.ts,.tsx,.jsx,.py,.xml,.yaml,.yml,.css,.sh,.sql,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';

// ── Component ──────────────────────────────────────────────────────────────

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedMember, setSelectedMember] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const [dRes, mRes] = await Promise.all([
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('*').order('name'),
    ]);
    if (dRes.data) setDocuments(dRes.data);
    if (mRes.data) setMembers(mRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const processFile = async (file: File) => {
    setError('');
    setUploadStatus('');
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_SIZE_MB} MB.`);
      return;
    }
    const meta = getFileMeta(file.name, file.type);
    setUploading(true);
    try {
      setUploadStatus(`Extracting text from ${meta.label}…`);
      const raw = await extractText(file, meta.category);

      if (!raw.trim()) {
        setError('Could not extract any text from this file. It may be image-only or encrypted.');
        return;
      }

      setUploadStatus('Analysing content…');
      const analysis = analyzeText(raw);

      const { error: err } = await supabase.from('documents').insert({
        name: file.name,
        file_type: file.type || `application/${meta.category}`,
        file_size: file.size,
        content: raw.slice(0, 5000),
        word_count: analysis.wordCount,
        char_count: analysis.charCount,
        member_id: selectedMember || null,
        analysis_result: { ...analysis, fileCategory: meta.category },
      });
      if (err) throw err;
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('documents').delete().eq('id', id);
    setDocuments((d) => d.filter((x) => x.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  const getMemberName = (id: string | null | undefined) => {
    if (!id) return 'Unassigned';
    return members.find((m) => m.id === id)?.name ?? 'Unknown';
  };

  const totalWords = documents.reduce((s, d) => s + d.word_count, 0);

  const memberWordCounts = members.map((m, i) => {
    const docs = documents.filter((d) => d.member_id === m.id);
    return { name: m.name, words: docs.reduce((s, d) => s + d.word_count, 0), color: COLORS[i % COLORS.length], docs: docs.length };
  }).filter((m) => m.words > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Documents</h2>
          <p className="text-sm text-gray-500 mt-0.5">{documents.length} documents, {totalWords.toLocaleString()} total words</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload + List */}
        <div className="lg:col-span-2 space-y-4">

          {/* Upload Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              uploading ? 'cursor-default opacity-80' : 'cursor-pointer'
            } ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}
          >
            <input ref={fileRef} type="file" accept={ACCEPT} onChange={handleFileChange} className="hidden" />
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-blue-500">
                <Loader size={28} className="animate-spin" />
                <p className="text-sm font-medium">{uploadStatus || 'Processing…'}</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload size={22} className="text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Drag & drop a file, or click to browse</p>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Text &amp; code &nbsp;·&nbsp; PDF &nbsp;·&nbsp; Word (.doc, .docx) &nbsp;·&nbsp; PowerPoint (.ppt, .pptx) &nbsp;·&nbsp; Excel (.xls, .xlsx)<br />
                  Max {MAX_SIZE_MB} MB
                </p>

                {/* Format badges */}
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {[
                    { label: 'PDF',  bg: 'bg-red-50',     text: 'text-red-600'   },
                    { label: 'DOCX', bg: 'bg-blue-50',    text: 'text-blue-700'  },
                    { label: 'PPTX', bg: 'bg-orange-50',  text: 'text-orange-600'},
                    { label: 'XLSX', bg: 'bg-green-50',   text: 'text-green-700' },
                    { label: 'TXT',  bg: 'bg-gray-100',   text: 'text-gray-600'  },
                    { label: 'MD',   bg: 'bg-gray-100',   text: 'text-gray-600'  },
                    { label: 'CSV',  bg: 'bg-gray-100',   text: 'text-gray-600'  },
                    { label: 'JSON', bg: 'bg-amber-50',   text: 'text-amber-700' },
                    { label: 'PY',   bg: 'bg-sky-50',     text: 'text-sky-700'   },
                    { label: '+ more', bg: 'bg-gray-50',  text: 'text-gray-400'  },
                  ].map((b) => (
                    <span key={b.label} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.bg} ${b.text}`}>{b.label}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Assign member */}
          <div className="flex items-center gap-3">
            <Users size={15} className="text-gray-400 flex-shrink-0" />
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Assign to member (optional)</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Document List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <FileText size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                const analysis = doc.analysis_result as { contributionScore?: number; fileCategory?: string };
                const meta = getFileMeta(doc.name, doc.file_type ?? '');
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(isSelected ? null : doc)}
                    className={`w-full text-left bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all ${
                      isSelected ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 ${meta.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <FileIcon category={meta.category} className={meta.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{doc.name}</p>
                            <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5"
                              style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                              {meta.label}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                            className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                          <span>{doc.word_count.toLocaleString()} words</span>
                          <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                          <span className="text-blue-600 font-medium">{getMemberName(doc.member_id)}</span>
                          {analysis.contributionScore !== undefined && (
                            <span className="text-green-600 font-medium">Score: {analysis.contributionScore}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Analysis Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-blue-500" />
              Writing Contributions
            </h3>
            {memberWordCounts.length > 0 ? (
              <div className="space-y-3">
                {memberWordCounts.map((m, i) => {
                  const pct = totalWords > 0 ? Math.round((m.words / totalWords) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{m.name}</span>
                        <span className="text-gray-500">{m.words.toLocaleString()} words ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: m.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">Upload documents and assign to members to see analysis</p>
            )}
          </div>

          {selectedDoc ? (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              {(() => {
                const meta = getFileMeta(selectedDoc.name, selectedDoc.file_type ?? '');
                const a = selectedDoc.analysis_result as {
                  wordCount?: number; charCount?: number; sentences?: number;
                  avgWordLength?: number; readabilityScore?: number;
                  contributionScore?: number; uniqueWords?: number;
                  vocabularyRichness?: number;
                };
                const metrics = [
                  { label: 'Words',              value: a.wordCount?.toLocaleString() ?? '—' },
                  { label: 'Characters',          value: a.charCount?.toLocaleString() ?? '—' },
                  { label: 'Sentences',           value: a.sentences ?? '—' },
                  { label: 'Avg Word Length',     value: a.avgWordLength ?? '—' },
                  { label: 'Unique Words',        value: a.uniqueWords?.toLocaleString() ?? '—' },
                  { label: 'Vocabulary Richness', value: `${a.vocabularyRichness ?? 0}%` },
                ];
                return (
                  <>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`w-8 h-8 ${meta.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <FileIcon category={meta.category} className={meta.iconColor} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{selectedDoc.name}</h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {metrics.map((m, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-gray-500">{m.label}</p>
                          <p className="font-bold text-gray-900 text-sm mt-0.5">{m.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Readability', value: a.readabilityScore ?? 0, color: '#10B981' },
                        { label: 'Contribution', value: a.contributionScore ?? 0, color: '#3B82F6' },
                      ].map((s, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">{s.label} Score</span>
                            <span className="font-semibold" style={{ color: s.color }}>{s.value}/100</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${s.value}%`, backgroundColor: s.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2.5 rounded-xl">
                      <CheckCircle size={13} />
                      Assigned to: {getMemberName(selectedDoc.member_id)}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 text-center">
              <FileText size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Click a document to view its analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
