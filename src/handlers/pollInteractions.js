const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const pollManager = require('../utils/pollManager');

async function handlePollButtonInteraction(interaction, client) {
    const customId = interaction.customId;

    if (!customId.startsWith('poll_')) {
        return false;
    }

    try {
        if (customId.startsWith('poll_vote_')) {
            await handleVote(interaction, client);
            return true;
        }

        if (customId === 'poll_clear_votes') {
            await handleClearVotes(interaction, client);
            return true;
        }

        if (customId.startsWith('poll_results_')) {
            await handlePollResults(interaction, client);
            return true;
        }

        if (customId.startsWith('poll_end_')) {
            await handleEndPoll(interaction, client);
            return true;
        }

        // Adicionar suporte para refresh de enquetes
        if (customId.startsWith('poll_refresh_')) {
            await handleRefreshPoll(interaction, client);
            return true;
        }

        // Adicionar suporte para ver detalhes
        if (customId.startsWith('poll_details_')) {
            await handlePollDetails(interaction, client);
            return true;
        }

    } catch (error) {
        console.error('Erro ao processar interação da enquete:', error);
        
        // Tentar responder ao usuário de forma segura
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Erro na Enquete')
                            .setDescription('Ocorreu um erro ao processar sua interação. Tente novamente.')
                            .addFields(
                                { name: '🔍 Detalhes:', value: error.message, inline: false }
                            )
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Erro na Enquete')
                            .setDescription('Ocorreu um erro ao processar sua interação. Tente novamente.')
                            .addFields(
                                { name: '🔍 Detalhes:', value: error.message, inline: false }
                            )
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Erro ao responder ao usuário:', replyError);
            // Último recurso - não fazer nada para evitar crash
        }
    }

    return false;
}

async function handleVote(interaction, client) {
    const optionIndex = parseInt(interaction.customId.replace('poll_vote_', ''));
    const messageId = interaction.message.id;

    const poll = pollManager.getPollByMessage(messageId);
    
    if (!poll) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Enquete Não Encontrada')
                    .setDescription('Esta enquete não foi encontrada ou foi removida.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (!poll.active) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Enquete Encerrada')
                    .setDescription('Esta enquete já foi encerrada e não aceita mais votos.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (poll.endsAt && new Date() > new Date(poll.endsAt)) {
        poll.active = false;
        pollManager.savePolls();
        
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Enquete Encerrada')
                    .setDescription('O tempo para votar nesta enquete acabou.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const userVotes = pollManager.getUserVotes(poll.id, interaction.user.id);
    const hasVoted = userVotes.includes(optionIndex);

    let result;
    if (hasVoted) {
        result = pollManager.removeVote(poll.id, interaction.user.id, optionIndex);
    } else {
        result = pollManager.vote(poll.id, interaction.user.id, optionIndex);
    }

    if (!result.success) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro ao Votar')
                    .setDescription(result.error)
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    await updatePollMessage(interaction, client, poll);

    const voteStatus = hasVoted ? 'removido' : 'registrado';
    const optionEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][optionIndex] || '📌';

    await interaction.followUp({
        embeds: [
            new EmbedBuilder()
                .setColor(hasVoted ? '#ff9900' : '#00ff00')
                .setTitle(`${hasVoted ? '🗑️ Voto Removido' : '✅ Voto Registrado'}`)
                .setDescription(`Seu voto foi ${voteStatus} com sucesso!`)
                .addFields(
                    { name: '📊 Opção:', value: `${optionEmoji} ${poll.options[optionIndex]}`, inline: true },
                    { name: '📈 Status:', value: hasVoted ? 'Você não vota mais nesta opção' : 'Seu voto foi contabilizado', inline: true }
                )
                .setTimestamp()
        ],
        ephemeral: true
    });
}

async function handleClearVotes(interaction, client) {
    const messageId = interaction.message.id;

    const poll = pollManager.getPollByMessage(messageId);
    
    if (!poll) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Enquete Não Encontrada')
                    .setDescription('Esta enquete não foi encontrada ou foi removida.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (!poll.active) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Enquete Encerrada')
                    .setDescription('Esta enquete já foi encerrada.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const userVotes = pollManager.getUserVotes(poll.id, interaction.user.id);
    
    if (userVotes.length === 0) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Nenhum Voto para Limpar')
                    .setDescription('Você não votou nesta enquete ainda.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    delete poll.votes[interaction.user.id];
    pollManager.savePolls();

    await updatePollMessage(interaction, client, poll);

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🗑️ Votos Limpos')
                .setDescription('Todos os seus votos nesta enquete foram removidos com sucesso!')
                .addFields(
                    { name: '📊 Enquete:', value: poll.title, inline: true },
                    { name: '🗑️ Votos removidos:', value: `${userVotes.length} voto(s)`, inline: true }
                )
                .setTimestamp()
        ],
        ephemeral: true
    });
}

async function handlePollResults(interaction, client) {
    const messageId = interaction.customId.replace('poll_results_', '');

    const poll = pollManager.getPollByMessage(messageId);
    
    if (!poll) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Enquete Não Encontrada')
                    .setDescription('Esta enquete não foi encontrada ou foi removida.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const results = pollManager.getResults(poll.id);

    const resultsEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`📊 Resultados: ${poll.title}`)
        .setAuthor({
            name: `Enquete criada por ${client.users.cache.get(poll.authorId)?.username || 'Desconhecido'}`,
            iconURL: client.users.cache.get(poll.authorId)?.displayAvatarURL()
        });

    if (poll.description) {
        resultsEmbed.setDescription(poll.description);
    }

    const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    const optionsFields = results.results.map((result, index) => {
        const emoji = optionEmojis[index] || '📌';
        const bar = '█'.repeat(Math.round(result.percentage / 10));
        const emptyBar = '░'.repeat(10 - Math.round(result.percentage / 10));
        return `${emoji} **${result.option}**\n\`${bar}${emptyBar}\` ${result.votes} votos (${result.percentage.toFixed(1)}%)`;
    });

    resultsEmbed.addFields(
        { name: '📋 Resultados:', value: optionsFields.join('\n\n'), inline: false }
    );

    resultsEmbed.addFields(
        { name: '📊 Estatísticas:', 
            value: `🗳️ **Total de votos:** ${results.totalVotes}\n` +
                   `👥 **Participantes:** ${Object.keys(results.votes || {}).length}\n` +
                   `📈 **Status:** ${results.active ? '🟢 Ativa' : '🔴 Encerrada'}`,
            inline: false }
    );

    if (results.totalVotes > 0) {
        const winner = results.results.reduce((a, b) => a.votes > b.votes ? a : b);
        resultsEmbed.addFields(
            { name: '🏆 Lider Atual:', value: `**${winner.option}** com ${winner.votes} votos (${winner.percentage.toFixed(1)}%)`, inline: false }
        );
    }

    resultsEmbed.setFooter({ 
        text: `ID: ${poll.id} • Solicitado por: ${interaction.user.username}`,
        iconURL: client.user.displayAvatarURL()
    });

    resultsEmbed.setTimestamp();

    await interaction.reply({
        embeds: [resultsEmbed],
        ephemeral: true
    });
}

async function handleEndPoll(interaction, client) {
    const messageId = interaction.customId.replace('poll_end_', '');

    const poll = pollManager.getPollByMessage(messageId);
    
    if (!poll) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Enquete Não Encontrada')
                    .setDescription('Esta enquete não foi encontrada ou foi removida.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (!poll.active) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Enquete Já Encerrada')
                    .setDescription('Esta enquete já foi encerrada anteriormente.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (poll.authorId !== interaction.user.id && !interaction.member.permissions.has('ManageMessages')) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Sem Permissão')
                    .setDescription('Apenas o criador da enquete ou usuários com permissão de gerenciar mensagens podem encerrá-la.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const result = pollManager.endPoll(poll.id);

    if (result.success) {
        const endedPoll = result.poll;
        const results = pollManager.getResults(poll.id);

        await updatePollMessage(interaction, client, endedPoll, true);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Enquete Encerrada')
                    .setDescription(`A enquete "${endedPoll.title}" foi encerrada com sucesso!`)
                    .addFields(
                        { name: '📊 Total de Votos:', value: `${results.totalVotes} votos`, inline: true },
                        { name: '🏆 Vencedor:', value: results.results.length > 0 ? 
                            results.results.reduce((a, b) => a.votes > b.votes ? a : b).option : 
                            'Nenhum voto', inline: true }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    } else {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro ao Encerrar')
                    .setDescription(result.error)
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }
}

async function updatePollMessage(interaction, client, poll, forceEnd = false) {
    try {
        const channel = await client.channels.fetch(poll.channelId).catch(() => null);
        if (!channel) return;

        const message = await channel.messages.fetch(poll.messageId).catch(() => null);
        if (!message) return;

        const results = pollManager.getResults(poll.id);
        const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        const optionsFields = results.results.map((result, index) => {
            const emoji = optionEmojis[index] || '📌';
            return `${emoji} **${result.option}** - ${result.votes} votos (${result.percentage.toFixed(1)}%)`;
        });

        const updatedEmbed = EmbedBuilder.from(message.embeds[0])
            .spliceFields(0, 1, { name: '📋 Opções:', value: optionsFields.join('\n'), inline: false });

        if (forceEnd || !poll.active) {
            updatedEmbed.setColor('#ff6600');
            updatedEmbed.spliceFields(3, 1, { name: '📈 Status:', value: '🔴 **Encerrada**', inline: false });
            updatedEmbed.addFields(
                { name: '🏆 Resultado Final:', value: `Total de votos: ${results.totalVotes}`, inline: false }
            );
            updatedEmbed.setFooter({ 
                text: `Enquete encerrada • ID: ${poll.messageId}`,
                iconURL: client.user.displayAvatarURL()
            });

            await message.edit({
                embeds: [updatedEmbed],
                components: []
            });
        } else {
            updatedEmbed.spliceFields(3, 1, { name: '📈 Status:', value: '🟢 **Ativa**', inline: false });

            const buttons = [];
            for (let i = 0; i < poll.options.length; i++) {
                const userVoted = results.votes[interaction.user.id] && results.votes[interaction.user.id].includes(i);
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`poll_vote_${i}`)
                        .setLabel(`${i + 1}`)
                        .setEmoji(optionEmojis[i] || '📌')
                        .setStyle(userVoted ? ButtonStyle.Success : ButtonStyle.Primary)
                );
            }

            if (poll.multipleVotes) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('poll_clear_votes')
                        .setLabel('🗑️ Limpar')
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            const rows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
            }

            await message.edit({
                embeds: [updatedEmbed],
                components: rows
            });
        }
    } catch (error) {
        console.error('Erro ao atualizar mensagem da enquete:', error);
    }
}

// Nova função para refresh de enquete
async function handleRefreshPoll(interaction, client) {
    const messageId = interaction.customId.replace('poll_refresh_', '');
    
    try {
        const poll = pollManager.getPollByMessage(messageId);
        if (!poll) {
            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Enquete Não Encontrada')
                        .setDescription('Esta enquete não foi encontrada ou foi removida.')
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }

        await updatePollMessage(interaction, client, poll, false);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Enquete Atualizada')
                    .setDescription('A enquete foi atualizada com os dados mais recentes.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    } catch (error) {
        console.error('Erro ao atualizar enquete:', error);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro ao Atualizar')
                    .setDescription('Não foi possível atualizar a enquete.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }
}

// Nova função para ver detalhes da enquete
async function handlePollDetails(interaction, client) {
    const messageId = interaction.customId.replace('poll_details_', '');
    
    try {
        const poll = pollManager.getPollByMessage(messageId);
        if (!poll) {
            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Enquete Não Encontrada')
                        .setDescription('Esta enquete não foi encontrada ou foi removida.')
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }

        const results = pollManager.getResults(poll.id);
        const creator = client.users.cache.get(poll.authorId);

        const detailsEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📊 Detalhes da Enquete: ${poll.title}`)
            .setAuthor({
                name: `Criada por: ${creator?.username || 'Desconhecido'}`,
                iconURL: creator?.displayAvatarURL()
            });

        if (poll.description) {
            detailsEmbed.setDescription(poll.description);
        }

        detailsEmbed.addFields(
            { name: '📋 Opções:', value: poll.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n'), inline: false },
            { name: '⚙️ Configurações:', 
                value: `🔐 **Anônima:** ${poll.anonymous ? 'Sim' : 'Não'}\n` +
                       `🔄 **Múltiplos votos:** ${poll.multipleVotes ? 'Sim' : 'Não'}\n` +
                       `⏰ **Duração:** ${poll.duration ? `${poll.duration/60000} minutos` : 'Ilimitada'}`,
                inline: false },
            { name: '📈 Estatísticas:', 
                value: `🗳️ **Total de votos:** ${results.totalVotes}\n` +
                       `👥 **Participantes únicos:** ${Object.keys(results.votes || {}).length}\n` +
                       `📅 **Criada em:** ${new Date(poll.createdAt).toLocaleString('pt-BR')}\n` +
                       `📊 **Status:** ${results.active ? '🟢 Ativa' : '🔴 Encerrada'}`,
                inline: false }
        );

        if (poll.endsAt) {
            const timeLeft = new Date(poll.endsAt) - new Date();
            if (timeLeft > 0) {
                detailsEmbed.addFields(
                    { name: '⏰ Tempo Restante:', value: `${Math.floor(timeLeft / 60000)} minutos`, inline: false }
                );
            }
        }

        if (results.totalVotes > 0) {
            const winner = results.results.reduce((a, b) => a.votes > b.votes ? a : b);
            detailsEmbed.addFields(
                { name: '🏆 Lider Atual:', value: `**${winner.option}** com ${winner.votos} votos (${winner.percentage.toFixed(1)}%)`, inline: false }
            );
        }

        detailsEmbed.setFooter({ 
            text: `ID: ${poll.id} • Solicitado por: ${interaction.user.username}`,
            iconURL: client.user.displayAvatarURL()
        });

        detailsEmbed.setTimestamp();

        await interaction.reply({
            embeds: [detailsEmbed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Erro ao mostrar detalhes da enquete:', error);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro ao Carregar Detalhes')
                    .setDescription('Não foi possível carregar os detalhes da enquete.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }
}

module.exports = {
    handlePollButtonInteraction,
    updatePollMessage,
    handleRefreshPoll,
    handlePollDetails
};
