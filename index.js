require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.set('trust proxy', true);
app.use(express.json());

const HOURS = Number(process.env.FREE_KEY_HOURS || 24);

app.get('/', (_, r) => r.sendFile(path.join(__dirname, 'index.html')));
app.get('/keys-free', (_, r) => r.sendFile(path.join(__dirname, 'keys-free.html')));

app.get('/api/config', (_, r) => r.json({ invite: process.env.DISCORD_INVITE || '#', hours: HOURS }));

// Бесплатный ключ: 1 раз в N часов на IP
app.post('/api/free-key', (req, res) => {
  const ip = req.ip;
  if (!db.canGetFreeKey(ip, HOURS))
    return res.status(429).json({ error: `Бесплатный ключ можно получать раз в ${HOURS} ч.` });
  const k = db.createKey({ type: 'free', hours: HOURS });
  db.markIp(ip);
  res.json({ key: k.key, expiresAt: k.expiresAt });
});

// Проверка ключа из лоадера (Lua/любой клиент)
app.post('/api/verify', (req, res) => {
  const { key, hwid } = req.body || {};
  if (!key) return res.status(400).json({ valid: false, reason: 'no_key' });
  res.json(db.verify(key, hwid));
});

app.listen(process.env.PORT || 3000, () => console.log('SPEEX MODER запущен'));

if (process.env.DISCORD_TOKEN) require('./bot').start();
else console.log('DISCORD_TOKEN не задан — бот не запущен');
