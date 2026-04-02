/**
 * Gatekeeper - Sistema Avançado de Controle de Acesso
 * 
 * Recursos:
 * - Verificação automática de entrada
 * - Sistema de kick para não whitelist
 * - Notificação por DM
 * - Painel de controle completo
 * - Cache inteligente de usuários verificados
 * - Histórico de tentativas de acesso
 * - Sistema de bypass temporário
 * - Integração com logs
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { PermissionsBitField } = require('discord.js');
const advancedLogger = require('../../utils/advancedLogger');
const advancedWhitelist = require('./advancedWhitelistManager');

const GATEKEEPER_CONFIG = {
    // Tempo que usuário tem para responder (segundos)
    verificationTimeout: 300, // 5 minutos
    // Tentativas máximas antes de kick
    maxAttempts: 3,
    // Tempo entre tentativas (segundos)
    attemptCooldown: 30, // 30 segundos
    // Cache de usuários verificados (horas)
    verifiedCacheTime: 24, // 24 horas
    // Bypass temporário (minutos)
    bypassTimeout: 15, // 15 minutos
    // Canais ignorados
    ignoredChannels: ['comandos', 'bot-commands', 'spam'],
    // Cargos que ignoram verificação
    bypassRoles: ['Admin', 'Moderator', 'Staff'],
    // Sistema de cargo temporário em vez de kick
    temporaryRoleMode: true,
    // Duração do cargo temporário (horas)
    temporaryRoleDuration: 24, // 24 horas
    // Nome do cargo temporário
    temporaryRoleName: '🔐 Verificação Pendente'
};

class GatekeeperManager {
    constructor() {
        this.verificationSessions = new Map();
        this.verifiedUsers = new Map();
        this.attemptHistory = new Map();
        this.bypassUsers = new Map();
        this.controlPanel = new Map();
        
        this.startCleanupTimer();
    }

    async checkUserEntry(member, guild) {
        const config = advancedWhitelist.getServerConfig(guild.id);
        
        // Se whitelist não está ativa, permite todos
        if (!config.enabled) {
            return { allowed: true, reason: 'Whitelist desativada' };
        }

        // Se usuário já está aprovado, permite
        if (advancedWhitelist.isWhitelisted(guild.id, member.id)) {
            this.addToVerifiedCache(member.id, guild.id);
            return { allowed: true, reason: 'Usuário aprovado' };
        }

        // Se tem cargo de bypass, permite
        if (this.hasBypassRole(member, config)) {
            return { allowed: true, reason: 'Cargo de bypass' };
        }

        // Se está em canal ignorado, permite
        if (this.isIgnoredChannel(member)) {
            return { allowed: true, reason: 'Canal ignorado' };
        }

        // Se já está verificado no cache, permite
        if (this.isVerifiedInCache(member.id, guild.id)) {
            return { allowed: true, reason: 'Usuário verificado em cache' };
        }

        // Se já tem cargo temporário, permite
        if (this.hasTemporaryRole(member, guild.id)) {
            return { allowed: true, reason: 'Usuário com cargo temporário' };
        }

        // Iniciar verificação
        return await this.startVerification(member, guild);
    }

    hasBypassRole(member, config) {
        if (!config.bypassRoles) return false;
        return member.roles.cache.some(role => 
            config.bypassRoles.includes(role.name) || 
            config.bypassRoles.includes(role.id)
        );
    }

    isIgnoredChannel(member) {
        return GATEKEEPER_CONFIG.ignoredChannels.some(channelName =>
            member.channel.name.toLowerCase().includes(channelName.toLowerCase())
        );
    }

    isVerifiedInCache(userId, guildId) {
        const cached = this.verifiedUsers.get(`${userId}_${guildId}`);
        if (!cached) return false;
        
        const now = Date.now();
        const cacheTime = cached.verifiedAt + (GATEKEEPER_CONFIG.verifiedCacheTime * 60 * 60 * 1000);
        return now < cacheTime;
    }

    addToVerifiedCache(userId, guildId) {
        this.verifiedUsers.set(`${userId}_${guildId}`, {
            verifiedAt: Date.now(),
            userId,
            guildId
        });
        
        // Limpar cache antigo
        this.cleanupVerifiedCache();
    }

    cleanupVerifiedCache() {
        const now = Date.now();
        const cutoff = now - (GATEKEEPER_CONFIG.verifiedCacheTime * 60 * 60 * 1000);
        
        for (const [key, value] of this.verifiedUsers) {
            if (value.verifiedAt < cutoff) {
                this.verifiedUsers.delete(key);
            }
        }
    }

    async startVerification(member, guild) {
        const sessionId = this.generateSessionId(member.id, guild.id);
        const config = advancedWhitelist.getServerConfig(guild.id);

        // Criar sessão de verificação
        const session = {
            id: sessionId,
            userId: member.id,
            guildId: guild.id,
            attempts: 0,
            startTime: Date.now(),
            timeout: GATEKEEPER_CONFIG.verificationTimeout * 1000,
            status: 'pending'
        };

        this.verificationSessions.set(sessionId, session);

        // Enviar mensagem de verificação
        await this.sendVerificationMessage(member, guild, config, sessionId);

        // Aguardar resposta ou timeout
        return this.waitForVerification(sessionId, member, guild);
    }

    async sendVerificationMessage(member, guild, config, sessionId) {
        const verificationCode = this.generateVerificationCode();
        
        // Armazenar código
        this.verificationSessions.get(sessionId).code = verificationCode;
        this.verificationSessions.get(sessionId).codeGeneratedAt = Date.now();

        try {
            // Tentar enviar DM primeiro
            const dmEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🔐 Verificação Necessária')
                .setDescription(`Olá ${member.user.username}! Para continuar no servidor **${guild.name}**, você precisa verificar sua conta.`)
                .addFields(
                    { 
                        name: '🔑 Código de Verificação', 
                        value: `||${verificationCode}||`, 
                        inline: false 
                    },
                    { 
                        name: '⏰ Tempo Limite', 
                        value: `${GATEKEEPER_CONFIG.verificationTimeout / 60} minutos`, 
                        inline: true 
                    },
                    { 
                        name: '📝 Instruções', 
                        value: 'Digite o código no chat do servidor ou responda esta mensagem com o código.', 
                        inline: false 
                    }
                )
                .setFooter({ text: 'Este código expira em 5 minutos' })
                .setTimestamp();

            await member.user.send({ embeds: [dmEmbed] });

            // Mensagem no servidor
            const serverEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('🔐 Verificação de Usuário')
                .setDescription(`${member.user.toString()} precisa verificar sua conta para acessar o servidor.`)
                .addFields(
                    { 
                        name: '⏳ Status', 
                        value: 'Aguardando verificação...', 
                        inline: true 
                    },
                    { 
                        name: '📝 Ação', 
                        value: 'Verifique suas mensagens privadas (DM) para obter o código.', 
                        inline: true 
                    }
                )
                .setFooter({ text: `Código enviado para ${member.user.username}` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_resend_${sessionId}`)
                    .setLabel('📤 Reenviar Código')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`verify_cancel_${sessionId}`)
                    .setLabel('❌ Cancelar')
                    .setStyle(ButtonStyle.Danger)
            );

            await guild.systemChannel?.send({ 
                embeds: [serverEmbed], 
                components: [row] 
            });

        } catch (error) {
            console.error('Erro ao enviar mensagem de verificação:', error);
            
            // Fallback para mensagem no servidor
            const fallbackEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔐 Falha na Verificação')
                .setDescription('Ocorreu um erro ao enviar o código de verificação. Entre em contato com um administrador.');

            await guild.systemChannel?.send({ 
                embeds: [fallbackEmbed] 
            });
        }
    }

    async waitForVerification(sessionId, member, guild) {
        const session = this.verificationSessions.get(sessionId);
        if (!session) return { allowed: false, reason: 'Sessão inválida' };

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                if (this.verificationSessions.has(sessionId)) {
                    this.verificationSessions.delete(sessionId);
                    resolve({ allowed: false, reason: 'Timeout de verificação' });
                }
            }, session.timeout);

            const checkInterval = setInterval(() => {
                const currentSession = this.verificationSessions.get(sessionId);
                if (!currentSession || currentSession.status !== 'pending') {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    return;
                }

                // Verificar se foi verificado
                if (this.isVerifiedInCache(member.id, guild.id)) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    this.verificationSessions.delete(sessionId);
                    resolve({ allowed: true, reason: 'Verificado com sucesso' });
                }
            }, 5000); // Verificar a cada 5 segundos
        });
    }

    generateVerificationCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    generateSessionId(userId, guildId) {
        return `verify_${userId}_${guildId}_${Date.now()}`;
    }

    async handleVerificationResponse(interaction, sessionId, response) {
        const session = this.verificationSessions.get(sessionId);
        if (!session || session.status !== 'pending') {
            return { success: false, message: 'Sessão inválida ou expirada' };
        }

        const storedCode = session.code;
        const isValid = response.toUpperCase() === storedCode.toUpperCase();

        if (isValid) {
            // Verificar se já tem cargo temporário
            const hasTempRole = this.hasTemporaryRole(interaction.member, interaction.guildId);
            
            if (hasTempRole) {
                // Se já tem cargo temporário, apenas limpa a sessão
                this.verificationSessions.delete(sessionId);
                return { success: false, message: '❌ Você já tem um cargo temporário. A verificação foi cancelada.' };
            }

            // Verificação bem-sucedida
            session.status = 'verified';
            session.verifiedAt = Date.now();
            
            // Adicionar à whitelist automaticamente
            const config = advancedWhitelist.getServerConfig(interaction.guildId);
            await advancedWhitelist.add(
                interaction.guildId,
                interaction.user.id,
                interaction.user.tag,
                interaction.user.id,
                'Verificação automática via gatekeeper',
                'approved'
            );

            // Adicionar ao cache de verificados
            this.addToVerifiedCache(interaction.user.id, interaction.guildId);

            // Dar cargo se configurado
            if (config.approvedRole) {
                try {
                    const role = interaction.guild.roles.cache.find(role => role.id === config.approvedRole);
                    if (role) {
                        await interaction.member.roles.add(role);
                    }
                } catch (error) {
                    console.error('Erro ao dar cargo aprovado:', error);
                }
            }

            // Limpar sessão
            this.verificationSessions.delete(sessionId);

            // Log
            advancedLogger.whitelist(
                'verification_success',
                `Usuário ${interaction.user.tag} verificado com sucesso`,
                {
                    userId: interaction.user.id,
                    sessionId,
                    verificationTime: Date.now() - session.startTime,
                    hadTemporaryRole: hasTempRole
                }
            );

            return { success: true, message: '✅ Verificado com sucesso! Bem-vindo ao servidor!' };
        } else {
            // Verificação falhou
            session.attempts++;
            
            if (session.attempts >= GATEKEEPER_CONFIG.maxAttempts) {
                // Excedeu tentativas - kick ou dar cargo temporário
                session.status = 'failed';
                this.verificationSessions.delete(sessionId);

                if (GATEKEEPER_CONFIG.temporaryRoleMode) {
                    await this.grantTemporaryRole(interaction.member, 'Máximo de tentativas excedido');
                } else {
                    await this.handleFailedVerification(interaction.member, 'Máximo de tentativas excedido');
                }

                return { success: false, message: `❌ Número máximo de tentativas excedido. Você foi ${GATEKEEPER_CONFIG.temporaryRoleMode ? 'recebeu um cargo temporário' : 'removido'} do servidor.` };
            } else {
                // Tentar novamente
                return { success: false, message: `❌ Código incorreto. Tentativa ${session.attempts}/${GATEKEEPER_CONFIG.maxAttempts}.` };
            }
        }
    }

    async handleFailedVerification(member, reason) {
        try {
            if (GATEKEEPER_CONFIG.temporaryRoleMode) {
                // Dar cargo temporário em vez de kick
                await this.grantTemporaryRole(member, reason);
            } else {
                // Kick tradicional
                await member.kick(`Verificação falhou: ${reason}`);
            }
            
            // Log
            advancedLogger.whitelist(
                'verification_failed',
                `Usuário ${member.user.tag} - ${GATEKEEPER_CONFIG.temporaryRoleMode ? 'Cargo temporário concedido' : 'Removido'}: ${reason}`,
                {
                    userId: member.id,
                    reason,
                    timestamp: new Date().toISOString(),
                    action: GATEKEEPER_CONFIG.temporaryRoleMode ? 'temporary_role_granted' : 'kicked'
                }
            );
        } catch (error) {
            console.error('Erro ao processar verificação falha:', error);
            
            // Fallback - notificar admins
            const guild = member.guild;
            const adminChannel = guild.systemChannel;
            
            if (adminChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🚨 Falha no Gatekeeper')
                    .setDescription(`Não foi possível ${GATEKEEPER_CONFIG.temporaryRoleMode ? 'conceder cargo temporário' : 'remover'} ${member.user.tag}. Motivo: ${reason}`)
                    .addFields(
                        { name: '👤 Usuário', value: member.user.tag, inline: true },
                        { name: '🆔 ID', value: member.id, inline: true }
                    );
                
                await adminChannel.send({ embeds: [embed] });
            }
        }
    }

    async grantTemporaryRole(member, reason) {
        try {
            const guild = member.guild;
            const config = advancedWhitelist.getServerConfig(guild.id);
            
            // Criar ou encontrar cargo temporário
            let tempRole = guild.roles.cache.find(role => role.name === GATEKEEPER_CONFIG.temporaryRoleName);
            
            if (!tempRole) {
                // Criar cargo temporário se não existir
                tempRole = await guild.roles.create({
                    name: GATEKEEPER_CONFIG.temporaryRoleName,
                    color: '#ff9900',
                    reason: 'Cargo temporário para verificação pendente',
                    permissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]
                });
            }

            // Dar cargo ao usuário
            await member.roles.add(tempRole);

            // Agendar remoção automática do cargo
            setTimeout(async () => {
                try {
                    await member.roles.remove(tempRole);
                    
                    // Log de remoção automática
                    advancedLogger.whitelist(
                        'temporary_role_removed',
                        `Cargo temporário removido de ${member.user.tag} após ${GATEKEEPER_CONFIG.temporaryRoleDuration} horas`,
                        {
                            userId: member.id,
                            roleId: tempRole.id,
                            roleName: tempRole.name,
                            duration: GATEKEEPER_CONFIG.temporaryRoleDuration
                        }
                    );
                } catch (error) {
                    console.error('Erro ao remover cargo temporário:', error);
                }
            }, GATEKEEPER_CONFIG.temporaryRoleDuration * 60 * 60 * 1000); // Converter para milissegundos

            // Log
            advancedLogger.whitelist(
                'temporary_role_granted',
                `Cargo temporário concedido para ${member.user.tag}`,
                {
                    userId: member.id,
                    roleId: tempRole.id,
                    roleName: tempRole.name,
                    duration: GATEKEEPER_CONFIG.temporaryRoleDuration,
                    reason
                }
            );

        } catch (error) {
            console.error('Erro ao conceder cargo temporário:', error);
        }
    }

    hasTemporaryBypass(userId, guildId) {
        const bypassKey = `bypass_${userId}_${guildId}`;
        const bypass = this.bypassUsers.get(bypassKey);
        
        if (!bypass) return false;
        
        return Date.now() < bypass.expiresAt;
    }

    hasTemporaryRole(member, guildId) {
        const config = advancedWhitelist.getServerConfig(guildId);
        if (!config.temporaryRoleMode) return false;
        
        const tempRoleName = GATEKEEPER_CONFIG.temporaryRoleName;
        return member.roles.cache.some(role => role.name === tempRoleName);
    }

    async createControlPanel(interaction) {
        const stats = this.getStatistics();
        
        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🎛️ Painel de Controle - Gatekeeper')
            .setDescription('Painel de controle do sistema de verificação')
            .addFields(
                { 
                    name: '📊 Estatísticas Gerais', 
                    value: `Sessões ativas: ${stats.activeSessions}\nUsuários verificados: ${stats.verifiedUsers}\nBypass ativos: ${stats.activeBypasses}`, 
                    inline: false 
                },
                { 
                    name: '🔐 Configurações', 
                    value: `Timeout: ${GATEKEEPER_CONFIG.verificationTimeout}s\nMáx tentativas: ${GATEKEEPER_CONFIG.maxAttempts}\nCache: ${GATEKEEPER_CONFIG.verifiedCacheTime}h`, 
                    inline: false 
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Sistema Avançado v2.0' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('gatekeeper_refresh')
                .setLabel('🔄 Atualizar')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('gatekeeper_cleanup')
                .setLabel('🧹 Limpar Sessões')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('gatekeeper_bypass')
                .setLabel('🔓 Conceder Bypass')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.followUp({ 
            embeds: [embed], 
            components: [row],
            ephemeral: true 
        });
    }

    getStatistics() {
        return {
            activeSessions: this.verificationSessions.size,
            verifiedUsers: this.verifiedUsers.size,
            activeBypasses: this.bypassUsers.size,
            uptime: process.uptime()
        };
    }

    startCleanupTimer() {
        // Limpar sessões expiradas a cada minuto
        setInterval(() => {
            this.cleanupExpiredSessions();
            this.cleanupExpiredBypasses();
        }, 60000); // 1 minuto
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.verificationSessions) {
            if (now - session.startTime > session.timeout) {
                this.verificationSessions.delete(sessionId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            advancedLogger.whitelist(
                'session_cleanup',
                `Limpeza de ${cleanedCount} sessões expiradas`,
                { cleanedCount }
            );
        }
    }

    cleanupExpiredBypasses() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [bypassKey, bypass] of this.bypassUsers) {
            if (now >= bypass.expiresAt) {
                this.bypassUsers.delete(bypassKey);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            advancedLogger.whitelist(
                'bypass_cleanup',
                `Limpeza de ${cleanedCount} bypasses expirados`,
                { cleanedCount }
            );
        }
    }

    async handleControlPanel(interaction) {
        const customId = interaction.customId;
        
        switch (customId) {
            case 'gatekeeper_refresh':
                await this.createControlPanel(interaction);
                break;
                
            case 'gatekeeper_cleanup':
                this.verificationSessions.clear();
                await interaction.followUp({
                    embeds: [new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('🧹 Sessões Limpeza')
                        .setDescription('Todas as sessões de verificação foram limpas.')
                    ],
                    ephemeral: true
                });
                break;
                
            case 'gatekeeper_bypass':
                // Abrir modal para conceder bypass
                const modal = new ModalBuilder()
                    .setCustomId('gatekeeper_bypass_modal')
                    .setTitle('🔓 Conceder Bypass Temporário')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('bypass_user_id')
                                .setLabel('ID do Usuário')
                                .setPlaceholder('ID numérico ou @menção')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('bypass_duration')
                                .setLabel('Duração (minutos)')
                                .setPlaceholder('Padrão: 15')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('bypass_reason')
                                .setLabel('Motivo')
                                .setPlaceholder('Motivo do bypass')
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(false)
                        )
                    );

                await interaction.showModal(modal);
                break;
        }
    }

    async handleBypassModal(interaction) {
        const userId = interaction.fields.getTextInputValue('bypass_user_id');
        const duration = parseInt(interaction.fields.getTextInputValue('bypass_duration')) || GATEKEEPER_CONFIG.bypassTimeout;
        const reason = interaction.fields.getTextInputValue('bypass_reason') || 'Bypass temporário';

        // Extrair ID do usuário
        let targetUserId = userId;
        if (userId.startsWith('<@')) {
            const mentionMatch = userId.match(/<@!?(\d+)>/);
            if (mentionMatch) {
                targetUserId = mentionMatch[1];
            }
        }

        if (!targetUserId) {
            return interaction.followUp({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ ID Inválido')
                    .setDescription('ID do usuário não encontrado ou inválido.')
                ],
                ephemeral: true
            });
        }

        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        if (!targetMember) {
            return interaction.followUp({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Usuário Não Encontrado')
                    .setDescription('Usuário não encontrado no servidor.')
                ],
                ephemeral: true
            });
        }

        // Conceder bypass
        await this.grantTemporaryBypass(targetUserId, interaction.guildId, duration, reason);

        await interaction.followUp({
            embeds: [new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔓 Bypass Concedido')
                .setDescription(`Bypass temporário concedido para ${targetMember.user.tag}`)
                .addFields(
                    { name: '⏰ Duração', value: `${duration} minutos`, inline: true },
                    { name: '💬 Motivo', value: reason, inline: true },
                    { name: '🆔 ID', value: targetUserId, inline: true }
                )
            ],
            ephemeral: true
        });
    }
}

// Instância global
const gatekeeper = new GatekeeperManager();

module.exports = {
    // Métodos principais
    checkUserEntry: (member, guild) => gatekeeper.checkUserEntry(member, guild),
    grantTemporaryBypass: (userId, guildId, duration, reason) => gatekeeper.grantTemporaryBypass(userId, guildId, duration, reason),
    hasTemporaryBypass: (userId, guildId) => gatekeeper.hasTemporaryBypass(userId, guildId),
    
    // Controle e estatísticas
    createControlPanel: (interaction) => gatekeeper.createControlPanel(interaction),
    handleControlPanel: (interaction) => gatekeeper.handleControlPanel(interaction),
    handleBypassModal: (interaction) => gatekeeper.handleBypassModal(interaction),
    
    // Verificação
    handleVerificationResponse: (interaction, sessionId, response) => gatekeeper.handleVerificationResponse(interaction, sessionId, response),
    
    // Estatísticas
    getStatistics: () => gatekeeper.getStatistics(),
    
    // Configurações
    CONFIG: GATEKEEPER_CONFIG
};
