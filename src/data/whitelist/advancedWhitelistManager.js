/**
 * Sistema Avançado de Whitelist
 * 
 * Recursos:
 * - Logs completos de todas as operações
 * - Sistema de aprovação automática
 * - Filtros e busca avançada
 * - Integração com sistema de logs
 * - Dashboard visual interativa
 * - Validação em tempo real
 * - Backup automático
 */

const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const advancedLogger = require('../../utils/advancedLogger');

// Configurações
const WHITELIST_CONFIG = {
    maxUsers: 1000,
    maxPendingApprovals: 100,
    autoApprovalTimeout: 7 * 24 * 60 * 60 * 1000, // 7 dias
    backupInterval: 24 * 60 * 60 * 1000, // 24 horas
    logLevel: 'WHITELIST'
};

const WHITELIST_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    EXPIRED: 'expired'
};

class AdvancedWhitelistManager {
    constructor() {
        this.whitelistDir = path.join(__dirname, '../../data');
        this.whitelistFile = path.join(this.whitelistDir, 'whitelist.json');
        this.backupFile = path.join(this.whitelistDir, 'whitelist.backup.json');
        this.logsFile = path.join(this.whitelistDir, 'whitelist_logs.json');
        
        this.initializeFiles();
        this.startBackupTimer();
    }

    initializeFiles() {
        // Criar diretório se não existir
        if (!fs.existsSync(this.whitelistDir)) {
            fs.mkdirSync(this.whitelistDir, { recursive: true });
        }

        // Inicializar arquivo principal
        if (!fs.existsSync(this.whitelistFile)) {
            this.saveData({
                version: '2.0',
                servers: {},
                global: {
                    enabled: false,
                    requireReason: true,
                    autoApprove: false,
                    minAccountAge: 7, // dias
                    minServerTime: 1, // horas
                    logAllActions: true
                },
                statistics: {
                    totalUsers: 0,
                    pendingApprovals: 0,
                    approvedToday: 0,
                    rejectedToday: 0,
                    lastCleanup: new Date().toISOString()
                }
            });
        }

        // Inicializar arquivo de logs
        if (!fs.existsSync(this.logsFile)) {
            fs.writeFileSync(this.logsFile, JSON.stringify({
                version: '2.0',
                logs: []
            }, null, 2));
        }
    }

    readData() {
        try {
            const data = fs.readFileSync(this.whitelistFile, 'utf-8');
            const parsed = JSON.parse(data);
            
            // Validação e migração automática
            if (!parsed.version || parsed.version < '2.0') {
                return this.migrateData(parsed);
            }
            
            return parsed;
        } catch (error) {
            console.error('Erro ao ler whitelist:', error);
            
            // Tentar restaurar do backup
            if (fs.existsSync(this.backupFile)) {
                try {
                    const backupData = JSON.parse(fs.readFileSync(this.backupFile, 'utf-8'));
                    this.saveData(backupData);
                    return backupData;
                } catch (backupError) {
                    console.error('Backup também corrompido:', backupError);
                }
            }
            
            // Retornar estrutura padrão
            return this.getDefaultStructure();
        }
    }

    getDefaultStructure() {
        return {
            version: '2.0',
            servers: {},
            global: {
                enabled: false,
                requireReason: true,
                autoApprove: false,
                minAccountAge: 7,
                minServerTime: 1,
                logAllActions: true
            },
            statistics: {
                totalUsers: 0,
                pendingApprovals: 0,
                approvedToday: 0,
                rejectedToday: 0,
                lastCleanup: new Date().toISOString()
            }
        };
    }

    migrateData(oldData) {
        console.log('Migrando dados da whitelist para v2.0...');
        
        const newData = this.getDefaultStructure();
        
        // Migrar dados antigos
        if (oldData.whitelists) {
            Object.entries(oldData.whitelists).forEach(([guildId, config]) => {
                if (config.users) {
                    newData.servers[guildId] = {
                        enabled: config.enabled || false,
                        requiredRole: config.requiredRole || null,
                        whitelistChannel: config.whitelistChannel || null,
                        verifyMessage: config.verifyMessage || "Olá {user}! Bem-vindo ao servidor. Você precisa ser verificado para acessar o servidor.",
                        approvedRole: config.approvedRole || null,
                        autoRole: config.autoRole !== false,
                        users: config.users.map(user => ({
                            id: user.id,
                            tag: user.tag,
                            status: WHITELIST_STATUS.APPROVED,
                            addedBy: user.addedBy,
                            addedAt: user.addedAt,
                            reason: user.reason || 'Migração automática',
                            approvedAt: user.addedAt,
                            approvedBy: user.addedBy,
                            lastActivity: user.addedAt
                        }))
                    };
                }
            });
        }
        
        this.saveData(newData);
        return newData;
    }

    saveData(data) {
        try {
            // Criar backup antes de salvar
            if (fs.existsSync(this.whitelistFile)) {
                fs.copyFileSync(this.whitelistFile, this.backupFile);
            }
            
            data.lastSaved = new Date().toISOString();
            fs.writeFileSync(this.whitelistFile, JSON.stringify(data, null, 2));
            
            // Log da operação
            this.logAction('SYSTEM', 'save_data', 'Dados da whitelist salvos', { 
                dataSize: JSON.stringify(data).length 
            });
            
            return true;
        } catch (error) {
            console.error('Erro ao salvar whitelist:', error);
            this.logAction('ERROR', 'save_error', 'Erro ao salvar dados', { 
                error: error.message 
            });
            return false;
        }
    }

    startBackupTimer() {
        setInterval(() => {
            try {
                if (fs.existsSync(this.whitelistFile)) {
                    fs.copyFileSync(this.whitelistFile, this.backupFile);
                    this.logAction('SYSTEM', 'backup_created', 'Backup automático criado');
                }
            } catch (error) {
                console.error('Erro ao criar backup:', error);
            }
        }, WHITELIST_CONFIG.backupInterval);
    }

    logAction(action, type, description, metadata = {}) {
        try {
            const logs = this.readLogs();
            
            const logEntry = {
                id: this.generateLogId(),
                timestamp: new Date().toISOString(),
                action,
                type,
                description,
                metadata,
                guild: metadata.guildId || 'global',
                user: metadata.userId || 'system',
                moderator: metadata.moderatorId || 'system'
            };

            logs.logs.unshift(logEntry);
            
            // Manter apenas os últimos 1000 logs
            if (logs.logs.length > 1000) {
                logs.logs = logs.logs.slice(0, 1000);
            }

            fs.writeFileSync(this.logsFile, JSON.stringify(logs, null, 2));
            
            // Integrar com sistema de logs principal
            if (logs.logs.length > 0) {
                advancedLogger.whitelist(
                    `${action}_${type}`,
                    description,
                    {
                        ...metadata,
                        logId: logEntry.id,
                        category: 'WHITELIST'
                    }
                );
            }
        } catch (error) {
            console.error('Erro ao salvar log da whitelist:', error);
        }
    }

    readLogs() {
        try {
            if (fs.existsSync(this.logsFile)) {
                const data = fs.readFileSync(this.logsFile, 'utf-8');
                return JSON.parse(data);
            }
            return { logs: [] };
        } catch (error) {
            console.error('Erro ao ler logs da whitelist:', error);
            return { logs: [] };
        }
    }

    generateLogId() {
        return `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Métodos de gerenciamento de usuários
    async addUserToWhitelist(guildId, userId, userTag, addedBy, reason = null, status = WHITELIST_STATUS.PENDING) {
        const data = this.readData();
        
        if (!data.servers[guildId]) {
            data.servers[guildId] = this.getDefaultServerConfig();
        }

        // Verificar se usuário já existe
        const existingUser = data.servers[guildId].users.find(u => u.id === userId);
        if (existingUser) {
            return { 
                success: false, 
                message: "Usuário já está na whitelist." 
            };
        }

        // Verificar limite de usuários
        if (data.servers[guildId].users.length >= WHITELIST_CONFIG.maxUsers) {
            return { 
                success: false, 
                message: `Limite de usuários na whitelist atingido (${WHITELIST_CONFIG.maxUsers}).` 
            };
        }

        const newUser = {
            id: userId,
            tag: userTag,
            status,
            addedBy,
            addedAt: new Date().toISOString(),
            reason,
            lastActivity: new Date().toISOString()
        };

        data.servers[guildId].users.push(newUser);
        this.updateStatistics(data, 'add_user');

        const saved = this.saveData(data);
        
        this.logAction('ADD_USER', status, `Usuário ${userTag} adicionado à whitelist`, {
            guildId,
            userId,
            userTag,
            addedBy,
            reason,
            status
        });

        return { 
            success: saved, 
            message: `Usuário adicionado à whitelist com status: ${status}`,
            userId: newUser.id
        };
    }

    async removeUserFromWhitelist(guildId, userId, removedBy, reason = null) {
        const data = this.readData();
        
        if (!data.servers[guildId]) {
            return { 
                success: false, 
                message: "Nenhuma whitelist configurada neste servidor." 
            };
        }

        const userIndex = data.servers[guildId].users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return { 
                success: false, 
                message: "Usuário não encontrado na whitelist." 
            };
        }

        const removedUser = data.servers[guildId].users[userIndex];
        data.servers[guildId].users.splice(userIndex, 1);
        this.updateStatistics(data, 'remove_user');

        const saved = this.saveData(data);
        
        this.logAction('REMOVE_USER', 'removed', `Usuário ${removedUser.tag} removido da whitelist`, {
            guildId,
            userId,
            userTag: removedUser.tag,
            removedBy,
            reason,
            removedUser
        });

        return { 
            success: saved, 
            message: "Usuário removido da whitelist com sucesso!" 
        };
    }

    async approveUser(guildId, userId, approvedBy, reason = null) {
        const data = this.readData();
        
        if (!data.servers[guildId]) {
            return { success: false, message: "Servidor não configurado." };
        }

        const user = data.servers[guildId].users.find(u => u.id === userId);
        if (!user) {
            return { success: false, message: "Usuário não encontrado." };
        }

        if (user.status === WHITELIST_STATUS.APPROVED) {
            return { success: false, message: "Usuário já está aprovado." };
        }

        user.status = WHITELIST_STATUS.APPROVED;
        user.approvedAt = new Date().toISOString();
        user.approvedBy = approvedBy;
        user.approvalReason = reason;

        this.updateStatistics(data, 'approve_user');
        const saved = this.saveData(data);

        this.logAction('APPROVE_USER', 'approved', `Usuário ${user.tag} aprovado na whitelist`, {
            guildId,
            userId,
            userTag: user.tag,
            approvedBy,
            reason
        });

        return { 
            success: saved, 
            message: "Usuário aprovado com sucesso!" 
        };
    }

    async rejectUser(guildId, userId, rejectedBy, reason = null) {
        const data = this.readData();
        
        if (!data.servers[guildId]) {
            return { success: false, message: "Servidor não configurado." };
        }

        const user = data.servers[guildId].users.find(u => u.id === userId);
        if (!user) {
            return { success: false, message: "Usuário não encontrado." };
        }

        if (user.status === WHITELIST_STATUS.REJECTED) {
            return { success: false, message: "Usuário já está rejeitado." };
        }

        user.status = WHITELIST_STATUS.REJECTED;
        user.rejectedAt = new Date().toISOString();
        user.rejectedBy = rejectedBy;
        user.rejectionReason = reason;

        this.updateStatistics(data, 'reject_user');
        const saved = this.saveData(data);

        this.logAction('REJECT_USER', 'rejected', `Usuário ${user.tag} rejeitado na whitelist`, {
            guildId,
            userId,
            userTag: user.tag,
            rejectedBy,
            reason
        });

        return { 
            success: saved, 
            message: "Usuário rejeitado com sucesso!" 
        };
    }

    async searchUsers(guildId, filters = {}) {
        const data = this.readData();
        
        if (!data.servers[guildId]) {
            return [];
        }

        let users = data.servers[guildId].users;

        // Aplicar filtros
        if (filters.status) {
            users = users.filter(u => u.status === filters.status);
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            users = users.filter(u => 
                u.tag.toLowerCase().includes(searchTerm) ||
                u.id.toLowerCase().includes(searchTerm) ||
                (u.reason && u.reason.toLowerCase().includes(searchTerm))
            );
        }

        if (filters.addedBy) {
            users = users.filter(u => u.addedBy === filters.addedBy);
        }

        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            users = users.filter(u => new Date(u.addedAt) >= fromDate);
        }

        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            users = users.filter(u => new Date(u.addedAt) <= toDate);
        }

        // Limitar resultados
        const limit = filters.limit || 50;
        return users.slice(0, limit);
    }

    getDefaultServerConfig() {
        return {
            enabled: false,
            requiredRole: null,
            whitelistChannel: null,
            verifyMessage: "Olá {user}! Bem-vindo ao servidor. Você precisa ser verificado para acessar o servidor.",
            approvedRole: null,
            autoRole: true,
            users: []
        };
    }

    updateStatistics(data, action) {
        if (!data.statistics) {
            data.statistics = {
                totalUsers: 0,
                pendingApprovals: 0,
                approvedToday: 0,
                rejectedToday: 0,
                lastCleanup: new Date().toISOString()
            };
        }

        const today = new Date().toDateString();
        
        switch (action) {
            case 'add_user':
                data.statistics.totalUsers++;
                break;
            case 'approve_user':
                if (new Date().toDateString() === today) {
                    data.statistics.approvedToday++;
                }
                break;
            case 'reject_user':
                if (new Date().toDateString() === today) {
                    data.statistics.rejectedToday++;
                }
                break;
        }

        // Contar aprovações pendentes
        data.statistics.pendingApprovals = data.servers ? 
            Object.values(data.servers).reduce((total, server) => 
                total + server.users.filter(u => u.status === WHITELIST_STATUS.PENDING).length, 0
            ) : 0;

        data.statistics.lastCleanup = new Date().toISOString();
    }

    getStatistics(guildId = null) {
        const data = this.readData();
        
        if (guildId && data.servers[guildId]) {
            const server = data.servers[guildId];
            return {
                totalUsers: server.users.length,
                pending: server.users.filter(u => u.status === WHITELIST_STATUS.PENDING).length,
                approved: server.users.filter(u => u.status === WHITELIST_STATUS.APPROVED).length,
                rejected: server.users.filter(u => u.status === WHITELIST_STATUS.REJECTED).length,
                lastAdded: server.users.length > 0 ? 
                    server.users.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))[0].addedAt : null
            };
        }

        return data.statistics;
    }

    getServerConfig(guildId) {
        const data = this.readData();
        return data.servers[guildId] || this.getDefaultServerConfig();
    }

    saveServerConfig(guildId, config) {
        const data = this.readData();
        data.servers[guildId] = config;
        return this.saveData(data);
    }

    isUserWhitelisted(guildId, userId) {
        const data = this.readData();
        
        if (!data.servers[guildId] || !data.servers[guildId].enabled) {
            return false; // Se não existir ou não estiver habilitado
        }

        const user = data.servers[guildId].users.find(u => u.id === userId);
        return user && user.status === WHITELIST_STATUS.APPROVED;
    }

    getWhitelistedUser(guildId, userId) {
        const data = this.readData();
        
        if (!data.servers[guildId]) {
            return null;
        }

        return data.servers[guildId].users.find(u => u.id === userId) || null;
    }

    async cleanupExpiredUsers() {
        const data = this.readData();
        let cleanedCount = 0;

        Object.entries(data.servers).forEach(([guildId, server]) => {
            const originalLength = server.users.length;
            
            server.users = server.users.filter(user => {
                // Remover usuários pendentes há mais tempo que o timeout
                if (user.status === WHITELIST_STATUS.PENDING) {
                    const pendingTime = Date.now() - new Date(user.addedAt).getTime();
                    if (pendingTime > WHITELIST_CONFIG.autoApprovalTimeout) {
                        user.status = WHITELIST_STATUS.EXPIRED;
                        user.expiredAt = new Date().toISOString();
                        cleanedCount++;
                        return false; // Remover
                    }
                }
                return true; // Manter
            });

            if (server.users.length !== originalLength) {
                this.logAction('CLEANUP', 'expired', `Limpeza de usuários expirados no servidor ${guildId}`, {
                    guildId,
                    cleanedCount: originalLength - server.users.length
                });
            }
        });

        if (cleanedCount > 0) {
            this.updateStatistics(data, 'cleanup');
            this.saveData(data);
        }

        return cleanedCount;
    }
}

// Instância global
const whitelistManager = new AdvancedWhitelistManager();

module.exports = {
    // Constantes
    STATUS: WHITELIST_STATUS,
    CONFIG: WHITELIST_CONFIG,

    // Métodos principais
    addUser: (guildId, userId, userTag, addedBy, reason, status) => 
        whitelistManager.addUserToWhitelist(guildId, userId, userTag, addedBy, reason, status),
    
    removeUser: (guildId, userId, removedBy, reason) => 
        whitelistManager.removeUserFromWhitelist(guildId, userId, removedBy, reason),
    
    approveUser: (guildId, userId, approvedBy, reason) => 
        whitelistManager.approveUser(guildId, userId, approvedBy, reason),
    
    rejectUser: (guildId, userId, rejectedBy, reason) => 
        whitelistManager.rejectUser(guildId, userId, rejectedBy, reason),

    // Métodos de consulta
    isWhitelisted: (guildId, userId) => 
        whitelistManager.isUserWhitelisted(guildId, userId),
    
    getUser: (guildId, userId) => 
        whitelistManager.getWhitelistedUser(guildId, userId),
    
    searchUsers: (guildId, filters) => 
        whitelistManager.searchUsers(guildId, filters),

    // Configuração
    getServerConfig: (guildId) => 
        whitelistManager.getServerConfig(guildId),
    
    saveServerConfig: (guildId, config) => 
        whitelistManager.saveServerConfig(guildId, config),

    // Estatísticas e logs
    getStatistics: (guildId) => 
        whitelistManager.getStatistics(guildId),
    
    getLogs: () => 
        whitelistManager.readLogs(),

    // Manutenção
    cleanup: () => 
        whitelistManager.cleanupExpiredUsers(),

    // Compatibilidade com sistema antigo
    getGuildWhitelistConfig: (guildId) => {
        const config = whitelistManager.getServerConfig(guildId);
        return {
            enabled: config.enabled,
            requiredRole: config.requiredRole,
            whitelistChannel: config.whitelistChannel,
            verifyMessage: config.verifyMessage,
            approvedRole: config.approvedRole,
            autoRole: config.autoRole,
            users: config.users.filter(u => u.status === WHITELIST_STATUS.APPROVED)
                .map(u => ({
                    id: u.id,
                    tag: u.tag,
                    addedBy: u.addedBy,
                    addedAt: u.addedAt,
                    reason: u.reason
                }))
        };
    }
};
