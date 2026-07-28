import { supabase } from './supabase';

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// The member-biometrics bucket is private (see the
// 20260429010200_private_biometrics_storage migration). members.face_image_url
// and members.voice_sample_url store the *object path* inside that bucket,
// not a public URL — this resolves a path to a short-lived signed URL for
// actually displaying the image/audio.
export async function getBiometricSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  // Back-compat: older rows saved before this fix may still contain a full
  // public URL rather than a bare path. Those are now 404s (bucket is
  // private), so treat them as absent rather than trying to sign them.
  if (/^https?:\/\//i.test(path)) return null;

  const { data, error } = await supabase.storage
    .from('member-biometrics')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}
