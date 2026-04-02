const { SlashCommandBuilder, ChannelType, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Cria um JSON com o layout do servidor'),

    async execute(interaction) {
        const guild = interaction.guild;

        if (!guild) {
            return interaction.reply({ content: 'Esse comando só pode ser usado em servidores.', ephemeral: true });
        }

        // Roles
        const roles = guild.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => ({
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                permissions: role.permissions.bitfield.toString()
            }));

        // Categorias
        const categories = guild.channels.cache
            .filter(ch => ch.type === ChannelType.GuildCategory)
            .map(category => ({
                id: category.id,
                name: category.name
            }));

        // Canais
        const channels = guild.channels.cache
            .filter(ch => ch.type !== ChannelType.GuildCategory)
            .map(channel => ({
                name: channel.name,
                type: channel.type,
                parent: channel.parent ? channel.parent.name : null
            }));

        const layout = {
            server: guild.name,
            roles,
            categories,
            channels
        };

        // Salvar na pasta json
        const jsonDir = path.join(__dirname, '../json/layouts');
        if (!fs.existsSync(jsonDir)) {
            fs.mkdirSync(jsonDir, { recursive: true });
        }
        const fileName = `${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_layout.json`;
        const filePath = path.join(jsonDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(layout, null, 4));

        const jsonBuffer = Buffer.from(JSON.stringify(layout, null, 4));
        const attachment = new AttachmentBuilder(jsonBuffer, { name: 'layout.json' });

        await interaction.reply({
            content: 'Layout do servidor gerado com sucesso! Arquivo salvo na pasta layouts.',
            files: [attachment]
        });
    }
};
