const nodemailer = require('nodemailer');

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
console.log(user);
  if (!host || !user || !pass) {
    throw new Error('SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, SMTP_PASS');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

async function sendEmployeeWelcomePassword({ to, name, password }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || 'SmartPay';
  const loginUrl = process.env.APP_LOGIN_URL || 'https://your-frontend/login';

  const transporter = createTransport();
  const subject = `${appName} account created`;
  const text = `Hello ${name || ''},\n\nYour ${appName} account has been created.\n\nEmail: ${to}\nTemporary password: ${password}\n\nYou can log in here: ${loginUrl}\nAfter logging in, you may change your password from your profile settings.\n\nRegards,\n${appName} Team`;
  const html = `<p>Hello ${name || ''},</p>
<p>Your <strong>${appName}</strong> account has been created.</p>
<ul>
  <li><b>Email</b>: ${to}</li>
  <li><b>Temporary password</b>: <code>${password}</code></li>
  </ul>
<p>You can log in here: <a href="${loginUrl}">${loginUrl}</a></p>
<p>After logging in, you may change your password from your profile settings.</p>
<p>Regards,<br/>${appName} Team</p>`;

  await transporter.sendMail({ from, to, subject, text, html });
}

module.exports = {
  sendEmployeeWelcomePassword
};


