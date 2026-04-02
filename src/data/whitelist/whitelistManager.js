const fs = require('fs');
const path = require('path');

const whitelistFilePath = path.join(__dirname, '../../data/whitelist.json');

// Garantir que o arquivo existe
function ensureWhitelistFile() {
    const dir = path.dirname(whitelistFilePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(whitelistFilePath)) {
        fs.writeFileSync(whitelistFilePath, JSON.stringify({ whitelists: {} }, null, 4));
    }
}

/**
 * Lê todos os dados de whitelist
 */
function readWhitelist() {
    ensureWhitelistFile();
    try {
        const data = fs.readFileSync(whitelistFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { whitelists: {} };
    }
}

/**
 * Salva os dados de whitelist
 */
function saveWhitelist(data) {
    ensureWhitelistFile();
    fs.writeFileSync(whitelistFilePath, JSON.stringify(data, null, 4));
}

/**
 * Obtém a configuração de whitelist de um servidor
 */
function getGuildWhitelistConfig(guildId) {
    const data = readWhitelist();
    return data.whitelists[guildId] || {
        enabled: false, // Sempre inicia como OFF
        requiredRole: null,
        whitelistChannel: null,
        verifyMessage: "Olá {user}! Bem-vindo ao servidor. Você precisa ser verificado para acessar o servidor.",
        approvedRole: null,
        autoRole: true,
        users: []
    };
}

/**
 * Salva a configuração de whitelist de um servidor
 */
function saveGuildWhitelistConfig(guildId, config) {
    const data = readWhitelist();
    data.whitelists[guildId] = config;
    saveWhitelist(data);
}

/**
 * Adiciona um usuário à whitelist
 */
function addUserToWhitelist(guildId, userId, userTag, addedBy, reason = null) {
    const data = readWhitelist();
    
    if (!data.whitelists[guildId]) {
        data.whitelists[guildId] = {
            enabled: false,
            requiredRole: null,
            whitelistChannel: null,
            verifyMessage: "Olá {user}! Bem-vindo ao servidor. Você precisa ser verificado para acessar o servidor.",
            approvedRole: null,
            autoRole: true,
            users: []
        };
    }
    
    // Verificar se usuário já está na whitelist
    const existingIndex = data.whitelists[guildId].users.findIndex(u => u.id === userId);
    
    if (existingIndex !== -1) {
        return { success: false, message: "Usuário já está na whitelist." };
    }
    
    data.whitelists[guildId].users.push({
        id: userId,
        tag: userTag,
        addedBy: addedBy,
        addedAt: Date.now(),
        reason: reason
    });
    
    saveWhitelist(data);
    return { success: true, message: "Usuário adicionado à whitelist com sucesso!" };
}

/**
 * Remove um usuário da whitelist
 */
function removeUserFromWhitelist(guildId, userId) {
    const data = readWhitelist();
    
    if (!data.whitelists[guildId]) {
        return { success: false, message: "Nenhuma whitelist configurada neste servidor." };
    }
    
    const userIndex = data.whitelists[guildId].users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return { success: false, message: "Usuário não encontrado na whitelist." };
    }
    
    data.whitelists[guildId].users.splice(userIndex, 1);
    saveWhitelist(data);
    
    return { success: true, message: "Usuário removido da whitelist com sucesso!" };
}

/**
 * Verifica se um usuário está na whitelist
 */
function isUserWhitelisted(guildId, userId) {
    const data = readWhitelist();
    
    if (!data.whitelists[guildId] || !data.whitelists[guildId].enabled) {
        return false; // Se whitelist não está habilitada, permite todos
    }
    
    const user = data.whitelists[guildId].users.find(u => u.id === userId);
    return !!user;
}

/**
 * Obtém informações de um usuário na whitelist
 */
function getWhitelistedUser(guildId, userId) {
    const data = readWhitelist();
    
    if (!data.whitelists[guildId]) {
        return null;
    }
    
    return data.whitelists[guildId].users.find(u => u.id === userId) || null;
}

/**
 * Lista todos os usuários na whitelist
 */
function listWhitelistUsers(guildId) {
    const data = readWhitelist();
    
    if (!data.whitelists[guildId]) {
        return [];
    }
    
    return data.whitelists[guildId].users || [];
}

/**
 * Limpa todos os usuários da whitelist
 */
function clearWhitelist(guildId) {
    const data = readWhitelist();
    
    if (!data.whitelists[guildId]) {
        return { success: false, message: "Nenhuma whitelist configurada neste servidor." };
    }
    
    data.whitelists[guildId].users = [];
    saveWhitelist(data);
    
    return { success: true, message: "Whitelist limpa com sucesso!" };
}

module.exports = {
    getGuildWhitelistConfig,
    saveGuildWhitelistConfig,
    addUserToWhitelist,
    removeUserFromWhitelist,
    isUserWhitelisted,
    getWhitelistedUser,
    listWhitelistUsers,
    clearWhitelist
};
