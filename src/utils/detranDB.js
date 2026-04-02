const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../data/detran.json");

function ensureDB() {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
}

function readDB() {
    ensureDB();
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getUser(guildId, userId) {
    const db = readDB();

    if (!db[guildId]) db[guildId] = {};
    if (!db[guildId][userId]) {
        db[guildId][userId] = {
            cnh: {
                issued: false,
                number: null,
                category: null,
                points: 0,
                issuer: null,
                issuedAt: null
            }
        };
        writeDB(db);
    }

    return { db, user: db[guildId][userId] };
}

module.exports = { readDB, writeDB, getUser };
