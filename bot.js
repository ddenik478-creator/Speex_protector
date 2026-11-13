const {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits,
} = require('discord.js');
const db = require('./db');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, BUYER_ROLE_ID, ADMIN_ROLE_ID, SITE_URL } = process.env;

const admin = PermissionFlagsBits.Administrator;
const commands = [
  new SlashCommandBuilder().setName('whitelist').setDescription('Добавить пользователя в whitelist')
    .addUserOption((o) => o.setName('user').setDescription('Пользователь').setRequired(true))
    .setDefaultMemberPermissions(admin),
  new SlashCommandBuilder().setName('panel').setDescription('Отправить панель управления ключами')
    .setDefaultMemberPermissions(admin),
  new SlashCommandBuilder().setName('generatekey').setDescription('Сгенерировать ключ')
    .addIntegerOption((o) => o.setName('hours').setDescription('Срок в часах (пусто = навсегда)'))
    .addUserOption((o) => o.setName('user').setDescription('Привязать к пользователю'))
    .setDefaultMemberPermissions(admin),
  new SlashCommandBuilder().setName('getrole').setDescription('Получить роль, если у вас есть активный ключ'),
  new SlashCommandBuilder().setName('generatekeyrole').setDescription('Сгенерировать ключ и сразу выдать роль')
    .addUserOption((o) => o.setName('user').setDescription('Пользователь').setRequired(true))
    .addIntegerOption((o) => o.setName('hours').setDescription('Срок в часах (пусто = навсегда)'))
    .setDefaultMemberPermissions(admin),
].map((c) => c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const fmt = (k) => (k.expiresAt ? `<t:${Math.floor(k.expiresAt / 1000)}:R>` : 'навсегда');

async function giveRole(member) {
  if (!BUYER_ROLE_ID) return false;
  await member.roles.add(BUYER_ROLE_ID); return true;
}

client.once('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log(`Бот запущен как ${client.user.tag}`);
});

client.on('interactionCreate', async (i) => {
  try {
    if (i.isChatInputCommand()) {
      if (i.commandName === 'whitelist') {
        const u = i.options.getUser('user');
        db.addWhitelist(u.id);
        return i.reply({ content: `✅ ${u} добавлен в whitelist.`, ephemeral: true });
      }
      if (i.commandName === 'panel') {
        const embed = new EmbedBuilder().setColor(0xc1121f).setTitle('SPEEX MODER — панель')
          .setDescription('Управляйте своим ключом кнопками ниже.');
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('p_key').setLabel('Получить ключ').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('p_role').setLabel('Получить роль').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('p_hwid').setLabel('Сбросить HWID').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setLabel('Сайт').setStyle(ButtonStyle.Link).setURL(SITE_URL || 'https://discord.com'),
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: 'Панель отправлена.', ephemeral: true });
      }
      if (i.commandName === 'generatekey') {
        const hours = i.options.getInteger('hours');
        const u = i.options.getUser('user');
        const k = db.createKey({ type: 'premium', hours, userId: u?.id || null });
        return i.reply({ content: `🔑 \`${k.key}\`\nДействует: ${fmt(k)}`, ephemeral: true });
      }
      if (i.commandName === 'getrole') {
        const ok = db.userKeys(i.user.id).some((k) => !db.isExpired(k) && !k.blacklisted)
          || db.isWhitelisted(i.user.id);
        if (!ok) return i.reply({ content: '❌ У вас нет активного ключа.', ephemeral: true });
        await giveRole(i.member);
        return i.reply({ content: '✅ Роль выдана.', ephemeral: true });
      }
      if (i.commandName === 'generatekeyrole') {
        const u = i.options.getUser('user');
        const hours = i.options.getInteger('hours');
        const k = db.createKey({ type: 'premium', hours, userId: u.id });
        const m = await i.guild.members.fetch(u.id);
        await giveRole(m);
        return i.reply({ content: `🔑 \`${k.key}\` для ${u}, роль выдана. Срок: ${fmt(k)}`, ephemeral: true });
      }
    }

    if (i.isButton()) {
      if (i.customId === 'p_key') {
        let k = db.userKeys(i.user.id).find((x) => !db.isExpired(x) && !x.blacklisted);
        if (!k) {
          if (!db.isWhitelisted(i.user.id))
            return i.reply({ content: '❌ Вы не в whitelist. Бесплатный ключ — на сайте.', ephemeral: true });
          k = db.createKey({ type: 'premium', userId: i.user.id });
        }
        return i.reply({ content: `🔑 \`${k.key}\`\nДействует: ${fmt(k)}`, ephemeral: true });
      }
      if (i.customId === 'p_role') {
        const ok = db.userKeys(i.user.id).some((k) => !db.isExpired(k)) || db.isWhitelisted(i.user.id);
        if (!ok) return i.reply({ content: '❌ Нет активного ключа.', ephemeral: true });
        await giveRole(i.member);
        return i.reply({ content: '✅ Роль выдана.', ephemeral: true });
      }
      if (i.customId === 'p_hwid') {
        db.resetHwid(i.user.id);
        return i.reply({ content: '♻️ HWID сброшен.', ephemeral: true });
      }
    }
  } catch (e) {
    console.error(e);
    if (!i.replied) i.reply({ content: 'Ошибка. Проверьте права бота.', ephemeral: true }).catch(() => {});
  }
});

module.exports = { start: () => client.login(DISCORD_TOKEN) };
