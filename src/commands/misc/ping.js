const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const health = require('../../services/healthMonitor');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Mostra informações completas de latência do bot'),

    async execute(interaction, client) {
        try {
            const startTime = Date.now();

            // Resposta silenciosa obrigatória
            await interaction.deferReply({ ephemeral: true });

            const botLatency = Date.now() - startTime;
            const wsLatency = interaction.client.ws.ping;

            const uptime = process.uptime();
            const uptimeFormatted = formatUptime(uptime);

            const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

            const embed = new EmbedBuilder()
                .setColor(getStatusColor(wsLatency))
                .setTitle('🏓 Pong!')
                .setDescription('📊 **Status e desempenho do bot**')
                .addFields(
                    {
                        name: '🟢 Status',
                        value: wsLatency < 150 ? 'Online' : 'Lento',
                        inline: true,
                    },
                    {
                        name: '⚙️ Processamento',
                        value: `${botLatency}ms`,
                        inline: true,
                    },
                    {
                        name: '🌐 WebSocket',
                        value: `${wsLatency}ms`,
                        inline: true,
                    },
                    {
                        name: '⏱️ Uptime',
                        value: uptimeFormatted,
                        inline: true,
                    },
                    {
                        name: '🧠 Memória',
                        value: `${memoryUsage.toFixed(2)} MB`,
                        inline: true,
                    },
                    {
                        name: '🧩 Node.js',
                        value: process.version,
                        inline: true,
                    },
                    {
                        name: '🤖 discord.js',
                        value: require('discord.js').version,
                        inline: true,
                    }
                )
                .setTimestamp();

            await interaction.channel.send({ embeds: [embed] });

            await interaction.deleteReply();

        } catch (error) {
            console.error('Erro no /ping:', error);
        }
    },
};

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    return [
        days && `${days}d`,
        hours && `${hours}h`,
        minutes && `${minutes}m`,
        `${seconds}s`,
    ]
        .filter(Boolean)
        .join(' ');
}

function getStatusColor(latency) {
    if (latency < 150) return 0x2ECC71; // verde
    if (latency < 300) return 0xF1C40F; // amarelo
    return 0xE74C3C; // vermelho
}
