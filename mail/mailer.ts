import * as nodemailer from "nodemailer";

type EmailConfig = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
};

export async function sendEmail({ to, subject, html, text = "" }: EmailConfig) {
  return new Promise(async (resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      auth: {
        user: process.env.EMAIL as string,
        pass: process.env.EMAIL_PASSWORD as string,
      },
    });

    const mailOptions = {
      from: {
        name: "BattleZone",
        address: process.env.EMAIL as string,
      },
      to,
      subject,
      html,
      text,
      headers: {
        References: Math.random().toString(36).substring(7),
      },
    };

    transporter.sendMail(
      mailOptions,
      (error: Error | null, info: nodemailer.SentMessageInfo) => {
        if (error) reject(error);
        else resolve(info);
      }
    );
  });
}

export function generateVerificationEmailHtml(
  name: string,
  verificationCode: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h1>Verify Your Account</h1>
      <p>Hello ${name || "User"},</p>
      <p>Thank you for signing up! Please use the following verification code to verify your account:</p>
      <div style="background-color: #f7f7f7; padding: 12px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${verificationCode}
      </div>
      <p>This code will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>BattleZone Team</p>
    </div>
  `;
}

export async function sendVerificationEmail(
  to: string,
  verificationCode: string
): Promise<any> {
  console.log(
    `Sending verification email to ${to} with code ${verificationCode}`
  );

  const name = to.split("@")[0]; // Extract name from email address
  const html = generateVerificationEmailHtml(name, verificationCode);

  return await sendEmail({
    to,
    subject: "Verify Your BattleZone Account",
    html,
  });
}
