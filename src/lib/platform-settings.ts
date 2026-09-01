/**
 * Client-side data access for PCx Platform > Settings (KAN-108). Server reads
 * use apiGet<PlatformSettings>('/platform/settings') directly in the page;
 * mutations below post to the same-origin /api proxy and return a discriminated
 * union (never throw) so the view can render inline success/error states —
 * matching the pattern in lib/users.ts.
 */

export interface PlatformSettings {
  senderDisplayName: string;
  senderEmail: string;
  replyToEmail: string | null;
  defaultTimeZone: string;
  emailFooterHtml: string | null;
  testEmailRecipient: string | null;
  defaultPrimaryColor: string | null;
  defaultLogoUrl: string | null;
  /** Sending domains a sender email may use — shown to explain the rule. */
  verifiedDomains: string[];
  updatedAt: string;
}

export interface UpdatePlatformSettingsPayload {
  senderDisplayName?: string;
  senderEmail?: string;
  replyToEmail?: string | null;
  defaultTimeZone?: string;
  emailFooterHtml?: string | null;
  testEmailRecipient?: string | null;
  defaultPrimaryColor?: string | null;
  defaultLogoUrl?: string | null;
}

export interface SendTestEmailPayload {
  testEmailRecipient?: string;
  senderDisplayName?: string;
  senderEmail?: string;
  replyToEmail?: string | null;
  emailFooterHtml?: string | null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; message: string };
type SimpleResult = { ok: true } | { ok: false; message: string };

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { message?: unknown };
  if (typeof body.message === 'string') return body.message;
  if (Array.isArray(body.message)) return body.message.join(', ');
  return fallback;
}

export async function updatePlatformSettings(
  payload: UpdatePlatformSettingsPayload,
): Promise<Result<{ settings: PlatformSettings }>> {
  try {
    const res = await fetch('/api/platform/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, message: await errorMessage(res, 'Failed to save changes.') };
    }
    return { ok: true, settings: (await res.json()) as PlatformSettings };
  } catch {
    return { ok: false, message: 'Failed to save changes. Please try again.' };
  }
}

export async function sendTestEmail(
  payload: SendTestEmailPayload,
): Promise<SimpleResult> {
  try {
    const res = await fetch('/api/platform/settings/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, message: await errorMessage(res, 'The test email could not be sent.') };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'The test email could not be sent. Please try again.' };
  }
}

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

export async function uploadPlatformLogo(
  file: File,
): Promise<Result<{ publicUrl: string }>> {
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return { ok: false, message: 'Please upload a PNG, JPG, SVG, or WEBP image.' };
  }
  try {
    const res = await fetch('/api/platform/settings/logo-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ contentType: file.type }),
    });
    if (!res.ok) return { ok: false, message: 'Could not get an upload URL.' };
    const { uploadUrl, publicUrl } = (await res.json()) as {
      uploadUrl: string;
      publicUrl: string;
    };
    const s3Res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!s3Res.ok) return { ok: false, message: 'Upload to S3 failed.' };
    return { ok: true, publicUrl };
  } catch {
    return { ok: false, message: 'Upload failed. Please try again.' };
  }
}
