import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASS,
  },
});

const sendMail = async (email, subject, content) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: subject,
      html: content,
    };

    const info = await transport.sendMail(mailOptions);
    return info; // Return the info object for further use if needed
  } catch (err) {
    throw new Error("Failed to send email"); // Throw an error to handle it in the caller
  }
};

export { sendMail };
