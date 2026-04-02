const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

/**
 * Sistema Profissional de Gerenciamento de Embeds
 * Inspirado nos melhores bots do Discord (Loritta, Rio Bot)
 * 
 * @author Advanced Embed System v2.0
 * @description Sistema completo e robusto para criação e gestão de embeds
 */

class EmbedManager {
    constructor() {
        this.EMBEDS_FILE = path.join(__dirname, '../data/embeds_v2.json');
        this.MAX_EMBEDS_PER_USER = 25;
        this.BACKUP_FILE = path.join(__dirname, '../data/embeds_backup.json');
        
        // Paleta de cores profissional
        this.COLORS = {
            // Cores principais
            primary: '#5865F2',      // Discord Blue
            secondary: '#57F287',    // Discord Green  
            success: '#2ECC71',      // Emerald Green
            warning: '#F39C12',      // Orange
            error: '#E74C3C',        // Red
            info: '#3498DB',         // Blue
            
            // Cores temáticas
            dark: '#2C3E50',         // Dark Blue
            light: '#ECF0F1',         // Light Gray
            purple: '#9B59B6',       // Purple
            orange: '#E67E22',       // Orange
            teal: '#1ABC9C',         // Teal
            red: '#E74C3C',          // Red
            green: '#2ECC71',        // Green
            blue: '#3498DB',         // Blue
            yellow: '#F1C40F',       // Yellow
            pink: '#E91E63',         // Pink
            indigo: '#5C6BC0',       // Indigo
            lime: '#CDDC39',         // Lime
            amber: '#FFC107',        // Amber
            cyan: '#00BCD4',         // Cyan
            
            // Gradientes (cores especiais)
            gradient1: '#667EEA',    // Purple Blue
            gradient2: '#764BA2',    // Deep Purple
            sunset: '#FF6B6B',       // Sunset Red
            ocean: '#4ECDC4',        // Ocean Teal
            forest: '#2ECC71',       // Forest Green
            flame: '#FF6B35',        // Flame Orange
            midnight: '#2C3E50',     // Midnight Blue
            rose: '#E84393',         // Rose Pink
            gold: '#FFD700',          // Gold
            
            // Cores do Discord (oficiais)
            discord_blurple: '#5865F2',
            discord_green: '#57F287',
            discord_yellow: '#FEE75C',
            discord_red: '#ED4245',
            discord_fuchsia: '#EB459E',
            discord_white: '#FFFFFF',
            discord_black: '#000000'
        };

        // Templates profissionais
        this.TEMPLATES = {
            welcome: {
                name: '👋 Boas-vindas',
                description: 'Template para receber novos membros',
                data: {
                    title: '👋 Bem-vindo(a) ao Servidor!',
                    description: 'Estamos muito felizes em ter você aqui! 🎉\n\nLeia nossas regras e conheça a comunidade.',
                    color: this.COLORS.success,
                    fields: [
                        { name: '📋 Regras', value: 'Leia as regras do servidor', inline: true },
                        { name: '💬 Canais', value: 'Conheça nossos canais', inline: true },
                        { name: '🎮 Diversão', value: 'Participe das atividades', inline: true }
                    ],
                    thumbnail: null,
                    image: null,
                    author: null,
                    footer: { text: 'Bem-vindo! • %date%', iconURL: null }
                }
            },
            announcement: {
                name: '📢 Anúncio',
                description: 'Template para anúncios importantes',
                data: {
                    title: '📢 Anúncio Importante',
                    description: 'Uma nova atualização chegou ao servidor!',
                    color: this.COLORS.discord_blurple,
                    fields: [],
                    thumbnail: null,
                    image: null,
                    author: { name: 'Staff', iconURL: null },
                    footer: { text: 'Anúncio Oficial • %date%', iconURL: null }
                }
            },
            rules: {
                name: '📜 Regras',
                description: 'Template para regras do servidor',
                data: {
                    title: '📜 Regras do Servidor',
                    description: 'Mantenha a ordem e respeito em nossa comunidade:',
                    color: this.COLORS.error,
                    fields: [
                        { name: '1️⃣ Respeito', value: 'Seja respeitoso com todos os membros', inline: false },
                        { name: '2️⃣ Conteúdo', value: 'Publique apenas conteúdo apropriado', inline: false },
                        { name: '3️⃣ Spam', value: 'Não faça spam em nenhum canal', inline: false },
                        { name: '4️⃣ Privacidade', value: 'Respeite a privacidade dos outros', inline: false }
                    ],
                    thumbnail: null,
                    image: null,
                    author: null,
                    footer: { text: 'Regras • %date%', iconURL: null }
                }
            },
            event: {
                name: '🎉 Evento',
                description: 'Template para eventos e competições',
                data: {
                    title: '🎉 Novo Evento no Servidor!',
                    description: 'Participe e ganhe prêmios incríveis! 🏆',
                    color: this.COLORS.gold,
                    fields: [
                        { name: '📅 Data', value: 'A definir', inline: true },
                        { name: '⏰ Horário', value: 'A definir', inline: true },
                        { name: '🎁 Prêmios', value: 'Vários prêmios', inline: true }
                    ],
                    thumbnail: null,
                    image: null,
                    author: { name: 'Event Team', iconURL: null },
                    footer: { text: 'Evento • %date%', iconURL: null }
                }
            },
            goodbye: {
                name: '👋 Despedida',
                description: 'Template para despedida de membros',
                data: {
                    title: '👋 Até Logo!',
                    description: 'Esperamos te ver novamente em breve! 💝',
                    color: this.COLORS.warning,
                    fields: [
                        { name: '💝 Mensagem', value: 'Obrigado por fazer parte da nossa comunidade!', inline: false }
                    ],
                    thumbnail: null,
                    image: null,
                    author: null,
                    footer: { text: 'Despedida • %date%', iconURL: null }
                }
            },
            info: {
                name: 'ℹ️ Informações',
                description: 'Template para informações gerais',
                data: {
                    title: 'ℹ️ Informações Importantes',
                    description: 'Fique por dentro das novidades!',
                    color: this.COLORS.info,
                    fields: [],
                    thumbnail: null,
                    image: null,
                    author: null,
                    footer: { text: 'Informações • %date%', iconURL: null }
                }
            },
            partnership: {
                name: '🤝 Parceria',
                description: 'Template para anúncios de parceria',
                data: {
                    title: '🤝 Nova Parceria!',
                    description: 'Estamos felizes em anunciar nossa nova parceria!',
                    color: this.COLORS.purple,
                    fields: [
                        { name: '🎯 Servidor', value: 'Nome do Servidor', inline: true },
                        { name: '👥 Membros', value: '0+', inline: true },
                        { name: '🔗 Convite', value: '[Clique aqui]', inline: true }
                    ],
                    thumbnail: null,
                    image: null,
                    author: { name: 'Parcerias', iconURL: null },
                    footer: { text: 'Parceria • %date%', iconURL: null }
                }
            },
            giveaway: {
                name: '🎁 Sorteio',
                description: 'Template para sorteios e giveaways',
                data: {
                    title: '🎁 Sorteio Exclusivo!',
                    description: 'Participe e concorra a prêmios incríveis! 🎉',
                    color: this.COLORS.gold,
                    fields: [
                        { name: '🎁 Prêmio', value: 'A definir', inline: true },
                        { name: '⏰ Término', value: 'A definir', inline: true },
                        { name: '👥 Participantes', value: '0', inline: true }
                    ],
                    thumbnail: null,
                    image: null,
                    author: { name: 'Giveaways', iconURL: null },
                    footer: { text: 'Sorteio • %date%', iconURL: null }
                }
            }
        };

        // Inicializar sistema
        this.initializeSystem();
    }

    /**
     * Inicializa o sistema de embeds
     */
    initializeSystem() {
        this.ensureDirectories();
        this.migrateOldData();
        this.createBackup();
    }

    /**
     * Garante que os diretórios existam
     */
    ensureDirectories() {
        const dir = path.dirname(this.EMBEDS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Migra dados do sistema antigo se existir
     */
    migrateOldData() {
        const oldFile = path.join(__dirname, '../data/embeds.json');
        if (fs.existsSync(oldFile) && !fs.existsSync(this.EMBEDS_FILE)) {
            try {
                const oldData = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
                fs.writeFileSync(this.EMBEDS_FILE, JSON.stringify(oldData, null, 2));
                console.log('✅ Dados migrados do sistema antigo de embeds');
            } catch (error) {
                console.error('❌ Erro ao migrar dados antigos:', error);
            }
        }
    }

    /**
     * Cria backup dos dados
     */
    createBackup() {
        if (fs.existsSync(this.EMBEDS_FILE)) {
            try {
                const data = fs.readFileSync(this.EMBEDS_FILE, 'utf8');
                fs.writeFileSync(this.BACKUP_FILE, data);
            } catch (error) {
                console.error('❌ Erro ao criar backup:', error);
            }
        }
    }

    /**
     * Carrega todos os embeds do arquivo
     * @returns {Object} Dados dos embeds
     */
    loadEmbeds() {
        try {
            if (!fs.existsSync(this.EMBEDS_FILE)) {
                return {};
            }
            const data = fs.readFileSync(this.EMBEDS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Erro ao carregar embeds:', error);
            
            // Tentar restaurar do backup
            if (fs.existsSync(this.BACKUP_FILE)) {
                try {
                    const backupData = fs.readFileSync(this.BACKUP_FILE, 'utf8');
                    console.log('🔄 Restaurando dados do backup...');
                    return JSON.parse(backupData);
                } catch (backupError) {
                    console.error('❌ Erro ao restaurar backup:', backupError);
                }
            }
            
            return {};
        }
    }

    /**
     * Salva todos os embeds no arquivo
     * @param {Object} embeds - Dados dos embeds
     * @returns {boolean} Sucesso da operação
     */
    saveEmbeds(embeds) {
        try {
            // Criar backup antes de salvar
            this.createBackup();
            
            // Salvar dados principais
            fs.writeFileSync(this.EMBEDS_FILE, JSON.stringify(embeds, null, 2));
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar embeds:', error);
            return false;
        }
    }

    /**
     * Gera um ID único e amigável
     * @returns {string} ID gerado
     */
    generateId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        
        // Garantir unicidade verificando se já existe
        do {
            result = '';
            for (let i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.embedExists(result));
        
        return result;
    }

    /**
     * Verifica se um embed existe
     * @param {string} id - ID do embed
     * @returns {boolean} Se o embed existe
     */
    embedExists(id) {
        const embeds = this.loadEmbeds();
        return embeds.hasOwnProperty(id);
    }

    /**
     * Converte nome de cor para valor hexadecimal
     * @param {string} colorName - Nome da cor
     * @returns {string} Valor hexadecimal da cor
     */
    getColor(colorName) {
        if (!colorName) return this.COLORS.primary;
        if (colorName.startsWith('#')) return colorName;
        return this.COLORS[colorName.toLowerCase()] || this.COLORS.primary;
    }

    /**
     * Valida uma URL
     * @param {string} url - URL para validar
     * @returns {boolean} Se a URL é válida
     */
    isValidUrl(url) {
        if (!url) return false;
        try {
            new URL(url);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Cria um novo embed
     * @param {string} userId - ID do usuário
     * @param {Object} embedData - Dados do embed
     * @returns {Object} Resultado da operação
     */
    createEmbed(userId, embedData) {
        const embeds = this.loadEmbeds();
        
        // Verificar limite do usuário
        const userEmbeds = Object.values(embeds).filter(e => e.authorId === userId);
        if (userEmbeds.length >= this.MAX_EMBEDS_PER_USER) {
            return {
                success: false,
                error: `Você já atingiu o limite de ${this.MAX_EMBEDS_PER_USER} embeds.`
            };
        }

        // Validar dados
        const validation = this.validateEmbedData(embedData);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        // Gerar ID e criar embed
        const id = this.generateId();
        const embed = {
            id: id,
            authorId: userId,
            data: embedData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: '2.0'
        };

        embeds[id] = embed;
        
        if (this.saveEmbeds(embeds)) {
            return {
                success: true,
                embedId: id,
                embed: embed
            };
        } else {
            return {
                success: false,
                error: 'Falha ao salvar o embed.'
            };
        }
    }

    /**
     * Obtém um embed pelo ID
     * @param {string} id - ID do embed
     * @returns {Object|null} Dados do embed ou null
     */
    getEmbed(id) {
        const embeds = this.loadEmbeds();
        return embeds[id] || null;
    }

    /**
     * Lista todos os embeds de um usuário
     * @param {string} userId - ID do usuário
     * @returns {Array} Lista de embeds
     */
    listUserEmbeds(userId) {
        const embeds = this.loadEmbeds();
        return Object.values(embeds)
            .filter(embed => embed.authorId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Atualiza um embed existente
     * @param {string} id - ID do embed
     * @param {string} userId - ID do usuário (para verificação)
     * @param {Object} newData - Novos dados
     * @returns {Object} Resultado da operação
     */
    updateEmbed(id, userId, newData) {
        const embeds = this.loadEmbeds();
        const embed = embeds[id];

        if (!embed) {
            return {
                success: false,
                error: 'Embed não encontrado.'
            };
        }

        if (embed.authorId !== userId) {
            return {
                success: false,
                error: 'Você não tem permissão para editar este embed.'
            };
        }

        // Validar novos dados
        const validation = this.validateEmbedData(newData);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        // Atualizar dados
        embed.data = { ...embed.data, ...newData };
        embed.updatedAt = new Date().toISOString();

        if (this.saveEmbeds(embeds)) {
            return {
                success: true,
                embed: embed
            };
        } else {
            return {
                success: false,
                error: 'Falha ao salvar as alterações.'
            };
        }
    }

    /**
     * Deleta um embed
     * @param {string} id - ID do embed
     * @param {string} userId - ID do usuário (para verificação)
     * @returns {Object} Resultado da operação
     */
    deleteEmbed(id, userId) {
        const embeds = this.loadEmbeds();
        const embed = embeds[id];

        if (!embed) {
            return {
                success: false,
                error: 'Embed não encontrado.'
            };
        }

        if (embed.authorId !== userId) {
            return {
                success: false,
                error: 'Você não tem permissão para deletar este embed.'
            };
        }

        delete embeds[id];

        if (this.saveEmbeds(embeds)) {
            return {
                success: true
            };
        } else {
            return {
                success: false,
                error: 'Falha ao deletar o embed.'
            };
        }
    }

    /**
     * Valida os dados de um embed
     * @param {Object} data - Dados do embed
     * @returns {Object} Resultado da validação
     */
    validateEmbedData(data) {
        // Validar título
        if (data.title && (data.title.length === 0 || data.title.length > 256)) {
            return {
                valid: false,
                error: 'O título deve ter entre 1 e 256 caracteres.'
            };
        }

        // Validar descrição
        if (data.description && data.description.length > 4096) {
            return {
                valid: false,
                error: 'A descrição deve ter no máximo 4096 caracteres.'
            };
        }

        // Validar campos
        if (data.fields && Array.isArray(data.fields)) {
            if (data.fields.length > 25) {
                return {
                    valid: false,
                    error: 'Um embed pode ter no máximo 25 campos.'
                };
            }

            for (const field of data.fields) {
                if (!field.name || field.name.length > 256) {
                    return {
                        valid: false,
                        error: 'O nome de cada campo deve ter no máximo 256 caracteres.'
                    };
                }
                if (!field.value || field.value.length > 1024) {
                    return {
                        valid: false,
                        error: 'O valor de cada campo deve ter no máximo 1024 caracteres.'
                    };
                }
            }
        }

        // Validar URLs
        if (data.thumbnail && !this.isValidUrl(data.thumbnail)) {
            return {
                valid: false,
                error: 'URL do thumbnail inválida.'
            };
        }

        if (data.image && !this.isValidUrl(data.image)) {
            return {
                valid: false,
                error: 'URL da imagem inválida.'
            };
        }

        if (data.author?.iconURL && !this.isValidUrl(data.author.iconURL)) {
            return {
                valid: false,
                error: 'URL do ícone do autor inválida.'
            };
        }

        if (data.footer?.iconURL && !this.isValidUrl(data.footer.iconURL)) {
            return {
                valid: false,
                error: 'URL do ícone do rodapé inválida.'
            };
        }

        return { valid: true };
    }

    /**
     * Converte dados do embed para EmbedBuilder do Discord
     * @param {Object} embedData - Dados do embed
     * @returns {EmbedBuilder} EmbedBuilder configurado
     */
    buildDiscordEmbed(embedData) {
        const embed = new EmbedBuilder();

        // Configurar cor
        if (embedData.color) {
            embed.setColor(this.getColor(embedData.color));
        }

        // Configurar título
        if (embedData.title) {
            embed.setTitle(embedData.title);
        }

        // Configurar descrição
        if (embedData.description) {
            embed.setDescription(embedData.description);
        }

        // Configurar autor
        if (embedData.author) {
            embed.setAuthor({
                name: embedData.author.name || '',
                iconURL: embedData.author.iconURL || null,
                url: embedData.author.url || null
            });
        }

        // Configurar thumbnail
        if (embedData.thumbnail) {
            embed.setThumbnail(embedData.thumbnail);
        }

        // Configurar imagem
        if (embedData.image) {
            embed.setImage(embedData.image);
        }

        // Configurar campos
        if (embedData.fields && Array.isArray(embedData.fields)) {
            embed.addFields(embedData.fields);
        }

        // Configurar rodapé
        if (embedData.footer) {
            let footerText = embedData.footer.text || '';
            // Substituir placeholders
            footerText = footerText.replace('%date%', new Date().toLocaleDateString('pt-BR'));
            
            embed.setFooter({
                text: footerText,
                iconURL: embedData.footer.iconURL || null
            });
        }

        // Adicionar timestamp
        embed.setTimestamp();

        return embed;
    }

    /**
     * Obtém estatísticas do sistema
     * @param {string} userId - ID do usuário (opcional)
     * @returns {Object} Estatísticas
     */
    getStats(userId = null) {
        const embeds = this.loadEmbeds();
        let userEmbeds = Object.values(embeds);

        if (userId) {
            userEmbeds = userEmbeds.filter(embed => embed.authorId === userId);
        }

        return {
            total: userEmbeds.length,
            maxAllowed: this.MAX_EMBEDS_PER_USER,
            remaining: Math.max(0, this.MAX_EMBEDS_PER_USER - userEmbeds.length),
            recent: userEmbeds.filter(embed => {
                const createdDate = new Date(embed.createdAt);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return createdDate > weekAgo;
            }).length
        };
    }

    /**
     * Obtém a lista de templates disponíveis
     * @returns {Object} Templates
     */
    getTemplates() {
        return this.TEMPLATES;
    }

    /**
     * Obtém a lista de cores disponíveis
     * @returns {Object} Cores
     */
    getColors() {
        return this.COLORS;
    }
}

module.exports = new EmbedManager();
