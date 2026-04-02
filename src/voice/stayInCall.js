const { joinVoiceChannel } = require('@discordjs/voice');

async function stayInCall(client, guildId, channelId) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.log(`[VOICE] Guild ${guildId} not found.`);
            return;
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== 2) { // 2 is voice channel type
            console.log(`[VOICE] Voice channel ${channelId} not found or invalid.`);
            return;
        }

        // Check if already connected
        const existingConnection = client.voice?.connections?.get(guildId);
        if (existingConnection) {
            console.log(`[VOICE] Already connected to voice channel in guild ${guildId}.`);
            return;
        }

        // Join the voice channel
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        console.log(`[VOICE] Joined voice channel ${channel.name} in guild ${guild.name}.`);

        // Handle disconnection and auto-reconnect
        connection.on('disconnected', async () => {
            console.log(`[VOICE] Disconnected from voice channel in guild ${guild.name}. Attempting to reconnect in 10 seconds...`);
            
            // Tenta reconectar após 10 segundos
            setTimeout(() => {
                stayInCall(client, guildId, channelId).catch(err => {
                    console.error(`[VOICE] Erro ao reconectar: ${err.message}`);
                });
            }, 10000);
        });

        connection.on('error', (error) => {
            console.error(`[VOICE] Connection error in guild ${guild.name}:`, error);
        });

    } catch (error) {
        console.error(`[VOICE] Error joining voice channel:`, error);
    }
}

module.exports = stayInCall;
