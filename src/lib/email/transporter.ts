import nodemailer from "nodemailer";

function wrapCivicEmailHtml(innerHtml: string) {
  const safeInner = innerHtml && innerHtml.trim().length > 0 ? innerHtml : "<p></p>";

  return [
    `<!DOCTYPE html>`,
    `<html>`,
    `<body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">`,
    `<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">`,
    `<div style="background-color: #ffffff; padding: 24px 24px 0 24px;">`,
    `<h2 style="color: #0f172a; margin: 0 0 4px 0; font-size: 20px; font-weight: 600;">Official Civic Request</h2>`,
    `<p style="color: #64748b; margin: 0; font-size: 14px;">via Neta.ink</p>`,
    `</div>`,
    `<div style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.6;">`,
    safeInner,
    `</div>`,
    `<div style="padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">`,
    `<p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">This document was legally drafted and digitally verified via the Neta.ink civic accountability platform.</p>`,
    `</div>`,
    `</div>`,
    `</body>`,
    `</html>`
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
