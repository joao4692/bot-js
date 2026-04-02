const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('[ADMIN] Reload enterprise: tudo, comandos, eventos, plugins, serviços, dashboard, middlewares.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('O que recarregar: tudo, comandos, eventos, plugins, serviços, dashboard, middlewares.')
                .setRequired(true)
                .addChoices(
                    { name: 'Tudo', value: 'tudo' },
                    { name: 'Comandos', value: 'comandos' },
                    { name: 'Eventos', value: 'eventos' },
                    { name: 'Plugins', value: 'plugins' },
                    { name: 'Serviços', value: 'servicos' },
                    { name: 'Dashboard', value: 'dashboard' },
                    { name: 'Middlewares', value: 'middlewares' }
                )),


    async execute(interaction, client) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
        }
        const tipo = interaction.options.getString('tipo');
        try {
            let msg = '';
            if (tipo === 'tudo') {
                await client.loadCommands();
                await client.loadEvents();
                await client.loadPlugins();
                await client.loadServices();
                await client.loadMiddlewares();
                try { require('../../dashboard/server'); } catch {}
                msg = 'Tudo recarregado!';
            } else if (tipo === 'comandos') {
                await client.loadCommands();
                msg = 'Comandos recarregados!';
            } else if (tipo === 'eventos') {
                await client.loadEvents();
                msg = 'Eventos recarregados!';
            } else if (tipo === 'plugins') {
                await client.loadPlugins();
                msg = 'Plugins recarregados!';
            } else if (tipo === 'servicos') {
                await client.loadServices();
                msg = 'Serviços recarregados!';
            } else if (tipo === 'dashboard') {
                try { require('../../dashboard/server'); msg = 'Dashboard recarregada!'; } catch { msg = 'Falha ao recarregar dashboard.'; }
            } else if (tipo === 'middlewares') {
                await client.loadMiddlewares();
                msg = 'Middlewares recarregados!';
            }
            await interaction.reply({ content: msg, ephemeral: true });
            client.log('SUCCESS', `Reload enterprise (${tipo}) executado via comando admin.`);
        } catch (err) {
            await interaction.reply({ content: 'Erro ao recarregar: ' + err.message, ephemeral: true });
            client.log('ERROR', 'Erro no reload enterprise: ' + err.message);
        }
    }
};
