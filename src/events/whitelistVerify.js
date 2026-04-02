const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const whitelistManager = require('../data/whitelist/whitelistManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Verificar se é um botão de verificação de whitelist
        if (!interaction.isButton() || interaction.customId !== 'whitelist_verify') {
            return;
        }

        const user = interaction.user;
        const guild = interaction.guild;
        const config = whitelistManager.getGuildWhitelistConfig(guild.id);

        // Verificar se a whitelist está habilitada
        if (!config.enabled) {
            const embed = new EmbedBuilder()
                .setTitle("❌ Sistema Inativo")
                .setDescription("A whitelist não está ativada neste servidor.")
                .setColor("#ff0000");

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Verificar se o usuário está na whitelist
        const isWhitelisted = whitelistManager.isUserWhitelisted(guild.id, user.id);

        if (isWhitelisted) {
            // Usuário está na whitelist - verificar se precisa de cargo obrigatório
            if (config.requiredRole) {
                const member = guild.members.cache.get(user.id);
                const hasRequiredRole = member.roles.cache.has(config.requiredRole);

                if (!hasRequiredRole) {
                    const embed = new EmbedBuilder()
                        .setTitle("❌ Cargo Obrigatório")
                        .setDescription(`Você precisa do cargo <@&${config.requiredRole}> para completar a verificação.`)
                        .setColor("#ff0000");

                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }

            // Dar cargo de verificado
            if (config.approvedRole && config.autoRole) {
                const role = guild.roles.cache.get(config.approvedRole);
                if (role) {
                    try {
                        await guild.members.cache.get(user.id).roles.add(role);
                    } catch (error) {
                        console.error("Erro ao adicionar cargo de verificado:", error);
                    }
                }
            }

            const embed = new EmbedBuilder()
                .setTitle("✅ Verificação Concluída!")
                .setDescription(`Bem-vindo, ${user.username}! Você foi verificado com sucesso.`)
                .setColor("#00ff00")
                .setThumbnail(user.displayAvatarURL({ dynamic: true }));

            // Enviar mensagem privada
            try {
                await user.send({ embeds: [embed] });
            } catch (error) {
                // Se não conseguir enviar DM, enviar no canal
                await interaction.reply({ embeds: [embed] });
                return;
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Log se configurado
            const logChannel = guild.channels.cache.find(ch => 
                ch.name.includes('log') || ch.name.includes('verificação')
            );
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle("✅ Usuário Verificado")
                    .setDescription(`${user.tag} (${user.id}) completou a verificação`)
                    .setColor("#00ff00")
                    .setTimestamp();

                logChannel.send({ embeds: [logEmbed] });
            }

        } else {
            // Usuário NÃO está na whitelist
            const embed = new EmbedBuilder()
                .setTitle("❌ Acesso Negado")
                .setDescription("Você não está na whitelist deste servidor.\n\nPeça a um administrador para adicionar você.")
                .setColor("#ff0000")
                .setThumbnail(user.displayAvatarURL({ dynamic: true }));

            // Enviar mensagem privada
            try {
                await user.send({ embeds: [embed] });
            } catch (error) {
                // Se não conseguir enviar DM, enviar no canal
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Notificar admins sobre tentativa
            const logChannel = guild.channels.cache.find(ch => 
                ch.name.includes('log') || ch.name.includes('whitelist')
            );
            if (logChannel) {
                const alertEmbed = new EmbedBuilder()
                    .setTitle("⚠️ Tentativa de Verificação")
                    .setDescription(`${user.tag} (${user.id}) tentou se verificar mas NÃO está na whitelist`)
                    .setColor("#ff0000")
                    .setTimestamp();

                logChannel.send({ embeds: [alertEmbed] });
            }
        }
    },
};
