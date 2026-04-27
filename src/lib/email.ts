import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
  },
});

export const getEmailFromName = (name: string | null) => {
  if (!name || name === "Not Applicable" || name === "Choose") return null;
  
  const normalized = name.trim();
  const emailMap: Record<string, string> = {
    "Pavan": "pavanreddy@intellicar.in",
    "Pavan Reddy": "pavanreddy@intellicar.in",
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
  
  if (emailMap[normalized]) return emailMap[normalized];
  
  // Clean up name for default email generation
  const cleanName = normalized.toLowerCase().replace(/\s+/g, '');
  return `${cleanName}@intellicar.in`;
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
  if (!(process.env.EMAIL_USER || process.env.SMTP_USER) || !(process.env.EMAIL_PASS || process.env.SMTP_PASS)) {
    const msg = "SMTP credentials not set. Please configure EMAIL_USER and EMAIL_PASS in environment variables.";
    console.error(msg);
    throw new Error(msg);
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Task Manager" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
    console.log(`Email sent to ${to} successfully.`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error; // Throwing error so caller knows it failed
  }
}
