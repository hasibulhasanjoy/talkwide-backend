import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }
  
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    secure: Number(process.env.EMAIL_PORT) === 465,
  } as SMTPTransport.Options);
  return transporter;
};

export default getTransporter;
