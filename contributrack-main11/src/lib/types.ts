export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  device_id?: string | null;
  device_secret?: string | null;
  avatar_color: string;
  face_image_url?: string | null;
  voice_sample_url?: string | null;
  voice_label?: string | null;
  face_label?: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  started_at: string;
  ended_at?: string | null;
  created_at: string;
}

export interface IotData {
  id: string;
  device_id: string;
  member_id?: string | null;
  voice: number;
  face: number;
  session_id?: string | null;
  contribution_level: 'HIGH' | 'MEDIUM' | 'LOW';
  contribution_pct: number;
  transcript?: string | null;
  voice_quality?: 'PRODUCTIVE' | 'NEUTRAL' | 'OFF_TOPIC' | 'DISRUPTIVE' | null;
  voice_quality_score?: number | null;
  face_expression?: 'ENGAGED' | 'FOCUSED' | 'DISTRACTED' | 'DROWSY' | 'NEUTRAL' | 'ABSENT' | null;
  engagement_score?: number | null;
  is_actively_engaged?: boolean | null;
  passive_presence?: boolean | null;
  voice_sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null;
  detected_language?: string | null;
  voice_topics?: string[] | null;
  voice_flags?: string[] | null;
  voice_summary?: string | null;
  created_at: string;
  members?: { name: string; email: string } | null;
}

export interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  content: string;
  word_count: number;
  char_count: number;
  member_id?: string | null;
  analysis_result: Record<string, unknown>;
  created_at: string;
}

export interface AiInsight {
  id: string;
  member_id: string;
  session_id: string | null;
  overall_score: number;
  engagement_level: 'HIGH' | 'MEDIUM' | 'LOW';
  voice_score: number;
  presence_score: number;
  writing_score: number;
  consistency_score: number;
  narrative: string;
  strengths: string[];
  improvements: string[];
  reading_count: number;
  word_count: number;
  doc_count: number;
  session_duration_minutes: number;
  active_time_minutes: number;
  contribution_pct: number;
  voice_content_score?: number;
  created_at: string;
}

export interface SessionMember {
  id: string;
  session_id: string;
  member_id: string;
  joined_at: string;
  members?: { id: string; name: string; email: string; role: string; avatar_color: string } | null;
  sessions?: { id: string; title: string; status: string } | null;
}

export type Page =
  | 'landing'
  | 'login'
  | 'dashboard'
  | 'members'
  | 'sessions'
  | 'documents'
  | 'settings'
  | 'iot';
