const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

let transporter = null;
const sent = []; // test ortamında gönderilen e-postalar

function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/** E-posta gönderir. SMTP yapılandırılmamışsa yalnızca loglar; hata akışı kesmez. */
async function sendMail({ to, subject, text, html }) {
  if (config.isTest) {
    sent.push({ to, subject, text });
    return;
  }
  const t = getTransporter();
  if (!t) {
    logger.info(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  try {
    await t.sendMail({ from: config.smtp.from, to, subject, text, html });
  } catch (err) {
    logger.error('E-posta gönderilemedi:', err.message);
  }
}

const link = (path) => `${config.appUrl.replace(/\/$/, '')}${path}`;

const templates = {
  verifyEmail: (token) => ({
    subject: 'TeknoMatch — e-posta adresinizi doğrulayın',
    text: `Merhaba,\n\nHesabınızı etkinleştirmek için bağlantıya tıklayın:\n${link(`/verify-email?token=${token}`)}\n\nBağlantı 48 saat geçerlidir.`,
  }),
  resetPassword: (token) => ({
    subject: 'TeknoMatch — şifre sıfırlama',
    text: `Şifrenizi sıfırlamak için bağlantıya tıklayın:\n${link(`/reset-password?token=${token}`)}\n\nBu isteği siz yapmadıysanız bu e-postayı yok sayın.`,
  }),
  invitation: (companyName, token) => ({
    subject: `TeknoMatch — ${companyName} sizi davet etti`,
    text: `${companyName} firması sizi TeknoMatch'e davet etti.\nDaveti kabul etmek için:\n${link(`/accept-invite?token=${token}`)}`,
  }),
  newMatch: (otherName) => ({
    subject: `Yeni eşleşme: ${otherName}`,
    text: `${otherName} ile karşılıklı ilgi oluştu. Mesajlaşmaya başlamak ve toplantı önermek için:\n${link('/matches')}`,
  }),
  meeting: (otherName, statusText) => ({
    subject: `Toplantı: ${otherName}`,
    text: `${otherName} ile toplantı ${statusText}.\n${link('/matches')}`,
  }),
  outcomePrompt: (otherName, matchId) => ({
    subject: `${otherName} ile eşleşmeniz nasıl sonuçlandı?`,
    text: `İki hafta önce ${otherName} ile eşleştiniz. Görüşme, teklif veya sözleşme oldu mu? Cevabınız sonraki önerileri iyileştirir:\n${link(`/matches/${matchId}/outcome`)}`,
  }),
  companyReviewed: (approved, note) => ({
    subject: approved ? 'Firmanız teknokent tarafından onaylandı' : 'Firma başvurunuz hakkında',
    text: approved
      ? `Firmanız onaylandı ve "Teknokent onaylı" rozeti aldı. Artık akışınızı görebilirsiniz:\n${link('/feed')}`
      : `Firma başvurunuz onaylanmadı.${note ? `\nNot: ${note}` : ''}`,
  }),
};

module.exports = { sendMail, templates, sent };
