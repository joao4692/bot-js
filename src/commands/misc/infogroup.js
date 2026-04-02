const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infogroup')
        .setDescription('Exibe informações completas do servidor'),

    async execute(interaction) {
        const guild = interaction.guild;

        if (!guild) {
            return interaction.reply({
                content: 'Este comando só pode ser usado em servidores.',
                ephemeral: true
            });
        }

        // 🔥 Carrega TODOS os membros do servidor
        await guild.members.fetch();

        const owner = await guild.fetchOwner();

        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humanos = guild.members.cache.filter(m => !m.user.bot).size;

        const embed = {
            color: 0xFFFFFF,
            title: '📊 Informações do Servidor',
            thumbnail: {
                url: guild.iconURL({ dynamic: true })
            },
            fields: [
                { name: '📛 Nome', value: guild.name, inline: true },
                { name: '🆔 ID', value: guild.id, inline: true },
                { name: '👑 Dono', value: owner.user.tag, inline: true },

                { name: '👥 Membros', value: `${guild.memberCount}`, inline: true },
                { name: '🤖 Bots', value: `${bots}`, inline: true },
                { name: '👤 Humanos', value: `${humanos}`, inline: true },

                { name: '🎭 Cargos', value: `${guild.roles.cache.size}`, inline: true },
                { name: '💬 Canais', value: `${guild.channels.cache.size}`, inline: true },
                { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },

                { name: '🌍 Região', value: guild.preferredLocale, inline: true },
                { name: '🔞 NSFW', value: `${guild.nsfwLevel}`, inline: true },

                {
                    name: '📅 Criado em',
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
                }
            ],
            footer: {
                text: `Pedido por ${interaction.user.tag}`,
                icon_url: interaction.user.displayAvatarURL({ dynamic: true })
            },
            timestamp: new Date()
        };

        await interaction.reply({ embeds: [embed] });
    }
};
