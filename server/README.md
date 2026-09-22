# Julamore — выкладка на VPS (Beget)

Сайт — обычные файлы (HTML, CSS, JS, фото, видео). Их отдаёт **nginx**.

Заявки могут уходить **на почту** (`MAIL_*` в `.env`), **в Telegram** (`TELEGRAM_*`) или и туда, и туда.
Что не заполнено — тот канал просто выключен. Копия каждой заявки в любом случае ложится в `server/leads`.
Заявки из формы «Первый шаг» принимает маленький сервер **`server/server.js`** (Node.js, без библиотек)
и пересылает их в Telegram. Токен бота лежит только на сервере, в файле `server/.env`.

## 1. Бот для заявок

1. В Telegram откройте **@BotFather** → `/newbot` → получите **токен**.
2. Напишите своему боту любое сообщение (или добавьте его в рабочий чат).
3. Откройте в браузере `https://api.telegram.org/bot<ТОКЕН>/getUpdates`
   и найдите `"chat":{"id": ...}` — это **TELEGRAM_CHAT_ID** (у групп он с минусом).

## 2. Файлы на сервер

Скопируйте папку сайта на VPS, например в `/var/www/julamore`
(через `scp`, `rsync` или файловый менеджер Beget). Папку `.git` и видео-исходники копировать не нужно.

## 3. Node.js и настройки

```bash
node -v                      # нужен Node.js 18 или новее
cd /var/www/julamore/server
cp .env.example .env
nano .env                    # вписать TELEGRAM_TOKEN и TELEGRAM_CHAT_ID
chmod 600 .env
```

Если Node.js нет: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`.

## 4. Автозапуск

```bash
sudo cp deploy/julamore-leads.service /etc/systemd/system/
sudo chown www-data:www-data /var/www/julamore/server/.env
sudo systemctl daemon-reload
sudo systemctl enable --now julamore-leads
sudo systemctl status julamore-leads     # должно быть active (running)
```

## 5. nginx и домен

```bash
sudo cp deploy/nginx-julamore.conf /etc/nginx/sites-available/julamore
sudo nano /etc/nginx/sites-available/julamore     # свой домен и путь
sudo ln -s /etc/nginx/sites-available/julamore /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

В панели Beget направьте A-запись домена на IP сервера. Затем HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d julamore.ru -d www.julamore.ru
```

## 6. Проверка

Откройте сайт, нажмите «Первый шаг», отправьте тестовую заявку — она придёт в Telegram.
Если нет: `sudo journalctl -u julamore-leads -n 50` покажет причину.

## Локальная проверка (на своём компьютере)

В `server/.env` впишите токен и chat id, а ещё `SERVE_STATIC=1` и `PORT=8081`, затем:

```bash
node server/server.js
```

и откройте http://localhost:8081 — сайт работает вместе с отправкой заявок.

> `api/send-lead.js` — старый вариант той же отправки для хостинга Vercel. На VPS он не используется.
