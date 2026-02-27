import nodemailer from "nodemailer";

function wrapCivicEmailHtml(innerHtml: string) {
  const safeInner = innerHtml && innerHtml.trim().length > 0 ? innerHtml : "<p></p>";

  return [
    `<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background: #f8fafc; padding: 24px;">`,
    `<div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">`,
    `<div style="padding: 20px 20px 0 20px;">`,
    `<h2 style="color: #0f172a; margin: 0 0 12px 0;">Official Civic Request via Neta.ink</h2>`,
    `</div>`,
    `<div style="padding: 0 20px 16px 20px; color: #0f172a; font-size: 14px; line-height: 1.6;">`,
    safeInner,
    `</div>`,
    `<div style="padding: 0 20px 20px 20px;">`,
    `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 12px 0;" />`,
    `<p style="color: #64748b; font-size: 12px; margin: 0;">This document was legally drafted and digitally verified via the Neta.ink civic accountability platform.</p>`,
    `</div>`,
    `</div>`,
    `</div>`
  ].join("\n");
}

export async function sendCivicEmail(to: string, cc: string[], subject: string, html: string, attachments?: any[]) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("SMTP credentials missing. Email was not sent.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"NetaInk Civic Engine" <${user}>`,
      to,
      cc,
      subject,
      html: wrapCivicEmailHtml(html),
      attachments,
    });
    return true;
  } catch (error) {
    console.error("SMTP Error:", error);
    return false;
  }
}

// Added for backward compatibility
export async function sendEmail(options: {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  attachments?: any[];
}) {
  return sendCivicEmail(
    options.to,
    options.cc || [],
    options.subject,
    options.html,
    options.attachments
  );
}
