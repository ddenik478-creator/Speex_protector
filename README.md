# SPEEX MODER — сайт + Discord-бот

Система ключей для скриптов: бесплатные ключи с сайта, премиум-ключи из Discord,
HWID-привязка и роли. Цветовая тема: красно-молочная 🔴🥛

## Запуск
1. `npm install`
2. Скопируйте `.env.example` в `.env` и заполните.
3. `npm start`

## Discord
- https://discord.com/developers/applications → New Application → Bot → скопируйте токен.
- Пригласите бота со scope `bot` + `applications.commands`, права: Manage Roles, Send Messages.
- Роль бота должна быть выше роли `BUYER_ROLE_ID`.

## Команды
- `/whitelist user` — добавить в whitelist
- `/panel` — панель с кнопками (ключ, роль, сброс HWID)
- `/generatekey [hours] [user]` — выдать ключ
- `/getrole` — роль при активном ключе
- `/generatekeyrole user [hours]` — ключ + роль

## API
`POST /api/verify` с JSON `{ "key": "SM-...", "hwid": "..." }` → `{ "valid": true/false, ... }`

## Деплой (Railway)
Загрузите проект на GitHub → Railway → Deploy from repo → добавьте переменные из `.env`.
Для постоянного хранения подключите Volume и задайте `DB_FILE=/data/data.json`.
