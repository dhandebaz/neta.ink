import nodemailer from "nodemailer";

type SendEmailOptions = {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  attachments?: any[];
};

export async function sendEmail(options: SendEmailOptions) {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user) {
    console.warn("SMTP not configured; email payload:", {
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments
    });
    return;
  }

  const portNumber = portRaw ? Number(portRaw) : 587;
  const secure = portNumber === 465;

  const transporter = nodemailer.createTransport({
    host,
    port: portNumber,
    secure,
    auth: pass
      ? {
          user,
          pass
        }
      : undefined
  });

  try {
    await transporter.sendMail({
      from: user,
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments
    });
  } catch (error) {
    console.error("Error sending email", error);
  }
}

