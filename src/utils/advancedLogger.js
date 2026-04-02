/**
 * Sistema Avançado de Logs
 * 
 * Recursos:
 * - Logs por categoria com arquivos separados
 * - Rotação automática de logs
 * - Filtros e busca avançada
 * - Exportação em múltiplos formatos
 * - Dashboard visual de logs
 * - Cache inteligente para performance
 * - Monitoramento em tempo real
 */

const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const colors = {
    reset: '\x1b[0m',
    gray: '\x1b[90m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    bold: '\x1b[1m',
};

// Configurações
const LOG_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFilesPerCategory: 5,
    cacheSize: 1000,
    rotationInterval: 24 * 60 * 60 * 1000, // 24 horas
    exportFormats: ['json', 'csv', 'txt']
};

const LOG_CATEGORIES = {
    SYSTEM: 'system',
    ECONOMY: 'economy', 
    BANK: 'bank',
    PERMISSIONS: 'permissions',
    COMMANDS: 'commands',
    ERRORS: 'errors',
    SECURITY: 'security',
    MODERATION: 'moderation',
    AUDIT: 'audit',
    PERFORMANCE: 'performance'
};

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
};

class AdvancedLogger {
    constructor() {
        this.logsDir = path.join(__dirname, '../logs');
        this.cache = new Map();
        this.stats = {
            total: 0,
            byCategory: {},
            byLevel: {},
            lastRotation: new Date()
        };
        
        this.initializeDirectories();
        this.startRotationTimer();
    }

    initializeDirectories() {
        // Criar diretório de logs se não existir
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }

        // Criar subdiretórios para cada categoria
        Object.values(LOG_CATEGORIES).forEach(category => {
            const categoryDir = path.join(this.logsDir, category);
            if (!fs.existsSync(categoryDir)) {
                fs.mkdirSync(categoryDir, { recursive: true });
            }
        });
    }

    formatMessage(level, category, message, ctx = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            category,
            message,
            ctx,
            id: this.generateLogId(),
            guild: ctx.guildId || 'global',
            user: ctx.userId || 'system',
            channel: ctx.channelId || 'system'
        };

        // Formato para console
        const levelColors = {
            [LOG_LEVELS.DEBUG]: colors.gray,
            [LOG_LEVELS.INFO]: colors.cyan,
            [LOG_LEVELS.WARN]: colors.yellow,
            [LOG_LEVELS.ERROR]: colors.red,
            [LOG_LEVELS.CRITICAL]: colors.red + colors.bold
        };

        const levelNames = {
            [LOG_LEVELS.DEBUG]: 'DEBUG',
            [LOG_LEVELS.INFO]: 'INFO',
            [LOG_LEVELS.WARN]: 'WARN',
            [LOG_LEVELS.ERROR]: 'ERROR',
            [LOG_LEVELS.CRITICAL]: 'CRITICAL'
        };

        const color = levelColors[level] || colors.white;
        const levelName = levelNames[level] || 'UNKNOWN';
        const ctxStr = Object.keys(ctx).length > 0 ? colors.magenta + JSON.stringify(ctx) + colors.reset : '';

        return {
            formatted: `${colors.blue}[${timestamp}]${colors.reset} ${color}${levelName}${colors.reset} ${colors.bold}[${category}]${colors.reset} | ${message} ${ctxStr}`,
            entry: logEntry
        };
    }

    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async writeLog(level, category, message, ctx = {}) {
        const { formatted, entry } = this.formatMessage(level, category, message, ctx);

        // Escrever no console
        console.log(formatted);

        // Adicionar ao cache
        this.cache.set(entry.id, entry);
        if (this.cache.size > LOG_CONFIG.cacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        // Atualizar estatísticas
        this.updateStats(level, category);

        // Escrever no arquivo
        await this.writeToFile(category, entry);

        // Enviar para Discord se for crítico
        if (level >= LOG_LEVELS.ERROR) {
            await this.sendToDiscord(entry, ctx);
        }
    }

    async writeToFile(category, entry) {
        const categoryDir = path.join(this.logsDir, category);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `${category}_${today}.log`;
        const filepath = path.join(categoryDir, filename);

        try {
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(filepath, logLine, 'utf8');

            // Verificar tamanho do arquivo e rotacionar se necessário
            await this.checkAndRotateFile(category, filepath);
        } catch (error) {
            console.error('Erro ao escrever log:', error);
        }
    }

    async checkAndRotateFile(category, filepath) {
        try {
            const stats = fs.statSync(filepath);
            if (stats.size > LOG_CONFIG.maxFileSize) {
                await this.rotateFile(category, filepath);
            }
        } catch (error) {
            console.error('Erro ao verificar arquivo de log:', error);
        }
    }

    async rotateFile(category, filepath) {
        try {
            const categoryDir = path.dirname(filepath);
            const files = fs.readdirSync(categoryDir)
                .filter(file => file.startsWith(`${category}_`) && file.endsWith('.log'))
                .sort()
                .reverse(); // Mais recentes primeiro

            // Manter apenas os arquivos mais recentes
            if (files.length > LOG_CONFIG.maxFilesPerCategory) {
                const filesToDelete = files.slice(LOG_CONFIG.maxFilesPerCategory);
                filesToDelete.forEach(file => {
                    const fileToDelete = path.join(categoryDir, file);
                    fs.unlinkSync(fileToDelete);
                });
            }

            // Renomear arquivo atual
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const newFilename = `${category}_${timestamp}.log`;
            const newFilepath = path.join(categoryDir, newFilename);
            fs.renameSync(filepath, newFilepath);

            this.updateStats(LOG_LEVELS.INFO, category, 'Log rotacionado');
        } catch (error) {
            console.error('Erro ao rotacionar log:', error);
        }
    }

    updateStats(level, category, action = null) {
        this.stats.total++;
        
        if (!this.stats.byCategory[category]) {
            this.stats.byCategory[category] = 0;
        }
        this.stats.byCategory[category]++;

        if (!this.stats.byLevel[level]) {
            this.stats.byLevel[level] = 0;
        }
        this.stats.byLevel[level]++;
    }

    async sendToDiscord(entry, ctx) {
        if (!ctx.client || !ctx.guildConfig) return;

        try {
            const logChannel = ctx.guildConfig?.logChannel || ctx.guildConfig?.logs?.system;
            if (!logChannel) return;

            const channel = await ctx.client.channels.fetch(logChannel).catch(() => null);
            if (!channel || !channel.isTextBased()) return;

            const embed = new EmbedBuilder()
                .setTitle('🚨 Log Crítico')
                .setColor('#ff0000')
                .addFields(
                    { name: '📊 Categoria', value: entry.category, inline: true },
                    { name: '⚠️ Nível', value: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === entry.level), inline: true },
                    { name: '💬 Mensagem', value: entry.message.substring(0, 1024) }
                )
                .setTimestamp(new Date(entry.timestamp))
                .setFooter({ text: `ID: ${entry.id}` });

            if (entry.ctx.guild) {
                embed.addFields({ name: '🏠 Servidor', value: entry.ctx.guild, inline: true });
            }

            if (entry.ctx.user) {
                embed.addFields({ name: '👤 Usuário', value: entry.ctx.user, inline: true });
            }

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao enviar log para Discord:', error);
        }
    }

    startRotationTimer() {
        setInterval(async () => {
            this.stats.lastRotation = new Date();
            await this.performRotation();
        }, LOG_CONFIG.rotationInterval);
    }

    async performRotation() {
        try {
            const categories = Object.values(LOG_CATEGORIES);
            for (const category of categories) {
                const categoryDir = path.join(this.logsDir, category);
                if (fs.existsSync(categoryDir)) {
                    const files = fs.readdirSync(categoryDir)
                        .filter(file => file.endsWith('.log'))
                        .sort();

                    if (files.length > LOG_CONFIG.maxFilesPerCategory) {
                        const filesToDelete = files.slice(0, files.length - LOG_CONFIG.maxFilesPerCategory);
                        filesToDelete.forEach(file => {
                            const fileToDelete = path.join(categoryDir, file);
                            fs.unlinkSync(fileToDelete);
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Erro na rotação de logs:', error);
        }
    }

    // Métodos de busca e filtros
    async searchLogs(filters = {}) {
        const results = [];
        const { category, level, startDate, endDate, user, message, limit = 100 } = filters;

        for (const [logId, entry] of this.cache) {
            let match = true;

            if (category && entry.category !== category) match = false;
            if (level !== undefined && entry.level !== level) match = false;
            if (user && entry.user !== user) match = false;
            if (message && !entry.message.toLowerCase().includes(message.toLowerCase())) match = false;
            if (startDate && new Date(entry.timestamp) < new Date(startDate)) match = false;
            if (endDate && new Date(entry.timestamp) > new Date(endDate)) match = false;

            if (match) results.push(entry);
        }

        return results.slice(0, limit);
    }

    async exportLogs(filters = {}, format = 'json') {
        const logs = await this.searchLogs(filters);

        switch (format.toLowerCase()) {
            case 'csv':
                return this.exportToCSV(logs);
            case 'txt':
                return this.exportToTXT(logs);
            default:
                return this.exportToJSON(logs);
        }
    }

    exportToJSON(logs) {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            total: logs.length,
            logs
        }, null, 2);
    }

    exportToCSV(logs) {
        const headers = ['timestamp', 'level', 'category', 'message', 'user', 'guild', 'channel'];
        const csvLines = [headers.join(',')];
        
        logs.forEach(log => {
            const row = [
                log.timestamp,
                log.level,
                log.category,
                `"${log.message.replace(/"/g, '""')}"`,
                log.user,
                log.guild,
                log.channel
            ];
            csvLines.push(row.join(','));
        });

        return csvLines.join('\n');
    }

    exportToTXT(logs) {
        return logs.map(log => 
            `[${log.timestamp}] [${log.level}] [${log.category}] ${log.message}`
        ).join('\n');
    }

    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
    }

    clearCache() {
        this.cache.clear();
        this.updateStats(LOG_LEVELS.INFO, LOG_CATEGORIES.SYSTEM, 'Cache limpo');
    }
}

// Instância global
const logger = new AdvancedLogger();

// Métodos de conveniência
module.exports = {
    // Níveis
    LEVELS: LOG_LEVELS,
    CATEGORIES: LOG_CATEGORIES,

    // Métodos de log
    debug(category, message, ctx) {
        logger.writeLog(LOG_LEVELS.DEBUG, category, message, ctx);
    },

    info(category, message, ctx) {
        logger.writeLog(LOG_LEVELS.INFO, category, message, ctx);
    },

    warn(category, message, ctx) {
        logger.writeLog(LOG_LEVELS.WARN, category, message, ctx);
    },

    error(category, message, ctx) {
        logger.writeLog(LOG_LEVELS.ERROR, category, message, ctx);
    },

    critical(category, message, ctx) {
        logger.writeLog(LOG_LEVELS.CRITICAL, category, message, ctx);
    },

    // Métodos avançados
    async search(filters) {
        return await logger.searchLogs(filters);
    },

    async export(filters, format) {
        return await logger.exportLogs(filters, format);
    },

    getStats() {
        return logger.getStats();
    },

    clearCache() {
        return logger.clearCache();
    },

    // Compatibilidade com sistema antigo
    log(level, message, ctx = {}) {
        const category = ctx.category || LOG_CATEGORIES.SYSTEM;
        logger.writeLog(LOG_LEVELS[level] || LOG_LEVELS.INFO, category, message, ctx);
    },

    sendLog: async (client, guildConfig, logData) => {
        const entry = {
            timestamp: new Date().toISOString(),
            level: LOG_LEVELS.INFO,
            category: logData.type || LOG_CATEGORIES.SYSTEM,
            message: logData.title,
            ctx: { client, guildConfig, ...logData }
        };
        
        await logger.writeLog(LOG_LEVELS.INFO, entry.category, entry.message, entry.ctx);
    }
};
