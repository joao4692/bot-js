const path = require('path');
const db = require('../../utils/database');

const economyFilePath = path.join(__dirname, '../../../data/economy/users.json');

// Default structure for a new user
const defaultUser = {
    wallet: 0,
    bank: 0,
    lastDaily: 0,
    lastWork: 0,
    lastRob: 0,
    transactions: [],
};

async function getUser(key) {
    const allUsers = await db.read(economyFilePath, {});
    if (!allUsers[key]) {
        allUsers[key] = defaultUser;
        await db.write(economyFilePath, allUsers);
    }
    return allUsers[key];
}

async function saveUser(key, data) {
    const allUsers = await db.read(economyFilePath, {});
    allUsers[key] = data;
    await db.write(economyFilePath, allUsers);
}

async function getAllUsers() {
    return await db.read(economyFilePath, {});
}

module.exports = { getUser, saveUser, getAllUsers };
