import nodemailer from "nodemailer";

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
      html,
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
