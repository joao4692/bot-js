const path = require('path');
const db = require('../../utils/database');

const detranDbPath = path.join(__dirname, '../../data/detran/detran_data.json');

const defaultDetranProfile = {
    rg: {
        issued: false,
        number: null,
        issuer: null,
        timestamp: null,
    },
    cnh: {
        issued: false,
        number: null,
        category: null,
        issuer: null,
        timestamp: null,
    },
    vehicles: [],
};

async function getUser(key) {
    const allData = await db.read(detranDbPath, {});
    if (!allData[key]) {
        allData[key] = defaultDetranProfile;
        await db.write(detranDbPath, allData);
    }
    return allData[key];
}

async function saveUser(key, data) {
    const allData = await db.read(detranDbPath, {});
    allData[key] = data;
    await db.write(detranDbPath, allData);
}

async function getAll() {
    return await db.read(detranDbPath, {});
}

module.exports = { getUser, saveUser, getAll };
