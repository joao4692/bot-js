const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, EmbedBuilder } = require('discord.js');

// 🎨 SISTEMA DE EMBEDS ESTILO RIO BOT/LORITTA
class EmbedSystem {
    constructor() {
        this.themes = {
            rio: {
                name: 'Rio Bot',
                colors: {
                    primary: '#00D4FF',
                    secondary: '#0099CC',
                    success: '#00FF88',
                    warning: '#FFAA00',
                    error: '#FF4444',
                    info: '#3498DB',
                    money: '#FFD700',
                    vip: '#FFD700',
                    gradient: ['#00D4FF', '#0099CC']
                },
                emojis: {
                    success: ['✨', '🎉', '🎊', '🏆', '⭐', '💎', '🔥', '💫'],
                    error: ['❌', '⚠️', '🚫', '🛑', '❗', '⛔', '💢'],
                    money: ['💰', '💳', '💎', '🪙', '💸', '💵', '🏦', '📈', '📉', '💰'],
                    info: ['ℹ️', '📋', '📊', '📈', '🔍', '📝', '🗂️', '💎'],
                    star: ['⭐', '🌟', '✨', '💫', '🌠', '🌌', '🎆', '🌈'],
                    work: ['💼', '🏢', '👷', '👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🔧', '👩‍🔧'],
                    shop: ['🛍️', '🛒', '🏪', '🏬', '🛍️', '🛍️'],
                    heart: ['❤️', '💚', '💛', '💙', '💜', '🖤', '💔', '❣️'],
                    time: ['⏰', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖']
                }
            },
            loritta: {
                name: 'Loritta',
                colors: {
                    primary: '#FC466B',
                    secondary: '#B53471',
                    success: '#4CAF50',
                    warning: '#FF9800',
                    error: '#F44336',
                    info: '#2196F3',
                    money: '#FFD700',
                    vip: '#E91E63',
                    gradient: ['#FC466B', '#B53471']
                },
                emojis: {
                    success: ['🎉', '🎊', '✨', '💫', '🌟', '⭐', '🎆', '🎈'],
                    error: ['😢', '😭', '💔', '😿', '😞', '😥', '😫', '😱'],
                    money: ['💰', '💳', '💎', '🪙', '💸', '💵', '🏦', '📈', '💰'],
                    info: ['📋', '📊', '📈', '🔍', '📝', '🗂️', '💎', '🎯'],
                    star: ['⭐', '🌟', '✨', '💫', '🌠', '🌌', '🎆', '🌈'],
                    work: ['💼', '🏢', '👷', '👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🔧', '👩‍🔧'],
                    shop: ['🛍️', '🛒', '🏪', '🏬', '🛍️', '🛍️'],
                    heart: ['💕', '💖', '💗', '💓', '💞', '💝', '❣️', '💘'],
                    cute: ['🎀', '🌸', '🌺', '🌻', '🎈', '🎭', '🎪', '🎨']
                }
            },
            luxury: {
                name: 'Luxury',
                colors: {
                    primary: '#FFD700',
                    secondary: '#FFA500',
                    success: '#32CD32',
                    warning: '#FF8C00',
                    error: '#DC143C',
                    info: '#4169E1',
                    money: '#B8860B',
                    vip: '#FF1493',
                    gradient: ['#FFD700', '#FFA500']
                },
                emojis: {
                    success: ['👑', '🏆', '🏅', '🎖️', '🏵', '💎', '👑', '🌟'],
                    error: ['🚫', '🛑', '❗', '⛔', '💢', '⚠️', '❌', '🚳'],
                    money: ['💰', '💳', '💎', '🪙', '💸', '💵', '🏦', '📈', '👑'],
                    info: ['📋', '📊', '📈', '🔍', '📝', '🗂️', '💎', '🎯'],
                    star: ['⭐', '🌟', '✨', '💫', '🌠', '🌌', '🎆', '🌈'],
                    work: ['💼', '🏢', '👷', '👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🔧', '👩‍🔧'],
                    shop: ['🛍️', '🛒', '🏪', '🏬', '🛍️', '🛍️'],
                    crown: ['👑', '👑', '👑', '👑', '👑', '👑', '👑', '👑']
                }
            }
        };
    }

    // Criar embed básico com tema
    createBasic(title, description = '', theme = 'rio', options = {}) {
        const themeConfig = this.themes[theme];
        const emoji = options.emoji || this.getRandomEmoji('info', theme);
        
        const embed = new EmbedBuilder()
            .setColor(options.color || themeConfig.colors.primary)
            .setTitle(`${emoji} ${title}`)
            .setDescription(description)
            .setTimestamp();

        // Thumbnail personalizado
        if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        } else {
            embed.setThumbnail(this.getThemeThumbnail(theme));
        }

        // Footer personalizado
        embed.setFooter({
            text: options.footer || `${themeConfig.name} • ${new Date().toLocaleDateString('pt-BR')}`,
            iconURL: this.getThemeIcon(theme)
        });

        // Author personalizado
        if (options.author) {
            embed.setAuthor(options.author);
        }

        return embed;
    }

    // Embed de sucesso
    createSuccess(title, description, theme = 'rio', options = {}) {
        const themeConfig = this.themes[theme];
        const emoji = options.emoji || this.getRandomEmoji('success', theme);
        
        return this.createBasic(title, description, theme, {
            ...options,
            color: themeConfig.colors.success,
            thumbnail: options.thumbnail || 'https://cdn.discordapp.com/emojis/813647575465447454.gif'
        });
    }

    // Embed de erro
    createError(title, description, theme = 'rio', options = {}) {
        const themeConfig = this.themes[theme];
        const emoji = options.emoji || this.getRandomEmoji('error', theme);
        
        return this.createBasic(title, description, theme, {
            ...options,
            color: themeConfig.colors.error,
            thumbnail: options.thumbnail || 'https://cdn.discordapp.com/emojis/813647575506878464.gif'
        });
    }

    // Embed de dinheiro/economia
    createMoney(title, fields = {}, theme = 'rio', options = {}) {
        const themeConfig = this.themes[theme];
        const emoji = options.emoji || this.getRandomEmoji('money', theme);
        
        const embed = this.createBasic(title, '', theme, {
            ...options,
            color: themeConfig.colors.money,
            thumbnail: options.thumbnail || 'https://cdn.discordapp.com/emojis/813647575665737728.gif'
        });

        // Adicionar campos de forma organizada e bonita
        Object.entries(fields).forEach(([key, value], index) => {
            const fieldEmoji = this.getFieldEmoji(key, theme);
            const formattedValue = typeof value === 'number' ? `$${value.toLocaleString('pt-BR')}` : value;
            
            embed.addFields({
                name: `${fieldEmoji} ${this.formatFieldName(key)}`,
                value: formattedValue,
                inline: index % 2 === 0
            });
        });

        return embed;
    }

    // Embed de perfil
    createProfile(user, data = {}, theme = 'rio', options = {}) {
        const themeConfig = this.themes[theme];
        
        const embed = this.createBasic(`Perfil de ${user.username}`, '', theme, {
            ...options,
            color: themeConfig.colors.primary,
            thumbnail: user.displayAvatarURL({ dynamic: true, size: 256 })
        });

        // Adicionar campos do perfil de forma organizada
        if (data.economy) {
            embed.addFields({
                name: `${this.getRandomEmoji('money', theme)} 💰 Economia`,
                value: `**Carteira:** $${(data.economy.balance || 0).toLocaleString('pt-BR')}\n**Banco:** $${(data.economy.bank || 0).toLocaleString('pt-BR')}`,
                inline: true
            });
        }

        if (data.work) {
            embed.addFields({
                name: `${this.getRandomEmoji('work', theme)} 💼 Trabalho`,
                value: `**Cargo:** ${data.work.job || 'Desempregado'}\n**Salário:** $${(data.work.salary || 0).toLocaleString('pt-BR')}/hora`,
                inline: true
            });
        }

        if (data.stats) {
            const statsText = Object.entries(data.stats)
                .map(([key, value]) => `**${this.formatFieldName(key)}:** ${value}`)
                .join('\n');
            
            embed.addFields({
                name: `${this.getRandomEmoji('info', theme)} 📊 Estatísticas`,
                value: statsText,
                inline: false
            });
        }

        return embed;
    }

    // Embed de loja
    createShop(title, items = [], theme = 'rio', options = {}) {
        const themeConfig = this.themes[theme];
        const emoji = options.emoji || this.getRandomEmoji('shop', theme);
        
        const embed = this.createBasic(title, '', theme, {
            ...options,
            color: themeConfig.colors.primary,
            thumbnail: options.thumbnail || 'https://cdn.discordapp.com/emojis/813647575830949888.gif'
        });

        // Organizar itens em colunas bonitas
        items.forEach((item, index) => {
            embed.addFields({
                name: `${item.emoji || '🛍️'} ${item.name}`,
                value: `**Preço:** $${(item.price || 0).toLocaleString('pt-BR')}\n${item.description || ''}`,
                inline: index % 2 === 0
            });
        });

        return embed;
    }

    // Embed de trabalho
    createWork(title, data = {}, theme = 'rio', options = {}) {
        const themeConfig = this.themes[theme];
        const emoji = options.emoji || this.getRandomEmoji('work', theme);
        
        const embed = this.createBasic(title, '', theme, {
            ...options,
            color: themeConfig.colors.primary,
            thumbnail: options.thumbnail || 'https://cdn.discordapp.com/emojis/813647575735738378.gif'
        });

        // Adicionar campos de trabalho
        if (data.job) {
            embed.addFields({
                name: '🏢 Emprego',
                value: data.job,
                inline: true
            });
        }

        if (data.salary) {
            embed.addFields({
                name: '💰 Salário',
                value: `$${data.salary.toLocaleString('pt-BR')}`,
                inline: true
            });
        }

        if (data.performance) {
            embed.addFields({
                name: '⭐ Performance',
                value: `${data.performance}/100`,
                inline: true
            });
        }

        return embed;
    }

    // Embed de ranking
    createRanking(title, users = [], theme = 'rio', options = {}) {
        const themeConfig = this.themes[theme];
        
        const embed = this.createBasic(title, '', theme, {
            ...options,
            color: themeConfig.colors.primary,
            thumbnail: options.thumbnail || 'https://cdn.discordapp.com/emojis/813647575862788126.gif'
        });

        // Formatar ranking com medalhas
        users.forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
            embed.addFields({
                name: `${medal} #${index + 1} ${user.username}`,
                value: `**Riqueza:** $${(user.balance || 0).toLocaleString('pt-BR')}`,
                inline: false
            });
        });

        return embed;
    }

    // Embed de notificação
    createNotification(title, description, type = 'info', theme = 'rio', options = {}) {
        const themeConfig = this.themes[theme];
        const emoji = options.emoji || this.getRandomEmoji(type, theme);
        
        return this.createBasic(title, description, theme, {
            ...options,
            color: themeConfig.colors[type] || themeConfig.colors.info
        });
    }

    // Embed de carregamento
    createLoading(title, description = '', theme = 'rio', options = {}) {
        const themeConfig = this.themes[theme];
        
        return this.createBasic(title, description || 'Processando sua solicitação...', theme, {
            ...options,
            color: themeConfig.colors.primary,
            thumbnail: options.thumbnail || 'https://cdn.discordapp.com/emojis/813647575795822613.gif'
        });
    }

    // Embed customizado avançado
    createCustom(options = {}) {
        const theme = options.theme || 'rio';
        const themeConfig = this.themes[theme];
        
        return this.createBasic(options.title || '', options.description || '', theme, {
            color: options.color || themeConfig.colors.primary,
            thumbnail: options.thumbnail,
            author: options.author,
            footer: options.footer
        });
    }

    // Métodos utilitários
    getRandomEmoji(type, theme = 'rio') {
        const themeConfig = this.themes[theme];
        const emojis = themeConfig.emojis[type] || themeConfig.emojis.star;
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

    getFieldEmoji(fieldName, theme = 'rio') {
        const themeConfig = this.themes[theme];
        const emojiMap = {
            'saldo': themeConfig.emojis.money[0],
            'carteira': themeConfig.emojis.money[1],
            'banco': themeConfig.emojis.money[2],
            'emprestimo': themeConfig.emojis.money[3],
            'investimento': themeConfig.emojis.money[4],
            'trabalho': themeConfig.emojis.work[0],
            'salário': themeConfig.emojis.money[0],
            'cargo': themeConfig.emojis.work[1],
            'level': themeConfig.emojis.star[0],
            'xp': themeConfig.emojis.star[1],
            'item': '🎒',
            'compra': themeConfig.emojis.shop[0],
            'venda': themeConfig.emojis.money[5],
            'promoção': '📈',
            'bônus': '🎁',
            'multa': '📋',
            'imposto': '🧾',
            'veículo': '🚗',
            'arma': '🔫',
            'vida': themeConfig.emojis.heart[0],
            'fome': '🍔',
            'sede': '💧',
            'sono': '😴'
        };

        return emojiMap[fieldName.toLowerCase()] || themeConfig.emojis.info[0];
    }

    formatFieldName(fieldName) {
        const nameMap = {
            'saldo': 'Saldo',
            'carteira': 'Carteira',
            'banco': 'Banco',
            'emprestimo': 'Empréstimo',
            'investimento': 'Investimento',
            'trabalho': 'Trabalho',
            'salário': 'Salário',
            'cargo': 'Cargo',
            'level': 'Nível',
            'xp': 'Experiência',
            'item': 'Item',
            'compra': 'Compra',
            'venda': 'Venda',
            'promoção': 'Promoção',
            'bônus': 'Bônus',
            'multa': 'Multa',
            'imposto': 'Imposto',
            'veículo': 'Veículo',
            'arma': 'Arma',
            'vida': 'Vida',
            'fome': 'Fome',
            'sede': 'Sede',
            'sono': 'Sono'
        };

        return nameMap[fieldName.toLowerCase()] || fieldName;
    }

    getThemeThumbnail(theme) {
        const thumbnails = {
            rio: 'https://cdn.discordapp.com/emojis/741468614229381151.gif',
            loritta: 'https://cdn.discordapp.com/emojis/813647575465447454.gif',
            luxury: 'https://cdn.discordapp.com/emojis/813647575862788126.gif'
        };
        return thumbnails[theme] || thumbnails.rio;
    }

    getThemeIcon(theme) {
        const icons = {
            rio: 'https://cdn.discordapp.com/emojis/741468614229381151.gif',
            loritta: 'https://cdn.discordapp.com/emojis/741468614229381151.gif',
            luxury: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
        };
        return icons[theme] || icons.rio;
    }

    // Criar barra de progresso animada
    createProgressBar(current, max, size = 20, theme = 'rio') {
        const themeConfig = this.themes[theme];
        const percentage = Math.min(current / max, 1);
        const filled = Math.round(percentage * size);
        const empty = size - filled;
        
        const progressChar = percentage >= 1 ? '💎' : percentage >= 0.75 ? '🌟' : percentage >= 0.5 ? '⭐' : '✨';
        
        return progressChar + '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage * 100)}%`;
    }

    // Criar embed com animação
    createAnimated(title, description, animationType = 'loading', theme = 'rio', options = {}) {
        const animations = {
            loading: ['⏳', '⌛', '🔄', '⚙️'],
            success: ['✨', '🎉', '🎊', '🎆'],
            money: ['💰', '💸', '💳', '💎'],
            work: ['💼', '🏢', '👷', '🔨']
        };

        const emoji = animations[animationType] || animations.loading;
        const randomEmoji = emoji[Math.floor(Math.random() * emoji.length)];

        return this.createBasic(`${randomEmoji} ${title}`, description, theme, options);
    }
}

// Instância global do sistema
const embedSystem = new EmbedSystem();

// Exportar o sistema e as funções antigas para compatibilidade
module.exports = {
    // Novo sistema de embeds
    embedSystem,
    
    // Funções antigas para compatibilidade
    createConfirmButtons,
    createSelectMenu,
    createModal,
    validatePermissions,
    logRPActions
};

function createConfirmButtons(customIdBase = 'confirm_action', options = {}) {
  const {
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    confirmStyle = ButtonStyle.Success,
    cancelStyle = ButtonStyle.Secondary,
    confirmEmoji = null,
    cancelEmoji = null
  } = options;

  const confirmButton = new ButtonBuilder()
    .setCustomId(`${customIdBase}_yes`)
    .setLabel(confirmLabel)
    .setStyle(confirmStyle);
  
  if (confirmEmoji) confirmButton.setEmoji(confirmEmoji);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`${customIdBase}_no`)
    .setLabel(cancelLabel)
    .setStyle(cancelStyle);
  
  if (cancelEmoji) cancelButton.setEmoji(cancelEmoji);

  return new ActionRowBuilder().addComponents(confirmButton, cancelButton);
}

function createSelectMenu(customId, options, placeholder = 'Selecione uma opção') {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(options)
  );
}

function createModal(customId, title, inputs) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  const rows = inputs.map(input => {
    return new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(input.customId)
        .setLabel(input.label)
        .setStyle(input.style || TextInputStyle.Short)
        .setPlaceholder(input.placeholder || '')
        .setRequired(input.required !== false)
        .setMaxLength(input.maxLength || 100)
    );
  });
  modal.addComponents(...rows);
  return modal;
}

function validatePermissions(member, requiredPermissions = [PermissionsBitField.Flags.Administrator]) {
  return requiredPermissions.every(perm => member.permissions.has(perm));
}

function logRPActions(client, guildConfig, { title, color = '#3498db', fields = [] }) {
  if (!guildConfig?.logs?.rp) return;
  const channel = client.channels.cache.get(guildConfig.logs.rp);
  if (!channel) return;
  const embed = new EmbedBuilder().setTitle(title).setColor(color).addFields(fields).setTimestamp();
  channel.send({ embeds: [embed] });
}

module.exports = {
  createConfirmButtons,
  createSelectMenu,
  createModal,
  validatePermissions,
  logRPActions
};
