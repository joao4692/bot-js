/**
 * Dashboard Visual de Logs em Tempo Real
 * 
 * Funcionalidades:
 * - Visualização em tempo real
 * - Gráficos e estatísticas
 * - Filtros interativos
 * - Alertas e notificações
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const advancedLogger = require('./advancedLogger');

class LogDashboard {
    constructor() {
        this.activeSessions = new Map();
        this.alerts = [];
        this.filters = {
            category: null,
            level: null,
            search: null
        };
    }

    createMainEmbed(stats, recentLogs) {
        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('📊 Dashboard de Logs - Tempo Real')
            .setDescription('Sistema avançado de monitoramento e análise')
            .setTimestamp()
            .setFooter({ text: 'Atualizado em tempo real • v2.0' });

        // Status do sistema
        embed.addFields({
            name: '🟢 Status do Sistema',
            value: '🟢 Operacional • Todos os sistemas funcionando normalmente',
            inline: false
        });

        // Estatísticas principais
        embed.addFields(
            {
                name: '📈 Logs (Última Hora)',
                value: this.getRecentLogsCount(recentLogs, 3600000).toString(),
                inline: true
            },
            {
                name: '⚠️ Alertas Ativos',
                value: this.alerts.length.toString(),
                inline: true
            },
            {
                name: '💾 Cache',
                value: `${stats.cacheSize}/${1000}`,
                inline: true
            }
        );

        // Categorias mais ativas
        const topCategories = this.getTopCategories(recentLogs);
        if (topCategories.length > 0) {
            embed.addFields({
                name: '📂 Categorias Ativas',
                value: topCategories.map((cat, index) => 
                    `${index + 1}. ${cat.category}: ${cat.count}`
                ).join('\n'),
                inline: true
            });
        }

        // Logs recentes (últimos 5)
        if (recentLogs.length > 0) {
            const recentText = recentLogs.slice(0, 5).map((log, index) => 
                `**${index + 1}.** [${log.category}] ${log.message.substring(0, 80)}...`
            ).join('\n\n');

            embed.addFields({
                name: '🕐 Logs Recentes',
                value: recentText,
                inline: false
            });
        }

        return embed;
    }

    getRecentLogsCount(logs, timeWindow) {
        const cutoff = Date.now() - timeWindow;
        return logs.filter(log => new Date(log.timestamp).getTime() > cutoff).length;
    }

    getTopCategories(logs) {
        const categoryCount = {};
        
        logs.forEach(log => {
            categoryCount[log.category] = (categoryCount[log.category] || 0) + 1;
        });

        return Object.entries(categoryCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([category, count]) => ({ category, count }));
    }

    createFilterEmbed() {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🔍 Filtros de Logs')
            .setDescription('Configure filtros para visualizar logs específicos')
            .addFields(
                {
                    name: '📂 Categoria Atual',
                    value: this.filters.category || 'Todas',
                    inline: true
                },
                {
                    name: '⚠️ Nível Mínimo',
                    value: this.getLevelName(this.filters.level) || 'Todos',
                    inline: true
                },
                {
                    name: '🔍 Busca',
                    value: this.filters.search || 'Nenhuma',
                    inline: true
                }
            )
            .setTimestamp();

        return embed;
    }

    getLevelName(level) {
        const levels = {
            0: 'DEBUG',
            1: 'INFO',
            2: 'WARN',
            3: 'ERROR',
            4: 'CRITICAL'
        };
        return levels[level] || null;
    }

    createFilterComponents() {
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('logs_filter_category')
            .setPlaceholder('Selecione a categoria...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏠 Sistema')
                    .setValue('system')
                    .setDefault(this.filters.category === 'system'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Economia')
                    .setValue('economy')
                    .setDefault(this.filters.category === 'economy'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏦 Banco')
                    .setValue('bank')
                    .setDefault(this.filters.category === 'bank'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔒 Permissões')
                    .setValue('permissions')
                    .setDefault(this.filters.category === 'permissions'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚙️ Comandos')
                    .setValue('commands')
                    .setDefault(this.filters.category === 'commands'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('❌ Erros')
                    .setValue('errors')
                    .setDefault(this.filters.category === 'errors'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔐 Segurança')
                    .setValue('security')
                    .setDefault(this.filters.category === 'security'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛡️ Moderação')
                    .setValue('moderation')
                    .setDefault(this.filters.category === 'moderation'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Auditoria')
                    .setValue('audit')
                    .setDefault(this.filters.category === 'audit')
            );

        const levelSelect = new StringSelectMenuBuilder()
            .setCustomId('logs_filter_level')
            .setPlaceholder('Selecione o nível...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🐞 Todos')
                    .setValue('all')
                    .setDefault(this.filters.level === null),
                new StringSelectMenuOptionBuilder()
                    .setLabel('ℹ️ INFO+')
                    .setValue('1')
                    .setDefault(this.filters.level === 1),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚠️ WARN+')
                    .setValue('2')
                    .setDefault(this.filters.level === 2),
                new StringSelectMenuOptionBuilder()
                    .setLabel('❌ ERROR+')
                    .setValue('3')
                    .setDefault(this.filters.level === 3),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚨 CRITICAL')
                    .setValue('4')
                    .setDefault(this.filters.level === 4)
            );

        const row1 = new ActionRowBuilder().addComponents(categorySelect);
        const row2 = new ActionRowBuilder().addComponents(levelSelect);

        return [row1, row2];
    }

    createActionComponents() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('logs_refresh')
                .setLabel('🔄 Atualizar')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('logs_export')
                .setLabel('📤 Exportar')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('logs_clear_filters')
                .setLabel('🧹 Limpar Filtros')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('logs_alerts')
                .setLabel('🔔 Alertas')
                .setStyle(ButtonStyle.Success)
        );
    }

    createAlertsEmbed() {
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🔔 Sistema de Alertas')
            .setDescription('Configure alertas automáticos para eventos críticos')
            .addFields(
                {
                    name: '📊 Alertas Ativos',
                    value: this.alerts.length.toString(),
                    inline: true
                },
                {
                    name: '🔔 Último Alerta',
                    value: this.alerts.length > 0 ? 
                        new Date(this.alerts[this.alerts.length - 1].timestamp).toLocaleString('pt-BR') : 
                        'Nenhum',
                    inline: true
                }
            )
            .setTimestamp();

        if (this.alerts.length > 0) {
            const recentAlerts = this.alerts.slice(-5).reverse();
            embed.addFields({
                name: '📋 Alertas Recentes',
                value: recentAlerts.map(alert => 
                    `**${alert.level}** [${alert.category}] ${alert.message}`
                ).join('\n\n')
            });
        }

        return embed;
    }

    createAlertComponents() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('logs_alert_error')
                .setLabel('❌ Erros')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('logs_alert_security')
                .setLabel('🔐 Segurança')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('logs_alert_performance')
                .setLabel('📈 Performance')
                .setStyle(ButtonStyle.Secondary)
        );
    }

    async updateFilters(category, level, search) {
        this.filters.category = category === 'all' ? null : category;
        this.filters.level = level === 'all' ? null : parseInt(level);
        this.filters.search = search && search.trim() !== '' ? search : null;
    }

    addAlert(level, category, message) {
        const alert = {
            timestamp: new Date().toISOString(),
            level,
            category,
            message
        };

        this.alerts.push(alert);
        
        // Manter apenas os últimos 50 alertas
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(-50);
        }
    }

    clearAlerts() {
        this.alerts = [];
    }
}

module.exports = LogDashboard;
