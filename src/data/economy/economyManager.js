const provider = require("./jsonprovider");

/**
 * Obtém todos os usuários da economia
 */
async function getAllUsers(guildId, guildConfig = {}) {
    const allUsers = await provider.getAllUsers();
    const economyConfig = guildConfig.economy || {};
    const mode = economyConfig.mode || "local";

    // Filtrar usuários baseado no modo
    const filteredUsers = {};
    for (const [key, user] of Object.entries(allUsers)) {
        let include = false;
        switch (mode) {
            case "global":
                if (key.startsWith("global_")) include = true;
                break;
            case "interconnected": {
                const primaryGuild = economyConfig.interconnected_guilds?.[0] || guildId;
                if (key.startsWith(`interconnected_${primaryGuild}_`)) include = true;
                break;
            }
            case "local":
            default:
                if (key.startsWith(`local_${guildId}_`)) include = true;
                break;
        }
        if (include) {
            // Adicionar userId e guildId ao objeto do usuário
            const parts = key.split("_");
            user.userId = parts[parts.length - 1];
            user.guildId = guildId;
            filteredUsers[key] = user;
        }
    }
    return Object.values(filteredUsers);
}

/**
 * Gera a chave única do usuário baseada no modo da economia
 * PADRÃO DEFINITIVO: (guildId, userId, guildConfig)
 */
function getKey(guildId, userId, guildConfig = {}) {
    const economyConfig = guildConfig.economy || {};
    const mode = economyConfig.mode || "local";

    switch (mode) {
        case "global":
            return `global_${userId}`;

        case "interconnected": {
            const primaryGuild =
                economyConfig.interconnected_guilds?.[0] || guildId;
            return `interconnected_${primaryGuild}_${userId}`;
        }

        case "local":
        default:
            return `local_${guildId}_${userId}`;
    }
}

/**
 * Obtém ou cria usuário da economia
 */
async function getUser(guildId, userId, guildConfig = {}) {
    const userKey = getKey(guildId, userId, guildConfig);

    let user = await provider.getUser(userKey);

    // 🔒 GARANTE DADOS PADRÃO
    if (!user) {
        user = {
            wallet: guildConfig?.economy?.startWallet ?? 0,
            bank: guildConfig?.economy?.startBank ?? 0,
            transactions: []
        };

        await provider.saveUser(userKey, user);
    }

    return user;
}

/**
 * Salva dados do usuário
 */
async function saveUser(guildId, userId, guildConfig = {}, data) {
    const userKey = getKey(guildId, userId, guildConfig);
    return await provider.saveUser(userKey, data);
}

/**
 * Adiciona transação ao histórico
 */
async function addTransaction(
    guildId,
    userId,
    guildConfig = {},
    type,
    amount,
    description
) {
    const user = await getUser(guildId, userId, guildConfig);

    if (!Array.isArray(user.transactions)) {
        user.transactions = [];
    }

    user.transactions.push({
        type,
        amount,
        description,
        timestamp: new Date().toISOString()
    });

    // Mantém apenas as últimas 50 transações
    if (user.transactions.length > 50) {
        user.transactions.shift();
    }

    await saveUser(guildId, userId, guildConfig, user);
}

module.exports = {
    getUser,
    saveUser,
    addTransaction,
    getKey,
    getAllUsers
};
