/*
 * Julamore — lead-form backend (and a static file server for local testing).
 *
 *   POST /api/send-lead  →  forwards the form to Telegram
 *   everything else      →  files from the site folder (only when SERVE_STATIC=1;
 *                           on the VPS nginx serves the files itself)
 *
 * No dependencies — plain Node.js 18+.
 * Settings come from environment variables or from server/.env:
 *   TELEGRAM_TOKEN=...      bot token from @BotFather
 *   TELEGRAM_CHAT_ID=...    chat that receives the leads
 *   PORT=3001               where to listen (default 3001)
 *   HOST=127.0.0.1          listen address (keep 127.0.0.1 behind nginx)
 *   SERVE_STATIC=1          also serve the site files (local testing)
 *   LEADS_DIR=...           where lead copies are stored (default server/leads)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const tls = require('tls');
const crypto = require('crypto');

const SITE_DIR = path.resolve(__dirname, '..');
const LEADS_DIR = process.env.LEADS_DIR || path.join(__dirname, 'leads');

// --- settings: server/.env first, real environment variables win ---
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
}
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';
const SERVE_STATIC = process.env.SERVE_STATIC === '1';

// --- tiny per-IP rate limit: 5 leads per 10 minutes ---
const hits = new Map();
function tooMany(ip) {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
    recent.push(now);
    hits.set(ip, recent);
    return recent.length > 5;
}

function sendJson(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

function readBody(req, limit = 20_000) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', c => {
            size += c.length;
            if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
            chunks.push(c);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

// --- отправка письма по SMTP: минимальный клиент, без внешних библиотек ---
function smtpSend({ host, port, user, pass, from, to, replyTo, subject, text }) {
    return new Promise((resolve, reject) => {
        const socket = tls.connect({ host, port: Number(port), servername: host });
        socket.setEncoding('utf8');
        socket.setTimeout(15000);

        let buffer = '';
        let waiting = null;
        const fail = err => { try { socket.destroy(); } catch {} reject(err); };

        function check() {
            if (!waiting) return;
            const m = buffer.match(/(?:^|\n)(\d{3}) [^\n]*\r?\n$/);
            if (!m) return;
            const reply = buffer.trim();
            buffer = '';
            const w = waiting;
            waiting = null;
            if (w.codes.includes(Number(m[1]))) w.res(reply);
            else w.rej(new Error('SMTP: ' + reply));
        }
        const expect = codes => new Promise((res, rej) => { waiting = { codes, res, rej }; check(); });
        const line = s => socket.write(s + '\r\n');
        const b64 = s => Buffer.from(String(s), 'utf8').toString('base64');

        socket.on('data', chunk => { buffer += chunk; check(); });
        socket.on('timeout', () => fail(new Error('SMTP: превышено время ожидания')));
        socket.on('error', fail);

        const letter = [
            `From: Julamore <${from}>`,
            `To: ${to.join(', ')}`,
            replyTo ? `Reply-To: ${replyTo}` : null,
            `Subject: =?UTF-8?B?${b64(subject)}?=`,
            `Date: ${new Date().toUTCString()}`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=utf-8',
            'Content-Transfer-Encoding: base64',
            '',
            b64(text).replace(/(.{76})/g, '$1\r\n'),
        ].filter(Boolean).join('\r\n');

        (async () => {
            await expect([220]);
            line('EHLO julamore');
            await expect([250]);
            line('AUTH LOGIN');
            await expect([334]);
            line(b64(user));
            await expect([334]);
            line(b64(pass));
            await expect([235]);
            line(`MAIL FROM:<${from}>`);
            await expect([250]);
            for (const rcpt of to) { line(`RCPT TO:<${rcpt}>`); await expect([250, 251]); }
            line('DATA');
            await expect([354]);
            socket.write(letter + '\r\n.\r\n');
            await expect([250]);
            line('QUIT');
            socket.end();
            resolve();
        })().catch(fail);
    });
}

// --- личный кабинет: список заявок под паролем ---
// Токен = срок жизни + подпись HMAC на пароле. Отдельный секрет не нужен:
// сменили пароль — старые токены перестали работать.
function makeToken(password, days = 30) {
    const exp = Date.now() + days * 24 * 60 * 60 * 1000;
    const sign = crypto.createHmac('sha256', password).update(String(exp)).digest('hex');
    return `${exp}.${sign}`;
}
function validToken(token, password) {
    const [exp, sign] = String(token || '').split('.');
    if (!exp || !sign || Number(exp) < Date.now()) return false;
    const expected = crypto.createHmac('sha256', password).update(exp).digest('hex');
    const a = Buffer.from(sign);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function samePassword(given, real) {
    const a = Buffer.from(String(given));
    const b = Buffer.from(String(real));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handleAdminLogin(req, res) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return sendJson(res, 500, { error: 'ADMIN_PASSWORD не задан' });

    const ip = 'login:' + (req.headers['x-real-ip'] || req.socket.remoteAddress || '');
    if (tooMany(ip)) return sendJson(res, 429, { error: 'Слишком много попыток, подождите 10 минут' });

    let data;
    try { data = JSON.parse(await readBody(req, 2000)); }
    catch { return sendJson(res, 400, { error: 'Bad request' }); }

    if (!samePassword(data.password, password)) {
        await new Promise(r => setTimeout(r, 600));           // не даём подбирать быстро
        return sendJson(res, 401, { error: 'Неверный пароль' });
    }
    sendJson(res, 200, { token: makeToken(password) });
}

function handleAdminLeads(req, res) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return sendJson(res, 500, { error: 'ADMIN_PASSWORD не задан' });
    const token = req.headers['x-admin-token'];
    if (!validToken(token, password)) return sendJson(res, 401, { error: 'Нужен вход' });

    let leads = [];
    try {
        const files = fs.existsSync(LEADS_DIR) ? fs.readdirSync(LEADS_DIR).filter(n => n.endsWith('.jsonl')) : [];
        for (const name of files.sort()) {
            for (const line of fs.readFileSync(path.join(LEADS_DIR, name), 'utf8').split('\n')) {
                if (!line.trim()) continue;
                try { leads.push(JSON.parse(line)); } catch {}
            }
        }
    } catch (err) {
        console.error('Не удалось прочитать заявки:', err.message);
        return sendJson(res, 500, { error: 'Не удалось прочитать заявки' });
    }
    leads.reverse();                                          // свежие сверху
    sendJson(res, 200, { leads: leads.slice(0, 1000), total: leads.length });
}

async function handleLead(req, res) {
    const ip = (req.headers['x-real-ip'] || req.socket.remoteAddress || '').toString();
    if (tooMany(ip)) return sendJson(res, 429, { error: 'Too many requests' });

    let data;
    try { data = JSON.parse(await readBody(req)); }
    catch { return sendJson(res, 400, { error: 'Bad request' }); }

    const lead = {
        firstName: clean(data.firstName, 100),
        lastName: clean(data.lastName, 100),
        phone: clean(data.phone, 40),
        email: clean(data.email, 120),
        description: clean(data.description, 3000) || 'Не указано',
        consent: data.consent === true,
        consentText: clean(data.consentText, 500),
        page: clean(data.page, 200),
    };
    if (!lead.firstName || !lead.lastName || !lead.phone || !lead.email) {
        return sendJson(res, 400, { error: 'Missing required fields' });
    }
    // Ловушка для ботов: скрытое поле, которое человек не видит и не заполняет,
    // и слишком быстрое заполнение формы. Отвечаем как при успехе, чтобы бот не подбирал.
    const trapFilled = clean(data.website, 200) !== '';
    const tooFast = Number(data.elapsed) > 0 && Number(data.elapsed) < 2000;
    if (trapFilled || tooFast) {
        console.warn('Похоже на бота, заявка отброшена:', trapFilled ? 'ловушка' : 'слишком быстро');
        return sendJson(res, 200, { ok: true });
    }
    // 152-ФЗ: no consent — no processing
    if (!lead.consent) {
        return sendJson(res, 400, { error: 'Consent is required' });
    }

    // the record stays on this server (in Russia): proof of consent + a copy of the lead
    const record = { time: new Date().toISOString(), ip, ...lead };
    try {
        fs.mkdirSync(LEADS_DIR, { recursive: true, mode: 0o700 });
        const month = record.time.slice(0, 7);
        const file = path.join(LEADS_DIR, `leads-${month}.jsonl`);
        fs.appendFileSync(file, JSON.stringify(record) + '\n', { encoding: 'utf8', mode: 0o600 });
        try { fs.chmodSync(file, 0o600); } catch {}   // заявки читает только владелец процесса
    } catch (err) {
        console.error('Could not save the lead to disk:', err.message);
    }

    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const mailHost = process.env.MAIL_HOST;
    const mailTo = (process.env.MAIL_TO || '').split(',').map(s => s.trim()).filter(Boolean);
    const mailReady = mailHost && process.env.MAIL_USER && process.env.MAIL_PASS && mailTo.length;
    if (!mailReady && !(token && chatId)) {
        console.error('Ни почта (MAIL_*), ни Telegram (TELEGRAM_*) не настроены');
        return sendJson(res, 500, { error: 'Server is not configured' });
    }

    const when = new Date().toLocaleString('ru-RU');
    const plain = [
        'Новая заявка с сайта Julamore',
        '',
        `ФИО: ${lead.lastName} ${lead.firstName}`,
        `Телефон: ${lead.phone}`,
        `Почта: ${lead.email}`,
        `Пожелания: ${lead.description}`,
        `Страница: ${lead.page || '—'}`,
        '',
        `Согласие на обработку персональных данных получено ${when}`,
        lead.consentText ? `Текст согласия: ${lead.consentText}` : '',
    ].filter(Boolean).join('\n');

    let mailSent = false;
    if (mailReady) {
        try {
            await smtpSend({
                host: mailHost,
                port: process.env.MAIL_PORT || 465,
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
                from: process.env.MAIL_FROM || process.env.MAIL_USER,
                to: mailTo,
                replyTo: lead.email,
                subject: `Заявка с сайта: ${lead.lastName} ${lead.firstName}`,
                text: plain,
            });
            mailSent = true;
        } catch (err) {
            console.error('Письмо не отправлено:', err.message);
        }
    }

    if (!token || !chatId) {
        return mailSent
            ? sendJson(res, 200, { ok: true })
            : sendJson(res, 502, { error: 'Failed to send lead' });
    }

    // По умолчанию в Telegram уходит только сигнал, без персональных данных:
    // сами данные остаются на сервере в России и открываются на /leads.html.
    // TELEGRAM_FULL_TEXT=1 вернёт полный текст заявки (тогда это трансграничная
    // передача персональных данных со всеми обязанностями оператора).
    const fullText = process.env.TELEGRAM_FULL_TEXT === '1';
    const leadsUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
    const text = fullText
        ? [
            '🔔 <b>Новая заявка с сайта Julamore!</b>',
            `👤 <b>ФИО:</b> ${escapeHtml(lead.lastName)} ${escapeHtml(lead.firstName)}`,
            `📞 <b>Телефон:</b> ${escapeHtml(lead.phone)}`,
            `📧 <b>Почта:</b> ${escapeHtml(lead.email)}`,
            `📝 <b>Пожелания:</b> ${escapeHtml(lead.description)}`,
            `✅ Согласие на обработку персональных данных получено ${when}`,
        ].join('\n')
        : [
            '🔔 <b>Новая заявка с сайта Julamore</b>',
            when,
            '',
            leadsUrl
                ? `Кто оставил — в списке заявок: ${leadsUrl}/leads.html`
                : 'Кто оставил — смотрите на странице заявок /leads.html',
        ].join('\n');

    // the connection to Telegram can drop now and then — try up to 3 times
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const api = process.env.TELEGRAM_API || 'https://api.telegram.org';
            const tg = await fetch(`${api}/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
                signal: AbortSignal.timeout(8000),
            });
            if (tg.ok) return sendJson(res, 200, { ok: true });
            lastError = new Error(`Telegram answered ${tg.status}: ${await tg.text()}`);
            if (tg.status < 500 && tg.status !== 429) break;   // wrong token / chat — retrying won't help
        } catch (err) {
            lastError = err;
        }
        await new Promise(r => setTimeout(r, 700 * attempt));
    }
    console.error('Failed to send lead:', lastError?.cause?.code || lastError?.message);
    if (mailSent) return sendJson(res, 200, { ok: true });   // письмо дошло — заявка не потеряна
    sendJson(res, 502, { error: 'Failed to send lead' });
}

// --- static files (local testing only) ---
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.pdf': 'application/pdf',
};
function serveStatic(req, res) {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(SITE_DIR, rel);
    const blocked = !file.startsWith(SITE_DIR + path.sep) || /[\\/](server|\.git)[\\/]|[\\/]\./.test(file.slice(SITE_DIR.length));
    if (blocked) { res.writeHead(404); return res.end('Not found'); }
    fs.stat(file, (err, st) => {
        if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
        const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
        // byte ranges so videos can be scrubbed
        const range = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
        if (range) {
            const start = range[1] ? Number(range[1]) : 0;
            const end = range[2] ? Number(range[2]) : st.size - 1;
            res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`,
                'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store' });
            return fs.createReadStream(file, { start, end }).pipe(res);
        }
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(res);
    });
}

http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/send-lead') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
        return handleLead(req, res);
    }
    if (url.pathname === '/api/admin/login') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
        return handleAdminLogin(req, res);
    }
    if (url.pathname === '/api/admin/leads') {
        if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
        return handleAdminLeads(req, res);
    }
    if (SERVE_STATIC && (req.method === 'GET' || req.method === 'HEAD')) return serveStatic(req, res);
    res.writeHead(404); res.end('Not found');
}).listen(PORT, HOST, () => {
    console.log(`Julamore server on http://${HOST}:${PORT}${SERVE_STATIC ? ' (serving the site too)' : ''}`);
    const tg = process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID;
    const mail = process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS && process.env.MAIL_TO;
    const tgMode = process.env.TELEGRAM_FULL_TEXT === '1' ? 'включён, полный текст заявки' : 'включён, только уведомление без данных';
    console.log(`Заявки: почта — ${mail ? 'включена' : 'выключена'}, Telegram — ${tg ? tgMode : 'выключен'}`);
    if (!tg && !mail) console.warn('Внимание: ни один канал не настроен — заявки отправляться не будут.');
    console.log(`Страница заявок /leads.html — ${process.env.ADMIN_PASSWORD ? 'включена' : 'выключена (нет ADMIN_PASSWORD)'}`);
});
