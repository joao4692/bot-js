const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const helper = require('../../utils/economy');

module.exports = {
    ...helper,
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Painel rápido da economia (configurações e modo)')
        .addSubcommand(sub =>
            sub
                .setName('config')
                .setDescription('Ver as configurações de economia deste servidor')
        )
        .addSubcommand(sub =>
            sub
                .setName('setmodo')
                .setDescription('[ADMIN] Definir modo da economia (local/global/interconnected)')
                .addStringOption(opt =>
                    opt
                        .setName('modo')
                        .setDescription('Modo da economia')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌍 Local', value: 'local' },
                            { name: '🌎 Global', value: 'global' },
                            { name: '🔗 Interligado', value: 'interconnected' }
                        )
                )
        ),

    async execute(interaction, client, guildConfig) {
        const sub = interaction.options.getSubcommand();
        const currency = guildConfig?.economy?.currency || '💰';

        if (sub === 'config') {
            const econ = guildConfig?.economy || {};
            const embed = new EmbedBuilder()
                .setColor(guildConfig?.embedColor || '#3498db')
                .setTitle('⚙️ Configuração de Economia')
                .addFields(
                    { name: 'Modo', value: String(econ.mode || 'local'), inline: true },
                    { name: 'Moeda', value: String(econ.currency || '💰'), inline: true },
                    { name: 'Daily', value: String(econ.dailyReward ?? 100), inline: true }
                )
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'setmodo') {
            if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Você precisa ser Admin para usar isso.', ephemeral: true });
            }
            const { saveGuildConfig } = require('../../utils/guildConfigManager');
            const modo = interaction.options.getString('modo');
            guildConfig.economy = guildConfig.economy || {};
            guildConfig.economy.mode = modo;
            await saveGuildConfig(interaction.guild.id, guildConfig);
            return interaction.reply({ content: `✅ Modo de economia atualizado para: ${modo}`, ephemeral: true });
        }
    }
};
