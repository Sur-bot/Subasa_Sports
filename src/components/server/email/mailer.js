import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "subasasport@gmail.com",
    pass: "poszdssqnacxtfxr", // App password Gmail
  },
});
