const { Events, EmbedBuilder } = require("discord.js");
const whitelistManager = require('../data/whitelist/whitelistManager');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const guild = member.guild;
        const config = whitelistManager.getGuildWhitelistConfig(guild.id);

        // Se whitelist não está habilitada, não fazer nada
        if (!config.enabled) {
            return;
        }

        const isWhitelisted = whitelistManager.isUserWhitelisted(guild.id, member.id);

        if (!isWhitelisted) {
            // Usuário NÃO está na whitelist - enviar DM negando acesso
            const dmEmbed = new EmbedBuilder()
                .setTitle("❌ Acesso Negado")
                .setDescription(`Olá ${member.user.username}, você não está na whitelist de ${guild.name}.\n\nPara ter acesso ao servidor, você precisa ser adicionado à whitelist por um administrador.`)
                .setColor("#ff0000")
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .setFooter({ text: "Sistema de Whitelist" })
                .setTimestamp();

            try {
                await member.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Não foi possível enviar DM para ${member.user.tag}`);
            }

            // Log da tentativa de entrada sem whitelist
            const logChannel = guild.channels.cache.find(ch =>
                ch.name.includes('log') || ch.name.includes('whitelist')
            );
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle("🚫 Tentativa de entrada (Sem Whitelist)")
                    .setDescription(`${member.user.tag} (${member.id}) tentou entrar mas não está na whitelist`)
                    .setColor("#ff0000")
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] });
            }
            // Não expulsar o usuário
        } else {
            // Usuário está na whitelist - enviar boas-vindas
            const welcomeEmbed = new EmbedBuilder()
                .setTitle("✅ Bem-vindo!")
                .setDescription(`Olá ${member.user.username}, seja bem-vindo a ${guild.name}!`)
                .setColor("#00ff00")
                .setThumbnail(member.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "Sistema de Whitelist" })
                .setTimestamp();

            try {
                await member.send({ embeds: [welcomeEmbed] });
            } catch (error) {
                console.log(`Não foi possível enviar DM de boas-vindas para ${member.user.tag}`);
            }

            // Log
            const logChannel = guild.channels.cache.find(ch =>
                ch.name.includes('log') || ch.name.includes('welcome')
            );

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle("✅ Membro Verificado")
                    .setDescription(`${member.user.tag} (${member.id}) entrou e foi verificado automaticamente`)
                    .setColor("#00ff00")
                    .setTimestamp();

                logChannel.send({ embeds: [logEmbed] });
            }
        }
    },
};
