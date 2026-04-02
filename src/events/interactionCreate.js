const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { getGuildConfig } = require('../utils/guildConfigManager');
const { slashCommandMiddleware } = require('../utils/permissionMiddleware');
const dashboardModule = require('../commands/rp/dashboard');
const { handlePollButtonInteraction } = require('../handlers/pollInteractions');

// Importar funções do comando enquete
let handleCreatePollModal, handlePollConfigModal;
try {
    const enqueteModule = require('../commands/misc/enquete');
    handleCreatePollModal = enqueteModule.handleCreatePollModal;
    handlePollConfigModal = enqueteModule.handlePollConfigModal;
} catch (error) {
    console.log('Módulos de enquete visual não carregados:', error.message);
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            // Verificar se a interação ainda é válida
            if (!interaction || !interaction.id) {
                return;
            }

            // Verificar se a interação não expirou (Discord dá 3 segundos)
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) { // 2.5 segundos de margem
                logger.log('WARN', `Interação expirada: ${interaction.commandName || 'unknown'} (${interactionAge}ms)`);
                return;
            }

            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = client.slashCommands.get(interaction.commandName);

                if (!command) {
                    logger.log('WARN', `Comando não encontrado: ${interaction.commandName}`);
                    return;
                }

                // Check cooldowns
                const { cooldowns } = client;
                if (!cooldowns.has(command.data.name)) {
                    cooldowns.set(command.data.name, new Map());
                }

                const now = Date.now();
                const timestamps = cooldowns.get(command.data.name);
                const cooldownAmount = (command.cooldown || 3) * 1000;

                if (timestamps.has(interaction.user.id)) {
                    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        return interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#ff9900')
                                    .setTitle('⏱️ Aguarde')
                                    .setDescription(`Você precisa esperar ${timeLeft.toFixed(1)}s para usar este comando novamente.`)
                                    .setTimestamp()
                            ],
                            ephemeral: true
                        });
                    }
                }

                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

                // Apply middleware
                const middlewareResult = await slashCommandMiddleware(interaction, command);
                if (!middlewareResult.allowed) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#ff0000')
                                .setTitle('🚫 Acesso Negado')
                                .setDescription(middlewareResult.reason)
                                .setTimestamp()
                        ],
                        ephemeral: true
                    });
                }

                // Execute command
                try {
                    // Get guild config for commands that need it
                    const guildConfig = await getGuildConfig(interaction.guildId);
                    await command.execute(interaction, client, guildConfig);
                    client.stats.commandsUsed++;
                } catch (error) {
                    logger.log('ERROR', `Erro ao executar comando ${interaction.commandName}: ${error.message}`);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Erro no Comando')
                        .setDescription('Ocorreu um erro ao executar este comando.')
                        .setTimestamp();

                    try {
                        if (interaction.replied || interaction.deferred) {
                            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                        } else {
                            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                        }
                    } catch (followUpError) {
                        logger.log('ERROR', `Erro ao responder ao usuário: ${followUpError.message}`);
                        // Não fazer nada se não conseguir responder
                    }
                }

                return;
            }

            // Handle button interactions
            if (interaction.isButton()) {
                // Handle poll buttons first
                const pollHandled = await handlePollButtonInteraction(interaction, client);
                if (pollHandled) return;

                // Handle dashboard buttons
                if (interaction.customId.startsWith('dashboard_')) {
                    return await dashboardModule.buttonHandler(interaction, client);
                }

                // Handle embed-related buttons (if any)
                if (interaction.customId.startsWith('embed_')) {
                    return handleEmbedButton(interaction, client);
                }

                // Handle other buttons
                return;
            }

            // Handle select menu interactions
            if (interaction.isStringSelectMenu()) {
                // Handle embed-related menus (if any)
                if (interaction.customId.startsWith('embed_')) {
                    return handleEmbedSelectMenu(interaction, client);
                }

                // Handle other select menus
                return;
            }

            // Handle modal submissions
            if (interaction.isModalSubmit()) {
                // Handle poll creation modals
                if (interaction.customId === 'create_poll_modal') {
                    return await handleCreatePollModal(interaction, client);
                }
                
                if (interaction.customId === 'poll_config_modal') {
                    return await handlePollConfigModal(interaction, client);
                }

                // Handle embed-related modals (if any)
                if (interaction.customId.startsWith('embed_')) {
                    return handleEmbedModal(interaction, client);
                }

                // Handle other modals
                return;
            }

        } catch (error) {
            logger.log('ERROR', `Erro no interactionCreate: ${error.message}`);
            console.error(error);
        }
    }
};

// Handle embed button interactions (simplified)
async function handleEmbedButton(interaction, client) {
    try {
        // For now, just acknowledge the interaction
        // Embed system was simplified, so these buttons won't work
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Sistema de Embed Atualizado')
                    .setDescription('O sistema de embed foi simplificado. Use `/embed` para criar e gerenciar embeds.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    } catch (error) {
        logger.log('ERROR', `Erro no handleEmbedButton: ${error.message}`);
    }
}

// Handle embed select menu interactions (simplified)
async function handleEmbedSelectMenu(interaction, client) {
    try {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Sistema de Embed Atualizado')
                    .setDescription('O sistema de embed foi simplificado. Use `/embed` para criar e gerenciar embeds.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    } catch (error) {
        logger.log('ERROR', `Erro no handleEmbedSelectMenu: ${error.message}`);
    }
}

// Handle embed modal submissions (simplified)
async function handleEmbedModal(interaction, client) {
    try {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Sistema de Embed Atualizado')
                    .setDescription('O sistema de embed foi simplificado. Use `/embed` para criar e gerenciar embeds.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    } catch (error) {
        logger.log('ERROR', `Erro no handleEmbedModal: ${error.message}`);
    }
}
