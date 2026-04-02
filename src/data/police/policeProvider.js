const path = require('path');
const db = require('../../utils/database');

const policeDbPath = path.join(__dirname, '../../data/police/police_data.json');

const defaultPoliceProfile = {
    // Dados de prisão
    isJailed: false,
    jailTime: 0,
    jailReason: null,
    jailedBy: null,
    jailedAt: null,
    bail: 0,
    
    // Dados de liberação
    releaseReason: null,
    releasedBy: null,
    releasedAt: null,
    
    // Multas e registros
    fines: [],
    records: [],
};

async function getUser(key) {
    const allData = await db.read(policeDbPath, {});
    if (!allData[key]) {
        allData[key] = defaultPoliceProfile;
        await db.write(policeDbPath, allData);
    }
    return allData[key];
}

async function saveUser(key, data) {
    const allData = await db.read(policeDbPath, {});
    allData[key] = data;
    await db.write(policeDbPath, allData);
}

module.exports = { getUser, saveUser };
