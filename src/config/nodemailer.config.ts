import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import AppError from "../utils/appError.class.js";

const { EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD } = process.env;

if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USERNAME || !EMAIL_PASSWORD) {
  throw new AppError("Missing email configuration in environment variables.", 500);
}

const transport = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: Number(EMAIL_PORT),
  auth: {
    user: EMAIL_USERNAME,
    pass: EMAIL_PASSWORD,
  },
  secure: Number(EMAIL_PORT) === 465,
} as SMTPTransport.Options);

export default transport;
