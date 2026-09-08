export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { firstName, lastName, phone, email, description } = req.body || {};

  if (!firstName || !lastName || !phone || !email) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    res.status(500).json({ error: 'Server is not configured' });
    return;
  }

  const messageText = `
🔔 *Новая заявка с сайта Julamore!*
👤 *Имя:* ${firstName} ${lastName}
📞 *Телефон:* ${phone}
📧 *Почта:* ${email}
📝 *Пожелания:* ${description || 'Не указано'}
  `.trim();

  try {
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: messageText, parse_mode: 'Markdown' })
    });

    if (!telegramRes.ok) {
      throw new Error('Telegram API error');
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: 'Failed to send lead' });
  }
}
