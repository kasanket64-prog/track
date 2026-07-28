import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IotReading {
  voice: number;
  face: number;
  face_expression: string | null;
  engagement_score: number | null;
  is_actively_engaged: boolean | null;
  passive_presence: boolean | null;
  contribution_level: string;
  created_at: string;
  session_id: string | null;
  transcript: string | null;
  voice_quality: string | null;
  voice_quality_score: number | null;
  voice_sentiment: string | null;
  voice_topics: string[] | null;
  voice_flags: string[] | null;
  voice_summary: string | null;
}

interface SessionRow {
  id: string;
  title: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

interface DocRow {
  word_count: number;
  char_count: number;
  name: string;
  content: string;
  analysis_result: Record<string, unknown>;
}

interface MemberData {
  id: string;
  name: string;
  role: string;
  readings: IotReading[];
  docs: DocRow[];
  sessions: SessionRow[];
}

function sessionDurationMinutes(session: SessionRow): number {
  const start = new Date(session.started_at).getTime();
  const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  return Math.round((end - start) / 60000);
}

function activeTimeMinutes(readings: IotReading[]): number {
  // Each IoT reading represents a ~30-second interval window
  // Only count as "active" if genuinely engaged (not just face detected while sleeping)
  const activeReadings = readings.filter((r) => r.is_actively_engaged === true || r.voice === 1).length;
  return Math.round((activeReadings * 30) / 60);
}

function passiveTimeMinutes(readings: IotReading[]): number {
  const passiveReadings = readings.filter((r) => r.passive_presence === true).length;
  return Math.round((passiveReadings * 30) / 60);
}

function avgEngagementScore(readings: IotReading[]): number {
  const withScore = readings.filter((r) => r.engagement_score !== null);
  if (withScore.length === 0) return 0;
  return Math.round(withScore.reduce((s, r) => s + (r.engagement_score ?? 0), 0) / withScore.length);
}

async function analyseWithClaude(
  member: MemberData,
  allMembers: MemberData[],
  allSessions: SessionRow[],
  client: Anthropic
): Promise<Record<string, unknown>> {
  const n = member.readings.length;
  const totalWords = member.docs.reduce((s, d) => s + (d.word_count ?? 0), 0);
  const totalChars = member.docs.reduce((s, d) => s + (d.char_count ?? 0), 0);
  const docCount = member.docs.length;

  // Session duration: sum of all sessions this member has readings in
  const memberSessionIds = new Set(member.readings.map((r) => r.session_id).filter(Boolean));
  const memberSessions = allSessions.filter((s) => memberSessionIds.has(s.id));
  const totalSessionMinutes = memberSessions.reduce((s, sess) => s + sessionDurationMinutes(sess), 0);
  const activeMinutes = activeTimeMinutes(member.readings);
  const passiveMinutes = passiveTimeMinutes(member.readings);
  const avgEngagement = avgEngagementScore(member.readings);

  // Voice analysis
  const voiceReadings = member.readings.filter((r) => r.voice === 1).length;
  const voicePct = n > 0 ? Math.round((voiceReadings / n) * 100) : 0;

  // Presence analysis
  const faceReadings = member.readings.filter((r) => r.face === 1).length;
  const facePct = n > 0 ? Math.round((faceReadings / n) * 100) : 0;

  // Face expression breakdown
  const exprCounts = {
    ENGAGED:    member.readings.filter((r) => r.face_expression === "ENGAGED").length,
    FOCUSED:    member.readings.filter((r) => r.face_expression === "FOCUSED").length,
    NEUTRAL:    member.readings.filter((r) => r.face_expression === "NEUTRAL").length,
    DISTRACTED: member.readings.filter((r) => r.face_expression === "DISTRACTED").length,
    DROWSY:     member.readings.filter((r) => r.face_expression === "DROWSY").length,
    ABSENT:     member.readings.filter((r) => r.face_expression === "ABSENT").length,
  };
  const drowsyMinutes     = Math.round((exprCounts.DROWSY * 30) / 60);
  const distractedMinutes = Math.round((exprCounts.DISTRACTED * 30) / 60);
  const engagedMinutes    = Math.round((exprCounts.ENGAGED * 30) / 60);
  const focusedMinutes    = Math.round((exprCounts.FOCUSED * 30) / 60);

  // Both voice AND face simultaneously
  const bothReadings = member.readings.filter((r) => r.voice === 1 && r.face === 1).length;

  // HIGH/MEDIUM/LOW breakdown
  const highReadings = member.readings.filter((r) => r.contribution_level === "HIGH").length;
  const mediumReadings = member.readings.filter((r) => r.contribution_level === "MEDIUM").length;
  const lowReadings = member.readings.filter((r) => r.contribution_level === "LOW").length;

  // Voice content quality analysis (from real-time transcript analysis)
  const readingsWithTranscript = member.readings.filter((r) => r.transcript && r.voice_quality);
  const transcriptCount = readingsWithTranscript.length;
  const avgVoiceQualityScore = transcriptCount > 0
    ? Math.round(readingsWithTranscript.reduce((s, r) => s + (r.voice_quality_score ?? 50), 0) / transcriptCount)
    : null;
  const productiveCount = readingsWithTranscript.filter((r) => r.voice_quality === "PRODUCTIVE").length;
  const neutralCount = readingsWithTranscript.filter((r) => r.voice_quality === "NEUTRAL").length;
  const offTopicCount = readingsWithTranscript.filter((r) => r.voice_quality === "OFF_TOPIC").length;
  const disruptiveCount = readingsWithTranscript.filter((r) => r.voice_quality === "DISRUPTIVE").length;
  const positiveCount = readingsWithTranscript.filter((r) => r.voice_sentiment === "POSITIVE").length;
  const negativeCount = readingsWithTranscript.filter((r) => r.voice_sentiment === "NEGATIVE").length;

  // Collect all flags across readings
  const allFlags = readingsWithTranscript.flatMap((r) => r.voice_flags ?? []);
  const flagCounts: Record<string, number> = {};
  for (const f of allFlags) flagCounts[f] = (flagCounts[f] ?? 0) + 1;
  const topFlags = Object.entries(flagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, c]) => `${f} (×${c})`);

  // All unique topics mentioned
  const allTopics = [...new Set(readingsWithTranscript.flatMap((r) => r.voice_topics ?? []))].slice(0, 10);

  // Sample transcripts (last 5 with quality info)
  const transcriptSamples = readingsWithTranscript.slice(-5).map((r) => ({
    said: r.transcript,
    quality: r.voice_quality,
    score: r.voice_quality_score,
    sentiment: r.voice_sentiment,
    summary: r.voice_summary,
  }));

  // Reading timeline with expression + engagement data
  const readingTimeline = member.readings.slice(-20).map((r) => ({
    time: new Date(r.created_at).toISOString(),
    voice: r.voice,
    face: r.face,
    expression: r.face_expression ?? "NEUTRAL",
    engagementScore: r.engagement_score ?? null,
    activelyEngaged: r.is_actively_engaged ?? false,
    passivePresence: r.passive_presence ?? false,
    level: r.contribution_level,
    ...(r.voice_quality ? { voiceQuality: r.voice_quality, voiceScore: r.voice_quality_score } : {}),
  }));

  // Document detail
  const docSummary = member.docs.map((d) => ({
    name: d.name,
    words: d.word_count,
    chars: d.char_count,
    readability: (d.analysis_result as Record<string, unknown>)?.readabilityScore ?? null,
    vocabulary: (d.analysis_result as Record<string, unknown>)?.vocabularyRichness ?? null,
  }));

  // Group comparison
  const groupStats = allMembers.map((m) => ({
    name: m.name,
    role: m.role,
    totalReadings: m.readings.length,
    voicePct: m.readings.length > 0 ? Math.round((m.readings.filter((r) => r.voice === 1).length / m.readings.length) * 100) : 0,
    facePct: m.readings.length > 0 ? Math.round((m.readings.filter((r) => r.face === 1).length / m.readings.length) * 100) : 0,
    totalWords: m.docs.reduce((s, d) => s + d.word_count, 0),
    docCount: m.docs.length,
    activeMinutes: activeTimeMinutes(m.readings),
  }));

  const groupAvgWords = groupStats.length > 0
    ? Math.round(groupStats.reduce((s, m) => s + m.totalWords, 0) / groupStats.length)
    : 0;
  const groupAvgActiveMinutes = groupStats.length > 0
    ? Math.round(groupStats.reduce((s, m) => s + m.activeMinutes, 0) / groupStats.length)
    : 0;

  const prompt = `You are an AI system analysing group contribution data from an IoT-enabled collaborative workspace with real-time voice and facial engagement intelligence. Analyse the member below and return a JSON object with contribution scores and insights.

## Member: ${member.name} (${member.role})

### IoT Sensor Data
- Total sensor readings: ${n}
- Voice active: ${voiceReadings} readings (${voicePct}% of time)
- Face detected (present): ${faceReadings} readings (${facePct}% of time)
- Both voice AND face simultaneously: ${bothReadings} readings
- Contribution levels — HIGH: ${highReadings}, MEDIUM: ${mediumReadings}, LOW: ${lowReadings}

### Face Expression Intelligence (camera analysis)
- ENGAGED (alert, eye contact, attentive in discussion): ${exprCounts.ENGAGED} readings = ${engagedMinutes} mins
- FOCUSED (looking down at laptop/notebook — working silently): ${exprCounts.FOCUSED} readings = ${focusedMinutes} mins
- NEUTRAL (face present, no strong signal): ${exprCounts.NEUTRAL} readings
- DISTRACTED (looking away from work, on phone): ${exprCounts.DISTRACTED} readings = ${distractedMinutes} mins
- DROWSY (eyes drooping, half-asleep, sleeping): ${exprCounts.DROWSY} readings = ${drowsyMinutes} mins
- ABSENT (not visible): ${exprCounts.ABSENT} readings
NOTE: FOCUSED is a POSITIVE state — members working on laptops are contributing even without eye contact with the camera. Do NOT penalise FOCUSED time.
- Average engagement score (0-100): ${avgEngagement}
- True active time (genuinely engaged): ${activeMinutes} mins
- Passive presence (face detected but disengaged/sleeping/distracted): ${passiveMinutes} mins
${drowsyMinutes > 0 ? `⚠ DROWSY ALERT: ${member.name} appeared drowsy/sleeping for ${drowsyMinutes} minutes` : ""}
${distractedMinutes > 5 ? `⚠ DISTRACTED: ${member.name} appeared distracted for ${distractedMinutes} minutes` : ""}

### Voice Content Intelligence (AI-analysed transcripts)
- Readings with transcript analysis: ${transcriptCount} of ${voiceReadings} voice readings
${transcriptCount > 0 ? `- Average voice quality score: ${avgVoiceQualityScore}/100
- Quality breakdown — PRODUCTIVE: ${productiveCount}, NEUTRAL: ${neutralCount}, OFF_TOPIC: ${offTopicCount}, DISRUPTIVE: ${disruptiveCount}
- Sentiment breakdown — POSITIVE: ${positiveCount}, NEGATIVE: ${negativeCount}, NEUTRAL: ${transcriptCount - positiveCount - negativeCount}
- Recurring behaviour flags: ${topFlags.length > 0 ? topFlags.join(", ") : "none"}
- Topics discussed: ${allTopics.length > 0 ? allTopics.join(", ") : "none detected"}
- Sample transcript analysis (most recent 5):
${JSON.stringify(transcriptSamples, null, 2)}` : "- No transcript data available for this member yet"}

### Time Duration
- Total session time (sessions member appeared in): ${totalSessionMinutes} minutes
- True active participation time (engaged, not just present): ${activeMinutes} minutes
- Passive presence time (face detected but drowsy/distracted): ${passiveMinutes} minutes
- Active participation rate: ${totalSessionMinutes > 0 ? Math.round((activeMinutes / totalSessionMinutes) * 100) : 0}% of session time

### Recent Reading Timeline (last 20 readings, chronological)
${JSON.stringify(readingTimeline, null, 2)}

### Document Contributions
- Documents submitted: ${docCount}
- Total words written: ${totalWords.toLocaleString()}
- Total characters: ${totalChars.toLocaleString()}
- Documents detail: ${JSON.stringify(docSummary, null, 2)}

### Group Comparison
- Group average words written: ${groupAvgWords.toLocaleString()}
- Group average active minutes: ${groupAvgActiveMinutes}
- ${member.name}'s words vs group avg: ${groupAvgWords > 0 ? Math.round((totalWords / groupAvgWords) * 100) : 0}%
- ${member.name}'s active time vs group avg: ${groupAvgActiveMinutes > 0 ? Math.round((activeMinutes / groupAvgActiveMinutes) * 100) : 0}%
- All members summary: ${JSON.stringify(groupStats, null, 2)}

---

## Task
Based on ALL the data above — voice content quality, FACIAL ENGAGEMENT (drowsy/distracted/engaged from camera), physical presence, active vs passive time, documents, and group comparison — analyse ${member.name}'s true contribution.

KEY RULES:
1. Face detected but DROWSY = present but NOT contributing. Drowsy minutes should heavily penalise presence_score.
2. Face detected but DISTRACTED = partial credit only.
3. passive_presence time (present but disengaged) does NOT count as active participation.
4. A member who sat in the session sleeping for most of it should have a LOW overall score even if face was always detected.
5. Voice content quality still matters — saying nothing useful while being awake is also low value.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:

{
  "overall_score": <integer 0-100, holistic weighted assessment>,
  "engagement_level": <"HIGH" | "MEDIUM" | "LOW">,
  "voice_score": <integer 0-100, weighted by BOTH frequency AND content quality>,
  "presence_score": <integer 0-100 — PENALISED for drowsy/distracted time; face=1 while sleeping should score much lower than face=1 while engaged>,
  "writing_score": <integer 0-100>,
  "consistency_score": <integer 0-100 — heavily penalised if drowsy/distracted patterns appear repeatedly>,
  "active_time_score": <integer 0-100, based on TRUE active minutes, not just face-detected minutes>,
  "voice_content_score": <integer 0-100, pure content quality — 0 if no transcripts>,
  "narrative": <4-6 sentences explicitly covering: how engaged they were (drowsy/distracted/alert), how long they were truly active vs passively present, what they said if transcripts exist, documents, group comparison. Be direct — if someone slept through the session, say so clearly>,
  "strengths": <array of 2-4 specific strengths grounded in actual data — omit presence as a strength if they were drowsy>,
  "improvements": <array of 2-4 actionable improvements — must include "stay alert and avoid drowsiness" if drowsy time > 5 mins, "reduce distraction" if distracted time > 10 mins>,
  "contribution_pct": <integer 0-100, true share of group contribution — sleeping/distracted members get significantly penalised>
}

Scoring guidance:
- presence_score: start from facePct, then subtract (drowsyMinutes/totalSessionMinutes × 80) and (distractedMinutes/totalSessionMinutes × 40) — a person sleeping half the session gets presence_score ≤ 25
- active_time_score: activeMinutes (genuinely engaged) ÷ totalSessionMinutes × 100
- voice_score: (voicePct × 0.4) + (avgVoiceQualityScore × 0.6) if transcripts, else voicePct × 0.6
- voice_content_score: PRODUCTIVE=100, NEUTRAL=55, OFF_TOPIC=20, DISRUPTIVE=0 — weighted average
- writing_score: 0 words→0, at group avg→60, 2× group avg→100
- consistency_score: penalise heavily for drowsy/distracted episodes; a consistently drowsy member scores ≤ 20
- overall_score: voice 18% + voice_content 12% + presence 20% + active_time 20% + writing 15% + consistency 15%
- engagement_level: HIGH ≥ 70, MEDIUM ≥ 40, LOW < 40
- contribution_pct: proportional to true engagement; drowsy/passive members get penalised sharply`;

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1200,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");

  const raw = textBlock.text.trim().replace(/^```json\s*/m, "").replace(/```\s*$/m, "");
  return JSON.parse(raw);
}

// ── Edge function handler ───────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // This handler queries and writes with the SERVICE ROLE key (needed so
    // it can read across all members/sessions), which bypasses RLS. The
    // function itself only requires the public anon key to invoke at all,
    // so without this check anyone holding that (client-bundled, non-secret)
    // key could trigger analysis and read back every member's narrative,
    // strengths/improvements, and sampled transcripts in the response.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claude = new Anthropic({ apiKey: anthropicKey });
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id") ?? undefined;

    // ── Fetch all data in parallel ──────────────────────────────────────────
    const [membersRes, iotRes, docsRes, sessionsRes] = await Promise.all([
      supabase.from("members").select("id, name, role").order("created_at"),
      (() => {
        let q = supabase
          .from("iot_data")
          .select("member_id, voice, face, face_expression, engagement_score, is_actively_engaged, passive_presence, contribution_level, created_at, session_id, transcript, voice_quality, voice_quality_score, voice_sentiment, voice_topics, voice_flags, voice_summary")
          .order("created_at");
        if (sessionId) q = q.eq("session_id", sessionId);
        return q;
      })(),
      supabase
        .from("documents")
        .select("member_id, word_count, char_count, name, content, analysis_result"),
      supabase
        .from("sessions")
        .select("id, title, status, started_at, ended_at"),
    ]);

    if (membersRes.error) throw membersRes.error;
    if (iotRes.error) throw iotRes.error;
    if (docsRes.error) throw docsRes.error;
    if (sessionsRes.error) throw sessionsRes.error;

    const members = membersRes.data ?? [];
    const iotData = iotRes.data ?? [];
    const docs = docsRes.data ?? [];
    const allSessions = sessionsRes.data ?? [];

    // ── Build per-member structures ─────────────────────────────────────────
    const memberData: MemberData[] = members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      readings: iotData.filter((r) => r.member_id === m.id),
      docs: docs.filter((d) => d.member_id === m.id),
      sessions: allSessions,
    }));

    // ── Run Claude analysis for each member sequentially ───────────────────
    // clamp() guards against NaN: if Claude ever returns a non-numeric or
    // missing field, `v ?? 0` does NOT catch NaN (nullish coalescing only
    // catches null/undefined), so a stray NaN used to reach the DB insert
    // and violate the ai_insights CHECK (0-100) constraint, throwing and
    // aborting the whole request — after other members' rows had already
    // been deleted below. Number.isFinite(v) closes that gap.
    const clamp = (v: unknown) => {
      const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
      return Math.max(0, Math.min(100, Math.round(n)));
    };

    const insights = [];
    for (const member of memberData) {
      let analysis: Record<string, unknown>;
      try {
        analysis = await analyseWithClaude(member, memberData, allSessions, claude);
      } catch {
        // Fallback: zero scores with error narrative
        analysis = {
          overall_score: 0,
          engagement_level: "LOW",
          voice_score: 0,
          presence_score: 0,
          writing_score: 0,
          consistency_score: 0,
          active_time_score: 0,
          narrative: `Analysis unavailable for ${member.name}. Please check the API configuration.`,
          strengths: ["No data available"],
          improvements: ["Ensure IoT device is linked and sending data"],
          contribution_pct: 0,
        };
      }

      const memberSessionIds = new Set(member.readings.map((r) => r.session_id).filter(Boolean));
      const memberSessions = allSessions.filter((s) => memberSessionIds.has(s.id));
      const totalSessionMinutes = memberSessions.reduce((s, sess) => s + sessionDurationMinutes(sess), 0);
      const activeMinutes = activeTimeMinutes(member.readings);

      insights.push({
        member_id: member.id,
        session_id: sessionId ?? null,
        overall_score: clamp(analysis.overall_score as number),
        engagement_level: (analysis.engagement_level as string) ?? "LOW",
        voice_score: clamp(analysis.voice_score as number),
        presence_score: clamp(analysis.presence_score as number),
        writing_score: clamp(analysis.writing_score as number),
        consistency_score: clamp(analysis.consistency_score as number),
        voice_content_score: clamp(analysis.voice_content_score as number),
        narrative: (analysis.narrative as string) ?? "",
        strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
        improvements: Array.isArray(analysis.improvements) ? analysis.improvements : [],
        reading_count: member.readings.length,
        word_count: member.docs.reduce((s, d) => s + (d.word_count ?? 0), 0),
        doc_count: member.docs.length,
        session_duration_minutes: totalSessionMinutes,
        active_time_minutes: activeMinutes,
        contribution_pct: clamp(analysis.contribution_pct as number),
      });
    }

    // ── Upsert to ai_insights ───────────────────────────────────────────────
    // Each member is handled independently and wrapped in its own try/catch:
    // previously a single insert failure (e.g. a bad value tripping a CHECK
    // constraint) threw out of the loop entirely, but the delete() for that
    // row — and any earlier members already processed — had already run,
    // so a single bad response could leave several members with NO insight
    // row at all instead of their previous one. Now a per-member failure
    // only skips that member and is reported back, everyone else still
    // gets a fresh row.
    const failures: { member_id: string; error: string }[] = [];
    for (const insight of insights) {
      try {
        const { error: delErr } = await supabase
          .from("ai_insights")
          .delete()
          .eq("member_id", insight.member_id)
          .is("session_id", insight.session_id ?? null);
        if (delErr) throw delErr;

        const { error: insErr } = await supabase.from("ai_insights").insert(insight);
        if (insErr) throw insErr;
      } catch (err) {
        failures.push({ member_id: insight.member_id, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, insights, failures: failures.length ? failures : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
