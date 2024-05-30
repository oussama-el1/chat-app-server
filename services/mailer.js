const FormData = require('form-data');
const Mailgun = require('mailgun.js');

const dotenv = require("dotenv");
dotenv.config({ path: "../config.env" });

// Initialize Mailgun client
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
  url: 'https://api.mailgun.net'
});

// Function to send email using Mailgun
const sendMailgunEmail = async ({ to, from, subject, html, attachments, text }) => {
  try {
    const msg = {
      from: from,
      to: to,
      subject: subject,
      text: text,
    };

    return mg.messages.create(process.env.MAILGUN_DOMAIN, msg);
  } catch (error) {
    console.log(error);
    throw error;
  }
};

// Exported function to conditionally send email
exports.sendEmail = async (args) => {
  if (process.env.NODE_ENV !== "dev") {
    return Promise.resolve();
  } else {
    return sendMailgunEmail(args);
  }
};
