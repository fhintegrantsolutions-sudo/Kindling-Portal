import nodemailer from "nodemailer";

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendWelcomeEmail(
  to: string,
  name: string,
  username: string,
  tempPassword: string
) {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject: "Welcome to Kindling Portal",
    html: `
      <h2>Welcome to Kindling Portal, ${name}!</h2>
      <p>Your account has been approved and created.</p>
      <h3>Login Credentials:</h3>
      <ul>
        <li><strong>Username:</strong> ${username}</li>
        <li><strong>Temporary Password:</strong> ${tempPassword}</li>
      </ul>
      <p>Please login at <a href="http://localhost:5000/auth">http://localhost:5000/auth</a> and change your password.</p>
      <p>Thank you for joining Kindling Portal!</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
}

export async function sendAccountingNotification(
  participationId: string,
  amount: string,
  lenderName: string,
  noteTitle: string
) {
  const accountingEmail = process.env.ACCOUNTING_EMAIL;
  if (!accountingEmail) {
    console.warn("ACCOUNTING_EMAIL not configured");
    return;
  }

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: accountingEmail,
    subject: `New Investment Funds Received - ${noteTitle}`,
    html: `
      <h2>New Investment Notification</h2>
      <p>A lender has submitted an investment that requires processing.</p>
      <h3>Investment Details:</h3>
      <ul>
        <li><strong>Participation ID:</strong> ${participationId}</li>
        <li><strong>Lender:</strong> ${lenderName}</li>
        <li><strong>Note:</strong> ${noteTitle}</li>
        <li><strong>Amount:</strong> $${parseFloat(amount).toLocaleString()}</li>
      </ul>
      <p>Please process this investment in QuickBooks and update the status in the admin portal.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Accounting notification sent for participation ${participationId}`);
  } catch (error) {
    console.error("Error sending accounting notification:", error);
    throw error;
  }
}

export async function sendPaymentConfirmation(
  to: string,
  amount: string,
  noteTitle: string,
  date: Date
) {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject: `Investment Confirmed - ${noteTitle}`,
    html: `
      <h2>Investment Confirmed</h2>
      <p>Your investment has been successfully processed and confirmed.</p>
      <h3>Investment Details:</h3>
      <ul>
        <li><strong>Note:</strong> ${noteTitle}</li>
        <li><strong>Amount:</strong> $${parseFloat(amount).toLocaleString()}</li>
        <li><strong>Date:</strong> ${date.toLocaleDateString()}</li>
      </ul>
      <p>Thank you for your investment!</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Payment confirmation sent to ${to}`);
  } catch (error) {
    console.error("Error sending payment confirmation:", error);
    throw error;
  }
}
