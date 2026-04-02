const fs = require("fs");
const path = require("path");

const BASE_PATH = path.join(__dirname, "../data/identidade");
const cache = new Map();

/* ===================== HELPERS ===================== */

function ensureDir() {
    if (!fs.existsSync(BASE_PATH)) {
        fs.mkdirSync(BASE_PATH, { recursive: true });
    }
}

function getFilePath(guildId) {
    return path.join(BASE_PATH, `${guildId}.json`);
}

/* ===================== CORE ===================== */

function loadGuildDB(guildId) {
    if (cache.has(guildId)) return cache.get(guildId);

    ensureDir();
    const filePath = getFilePath(guildId);

    if (!fs.existsSync(filePath)) {
        cache.set(guildId, {});
        return {};
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        cache.set(guildId, data);
        return data;
    } catch (err) {
        console.error(`Erro ao ler JSON da guild ${guildId}`, err);
        cache.set(guildId, {});
        return {};
    }
}

function saveGuildDB(guildId) {
    if (!cache.has(guildId)) return;

    ensureDir();
    const filePath = getFilePath(guildId);

    fs.writeFile(
        filePath,
        JSON.stringify(cache.get(guildId), null, 2),
        err => {
            if (err) {
                console.error(`Erro ao salvar JSON da guild ${guildId}`, err);
            }
        }
    );
}

/* ===================== API ===================== */

function getUserData(guildId, userId) {
    const db = loadGuildDB(guildId);

    db[userId] ??= {
        rg: {
            issued: false,
            number: null,
            issuer: null,
            timestamp: null
        }
    };

    saveGuildDB(guildId);
    return db[userId];
}

function updateUserData(guildId, userId, data) {
    const db = loadGuildDB(guildId);
    db[userId] = data;
    saveGuildDB(guildId);
}

module.exports = {
    getUserData,
    updateUserData
};
