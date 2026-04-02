const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class EmbedSystem {
    constructor() {
        this.colors = {
            primary: '#5865F2',      // Azul principal
            secondary: '#9333EA',    // Roxo secundário  
            success: '#2ECC71',      // Verde sucesso
            warning: '#F39C12',      // Laranja aviso
            error: '#E74C3C',        // Vermelho erro
            info: '#3498DB',         // Azul info
            money: '#F1C40F',        // Amarelo dinheiro
            vip: '#FFD700',          // Dourado VIP
            gradient1: '#667EEA',     // Gradiente 1
            gradient2: '#764BA2',     // Gradiente 2
            dark: '#2C3E50',         // Escuro
            light: '#ECF0F1'         // Claro
        };

        this.emojis = {
            money: ['💰', '💳', '💎', '🪙', '💸', '💵', '🏦', '📈', '📉'],
            success: ['✅', '🎉', '🎊', '🏆', '⭐', '✨', '🎯', '🔥'],
            error: ['❌', '⚠️', '🚫', '🛑', '📛', '❗', '⛔'],
            info: ['ℹ️', '📋', '📊', '📈', '📉', '🔍', '📝', '🗂️'],
            rp: ['🎭', '🏙️', '🌆', '🌃', '🏘️', '🌉', '🌌', '🌆', '🌃'],
            work: ['💼', '🏢', '👷', '👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🔧', '👩‍🔧'],
            shop: ['🛍️', '🛒', '🛒', '🛍️', '🏪', '🏬', '🛍️'],
            vehicles: ['🚗', '🚙', '🚕', '🏎️', '🚓', '🏍️', '🛵', '🚐'],
            weapons: ['🔫', '🔪', '🗡️', '⚔️', '🏹', '🏹', '🎯', '🔫'],
            social: ['👥', '👤', '👥', '🔗', '💬', '📢', '📣', '📢'],
            time: ['⏰', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖'],
            star: ['⭐', '🌟', '✨', '💫', '🌠', '🌌', '🌃', '🌆'],
            crown: ['👑', '👑', '👑', '👑', '👑', '👑', '👑', '👑']
        };

        this.themes = {
            rio: {
                name: 'Rio Bot',
                colors: {
                    primary: '#00D4FF',
                    secondary: '#0099CC',
                    success: '#00FF88',
                    warning: '#FFAA00',
                    error: '#FF4444'
                },
                style: 'modern'
            },
            loritta: {
                name: 'Loritta',
                colors: {
                    primary: '#FC466B',
                    secondary: '#B53471',
                    success: '#4CAF50',
                    warning: '#FF9800',
                    error: '#F44336'
                },
                style: 'cute'
            },
            luxury: {
                name: 'Luxury',
                colors: {
                    primary: '#FFD700',
                    secondary: '#FFA500',
                    success: '#32CD32',
                    warning: '#FF8C00',
                    error: '#DC143C'
                },
                style: 'premium'
            }
        };
    }

    // Criar embed básico com tema
    createBasic(title, description = '', theme = 'rio') {
        const themeConfig = this.themes[theme];
        
        return new EmbedBuilder()
            .setColor(themeConfig.colors.primary)
            .setTitle(`${this.getRandomEmoji('star')} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ 
                text: `${themeConfig.name} • ${new Date().toLocaleDateString('pt-BR')}`,
                iconURL: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
            });
    }

    // Embed de sucesso
    createSuccess(title, description, theme = 'rio') {
        const themeConfig = this.themes[theme];
        const emoji = this.getRandomEmoji('success');
        
        return new EmbedBuilder()
            .setColor(themeConfig.colors.success)
            .setTitle(`${emoji} ${title}`)
            .setDescription(description)
            .addFields({
                name: '✨ Status',
                value: 'Operação concluída com sucesso!',
                inline: false
            })
            .setThumbnail('https://cdn.discordapp.com/emojis/813647575465447454.gif')
            .setTimestamp()
            .setFooter({ 
                text: `${themeConfig.name} • Sucesso!`,
                iconURL: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
            });
    }

    // Embed de erro
    createError(title, description, theme = 'rio') {
        const themeConfig = this.themes[theme];
        const emoji = this.getRandomEmoji('error');
        
        return new EmbedBuilder()
            .setColor(themeConfig.colors.error)
            .setTitle(`${emoji} ${title}`)
            .setDescription(description)
            .addFields({
                name: '⚠️ Alerta',
                value: 'Ocorreu um erro durante a operação.',
                inline: false
            })
            .setThumbnail('https://cdn.discordapp.com/emojis/813647575506878464.gif')
            .setTimestamp()
            .setFooter({ 
                text: `${themeConfig.name} • Erro!`,
                iconURL: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
            });
    }

    // Embed de dinheiro/economia
    createMoney(title, fields = {}, theme = 'rio') {
        const themeConfig = this.themes[theme];
        const emoji = this.getRandomEmoji('money');
        
        const embed = new EmbedBuilder()
            .setColor(themeConfig.colors.primary) // Corrigido: money não existe nos temas
            .setTitle(`${emoji} ${title}`)
            .setThumbnail('https://cdn.discordapp.com/emojis/813647575665737728.gif')
            .setTimestamp()
            .setFooter({ 
                text: `${themeConfig.name} • Economia`,
                iconURL: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
            });

        // Adicionar campos de forma organizada
        Object.entries(fields).forEach(([key, value], index) => {
            const fieldEmoji = this.getFieldEmoji(key);
            embed.addFields({
                name: `${fieldEmoji} ${this.formatFieldName(key)}`,
                value: typeof value === 'number' ? `$${value.toLocaleString('pt-BR')}` : value,
                inline: index % 2 === 0
            });
        });

        return embed;
    }

    // Embed de perfil
    createProfile(user, data = {}, theme = 'rio') {
        const themeConfig = this.themes[theme];
        
        const embed = new EmbedBuilder()
            .setColor(themeConfig.colors.primary)
            .setTitle(`${this.getRandomEmoji('star')} Perfil de ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setTimestamp()
            .setFooter({ 
                text: `${themeConfig.name} • Perfil`,
                iconURL: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
            });

        // Adicionar campos do perfil de forma organizada
        if (data.economy) {
            embed.addFields({
                name: `${this.getRandomEmoji('money')} 💰 Economia`,
                value: `**Carteira:** $${data.economy.balance?.toLocaleString('pt-BR') || 0}\n**Banco:** $${data.economy.bank?.toLocaleString('pt-BR') || 0}`,
                inline: true
            });
        }

        if (data.work) {
            embed.addFields({
                name: `${this.getRandomEmoji('work')} 💼 Trabalho`,
                value: `**Cargo:** ${data.work.job || 'Desempregado'}\n**Salário:** $${data.work.salary?.toLocaleString('pt-BR') || 0}/hora`,
                inline: true
            });
        }

        if (data.stats) {
            const statsText = Object.entries(data.stats)
                .map(([key, value]) => `**${this.formatFieldName(key)}:** ${value}`)
                .join('\n');
            
            embed.addFields({
                name: `${this.getRandomEmoji('info')} 📊 Estatísticas`,
                value: statsText,
                inline: false
            });
        }

        return embed;
    }

    // Embed de loja
    createShop(title, items = [], theme = 'rio') {
        const themeConfig = this.themes[theme];
        const emoji = this.getRandomEmoji('shop');
        
        const embed = new EmbedBuilder()
            .setColor(themeConfig.colors.primary)
            .setTitle(`${emoji} ${title}`)
            .setThumbnail('https://cdn.discordapp.com/emojis/813647575830949888.gif')
            .setTimestamp()
            .setFooter({ 
                text: `${themeConfig.name} • Loja`,
                iconURL: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
            });

        // Organizar itens em colunas
        items.forEach((item, index) => {
            embed.addFields({
                name: `${item.emoji || '🛍️'} ${item.name}`,
                value: `**Preço:** $${item.price?.toLocaleString('pt-BR') || 0}\n${item.description || ''}`,
                inline: index % 2 === 0
            });
        });

        return embed;
    }

    // Embed de trabalho
    createWork(title, data = {}, theme = 'rio') {
        const themeConfig = this.themes[theme];
        const emoji = this.getRandomEmoji('work');
        
        const embed = new EmbedBuilder()
            .setColor(themeConfig.colors.primary)
            .setTitle(`${emoji} ${title}`)
            .setThumbnail('https://cdn.discordapp.com/emojis/813647575735738378.gif')
            .setTimestamp()
            .setFooter({ 
                text: `${themeConfig.name} • Trabalho`,
                iconURL: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
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
    createRanking(title, users = [], theme = 'rio') {
        const themeConfig = this.themes[theme];
        
        const embed = new EmbedBuilder()
            .setColor(themeConfig.colors.primary)
            .setTitle(`${this.getRandomEmoji('crown')} ${title}`)
            .setThumbnail('https://cdn.discordapp.com/emojis/813647575862788126.gif')
            .setTimestamp()
            .setFooter({ 
                text: `${themeConfig.name} • Ranking`,
                iconURL: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
            });

        // Formatar ranking
        users.forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
            embed.addFields({
                name: `${medal} #${index + 1} ${user.username}`,
                value: `**Riqueza:** $${user.balance?.toLocaleString('pt-BR') || 0}`,
                inline: false
            });
        });

        return embed;
    }

    // Embed de notificação
    createNotification(title, description, type = 'info', theme = 'rio') {
        const themeConfig = this.themes[theme];
        const emoji = this.getRandomEmoji(type);
        
        return new EmbedBuilder()
            .setColor(themeConfig.colors[type] || themeConfig.colors.info)
            .setTitle(`${emoji} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ 
                text: `${themeConfig.name} • Notificação`,
                iconURL: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
            });
    }

    // Embed de carregamento
    createLoading(title, description = '', theme = 'rio') {
        const themeConfig = this.themes[theme];
        
        return new EmbedBuilder()
            .setColor(themeConfig.colors.primary)
            .setTitle(`⏳ ${title}`)
            .setDescription(description || 'Processando sua solicitação...')
            .setThumbnail('https://cdn.discordapp.com/emojis/813647575795822613.gif')
            .setTimestamp()
            .setFooter({ 
                text: `${themeConfig.name} • Carregando...`,
                iconURL: 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
            });
    }

    // Embed customizado avançado
    createCustom(options = {}) {
        const theme = options.theme || 'rio';
        const themeConfig = this.themes[theme];
        
        const embed = new EmbedBuilder()
            .setColor(options.color || themeConfig.colors.primary)
            .setTitle(options.title ? `${this.getRandomEmoji(options.emojiType || 'star')} ${options.title}` : undefined)
            .setDescription(options.description)
            .setTimestamp();

        if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        }

        if (options.image) {
            embed.setImage(options.image);
        }

        if (options.author) {
            embed.setAuthor(options.author);
        }

        if (options.fields) {
            options.fields.forEach((field, index) => {
                const fieldEmoji = this.getFieldEmoji(field.name);
                embed.addFields({
                    name: `${fieldEmoji} ${field.name}`,
                    value: typeof field.value === 'number' ? `$${field.value.toLocaleString('pt-BR')}` : field.value,
                    inline: field.inline !== undefined ? field.inline : index % 2 === 0
                });
            });
        }

        embed.setFooter({
            text: options.footer || `${themeConfig.name} • ${new Date().toLocaleDateString('pt-BR')}`,
            iconURL: options.footerIcon || 'https://cdn.discordapp.com/emojis/741468614229381151.gif'
        });

        return embed;
    }

    // Métodos utilitários
    getRandomEmoji(type) {
        const emojis = this.emojis[type] || this.emojis.star;
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

    getFieldEmoji(fieldName) {
        const emojiMap = {
            'saldo': '💰',
            'carteira': '💵',
            'banco': '🏦',
            'emprestimo': '💳',
            'investimento': '📈',
            'trabalho': '💼',
            'salário': '💰',
            'cargo': '🏢',
            'level': '⭐',
            'xp': '✨',
            'item': '🎒',
            'compra': '🛍️',
            'venda': '💸',
            'promoção': '📈',
            'bônus': '🎁',
            'multa': '📋',
            'imposto': '🧾',
            'veículo': '🚗',
            'arma': '🔫',
            'vida': '❤️',
            'fome': '🍔',
            'sede': '💧',
            'sono': '😴'
        };

        return emojiMap[fieldName.toLowerCase()] || '📋';
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

    // Criar barra de progresso
    createProgressBar(current, max, size = 20) {
        const percentage = Math.min(current / max, 1);
        const filled = Math.round(percentage * size);
        const empty = size - filled;
        
        return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage * 100)}%`;
    }

    // Criar embed com animação
    createAnimated(title, description, animationType = 'loading', theme = 'rio') {
        const animations = {
            loading: ['⏳', '⌛', '🔄', '⚙️'],
            success: ['✨', '🎉', '🎊', '🎆'],
            money: ['💰', '💸', '💳', '💎'],
            work: ['💼', '🏢', '👷', '🔨']
        };

        const emoji = animations[animationType] || animations.loading;
        const randomEmoji = emoji[Math.floor(Math.random() * emoji.length)];

        return this.createBasic(`${randomEmoji} ${title}`, description, theme);
    }
}

module.exports = new EmbedSystem();
