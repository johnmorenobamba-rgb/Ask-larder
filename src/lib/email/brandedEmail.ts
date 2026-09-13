// Larder's branded transactional-email shell, per the Branding Kit (Ink /
// Parchment / Preserve Red / Saffron / Bay Green / Clay Brown). Table-based
// HTML with inline styles, no external images or web fonts -- both are
// unreliable across real inboxes (Outlook desktop strips webfonts, many
// clients block remote images by default), so the wordmark is styled text
// and type falls back to system serif/sans stacks that read close to
// Fraunces/Inter without depending on anything loading.
//
// This exact function is duplicated (not imported) into
// supabase/functions/cert-nudge/index.ts and
// supabase/functions/weekly-digest/index.ts, which run in Deno and can't
// import a Next.js server module -- same cross-runtime convention already
// used for src/lib/reports/weeklyDigest.ts's query logic. Keep all three in
// sync by hand if this shell ever changes.

export interface BrandedEmailOptions {
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

// Exported so every call site escapes dynamic values (venue/staff names,
// user-submitted form text) before interpolating them into bodyHtml --
// bodyHtml itself is inserted as raw HTML by design (it's static markup this
// codebase writes), but anything variable inside it must go through this
// first.
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderBrandedEmailHtml({ heading, bodyHtml, ctaLabel, ctaUrl }: BrandedEmailOptions): string {
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:8px 0 28px 0;">
           <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background-color:#B23A2C;color:#F2E9D8;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:999px;">${escapeHtml(ctaLabel)}</a>
         </td></tr>`
      : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#F2E9D8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2E9D8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:20px;border-bottom:3px solid #E8A93B;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:24px;color:#1F1B16;">Larder</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 0 4px 0;">
                <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#1F1B16;margin:0 0 16px 0;">${escapeHtml(heading)}</h1>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1F1B16;">${bodyHtml}</div>
              </td>
            </tr>
            ${ctaBlock}
            <tr>
              <td style="padding-top:28px;border-top:1px solid rgba(122,92,67,0.3);">
                <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7A5C43;margin:0;">Larder, staff onboarding and training built from your own SOPs.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
