import transporter from "../config/nodemailer.config.js";
import SendMailOptions from "../interfaces/mail.interface.js";
import AppError from "../utils/appError.class.js";

const sendMail = async ({ to, subject, body }: SendMailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: "talkwide <authentication@talkwide.com>",
      to,
      subject,
      text: body,
    });

    return info;
  } catch (error) {
    console.log("email sending failed", error);
    throw new AppError("email sending failed", 500);
  }
};

export default sendMail;
