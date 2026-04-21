import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const getEmailFromName = (name: string | null) => {
  if (!name || name === "Not Applicable" || name === "Choose") return null;
  // A simple mapping if needed. Or just construct standard emails.
  const emailMap: Record<string, string> = {
    "Pavan": "pavanreddy@intellicar.in",
    "Saikath": "saikatdas@intellicar.in",
    "Sami": "sami@intellicar.in",
    "Hanusha": "hanusha@intellicar.in",
    "Sreenivas": "sreenivasulu.t@intellicar.in",
    "Sharath": "sharath.shetty@intellicar.in",
    "Chandana": "chandanak@intellicar.in",
    "Nikhat": "nikhat@intellicar.in",
    "Venkat": "venkata.g@intellicar.in",
    "Sidharth Saneja": "saneja@intellicar.in"
  };
  
  return emailMap[name] || `${name.toLowerCase()}@intellicar.in`;
};

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials not set. Skipping email to:", to);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Task Manager" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
    console.log(`Email sent to ${to} successfully.`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
