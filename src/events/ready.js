const { Events, ActivityType } = require('discord.js');
const stayInCall = require('../voice/stayInCall');
const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');
const health = require('../services/healthMonitor');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('------------------------------------------------------');
        console.log(`[INFO] Bot ${client.user.tag} está online!`);
        console.log(`[INFO] Carregado com ${client.slashCommands.size} comandos de barra (/).`);
        console.log(`[INFO] Ativo em ${client.guilds.cache.size} servidor(es).`);
        console.log('------------------------------------------------------');

        logger.log('SUCCESS', `Bot online como ${client.user.tag}`);
        logger.log('INFO', `Guilds: ${client.guilds.cache.size}`);
        logger.log('INFO', `Health: ${JSON.stringify(health.getStatus())}`);

        // Auto-registro de slash commands via REST
        try {
            const rest = new REST({ version: '10' }).setToken(client.token || process.env.DISCORD_TOKEN);
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: client.slashCommands.map(cmd => cmd.data.toJSON()) }
            );
            logger.log('SUCCESS', 'Slash commands registrados via REST.');
        } catch (e) {
            logger.log('ERROR', 'Falha ao registrar slash commands: ' + e.message);
        }

        client.user.setActivity({
            name: 'Servidores DayZ',
            type: ActivityType.Watching
        });

        // Conectar ao canal de voz se configurado
        if (client.config.voiceConfig && client.config.voiceConfig.voiceChannels) {
            // Para cada servidor com configuração de voz
            for (const [guildId, voiceData] of Object.entries(client.config.voiceConfig.voiceChannels)) {
                const guild = client.guilds.cache.get(guildId);
                if (guild && voiceData.channelId) {
                    stayInCall(client, guildId, voiceData.channelId);
                }
            }
        }
        
        // Fallback para VOICE_CHANNEL_ID do .env se configurado
        if (client.config.voiceChannelId && (!client.config.voiceConfig || !client.config.voiceConfig.voiceChannels)) {
            const guild = client.guilds.cache.first();
            if (guild) {
                stayInCall(client, guild.id, client.config.voiceChannelId);
            }
        }

            },
};
