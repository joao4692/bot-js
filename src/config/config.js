const fs = require('fs');
const path = require('path');

let voiceConfig = {};

try {
    const voiceConfigPath = path.join(__dirname, '../json/voice.json');
    if (fs.existsSync(voiceConfigPath)) {
        voiceConfig = JSON.parse(fs.readFileSync(voiceConfigPath, 'utf-8'));
    }
} catch (error) {
    console.error('Erro ao carregar voice.json:', error);
}

module.exports = {
    prefix: '!',
    embedColor: '#0099ff',
    ownerId: 'your_owner_id_here',
    database: 'json',
    economyMode: 'guild',
    voiceConfig: voiceConfig,
    // Add more config options as needed
};
