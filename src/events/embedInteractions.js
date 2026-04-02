const { Events } = require('discord.js');
const { 
    handleButtonInteraction, 
    handleSelectMenuInteraction, 
    handleModalSubmit 
} = require('../handlers/embedInteractions');

/**
 * Eventos do Sistema de Embeds v2.0
 * Processa todas as interações dos componentes
 */

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Processar apenas interações do sistema de embeds
        if (!isEmbedInteraction(interaction)) {
            return;
        }

        try {
            // Defer a resposta se não for modal
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                await interaction.deferUpdate().catch(() => {});
            }

            // Redirecionar para o handler apropriado
            switch (interaction.type) {
                case 2: // Application Command
                    // Já tratado no comando principal
                    break;
                    
                case 3: // Message Component (Button, Select Menu)
                    if (interaction.isButton()) {
                        await handleButtonInteraction(interaction, client);
                    } else if (interaction.isStringSelectMenu()) {
                        await handleSelectMenuInteraction(interaction, client);
                    }
                    break;
                    
                case 5: // Modal Submit
                    await handleModalSubmit(interaction, client);
                    break;
            }

        } catch (error) {
            console.error('❌ Erro no processamento de interação:', error);
            
            // Tentar responder ao usuário sobre o erro
            try {
                const errorMessage = {
                    content: '❌ Ocorreu um erro ao processar sua solicitação. Tente novamente.',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            } catch (followUpError) {
                console.error('❌ Erro ao enviar mensagem de erro:', followUpError);
            }
        }
    }
};

/**
 * Verifica se a interação pertence ao sistema de embeds
 * @param {Interaction} interaction - Interação do Discord
 * @returns {boolean} Se é uma interação do sistema de embeds
 */
function isEmbedInteraction(interaction) {
    if (!interaction.customId) return false;

    const embedPrefixes = [
        'embed_',
        'color_select',
        'template_select',
        'embed_modal'
    ];

    return embedPrefixes.some(prefix => interaction.customId.startsWith(prefix));
}
