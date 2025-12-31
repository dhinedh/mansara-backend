const axios = require("axios");

const sendEmail = async (options) => {
  console.log(`[DEBUG] sendEmail called for: ${options.email}`);

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;

  if (!apiKey || !senderEmail) {
    console.error("CRITICAL: Missing BREVO_API_KEY or EMAIL_FROM");
    return;
  }

  try {
    const res = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Mansara Foods",
          email: senderEmail,
        },
        to: [
          {
            email: options.email,
            name: options.name || options.email,
          },
        ],
        subject: options.subject,
        textContent: options.message,
        htmlContent: options.html || options.message,
      },
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 5000, // fast fail
      }
    );

    console.log("Brevo API Email Sent. MessageId:", res.data.messageId);
  } catch (err) {
    console.error(
      "Brevo Email Error:",
      err.response?.data || err.message
    );
  }
};

module.exports = sendEmail;
