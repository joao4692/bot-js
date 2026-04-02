const fs = require('fs/promises');
const path = require('path');

const configDir = path.join(__dirname, '../data/guilds');

const defaultConfig = {
    prefix: '!',
    embedColor: '#0099ff',
    logChannel: null,
    adminRoles: [],
    staffRoles: [],
    commandPermissions: {},

    // ✅ SISTEMA DE PIX
    pixImage: null,    // URL da imagem do QR Code PIX
    pixKey: null,       // Chave PIX (CPF, telefone, email ou aleatória)

    economy: {
        mode: 'local', // local | global | interconnected
        currency: '💰',

        dailyReward: 100,
        workReward: {
            min: 50,
            max: 200
        },

        robChance: 0.4,
        interconnected_guilds: [],

        // ✅ SISTEMA DE IMPOSTOS
        taxes: {
            deposit: 5,    // %
            withdraw: 10,  // %
            pay: 3         // %
        },

        loan: {
            maxLoan: 50000,        // valor máximo
            interest: 0.10,         // juros fixos ao pegar
            dailyFine: 0.02,        // multa diária
            autoDiscount: true      // desconta automático do banco/carteira
        }
    },

    rp: {
        enabled: false
    }
};

// Cache em memória
const guildConfigs = new Map();

async function ensureDir() {
    try {
        await fs.access(configDir);
    } catch {
        await fs.mkdir(configDir, { recursive: true });
    }
}

async function getGuildConfig(guildId) {
    await ensureDir();
    const configPath = path.join(configDir, `${guildId}.json`);

    try {
        const raw = await fs.readFile(configPath, 'utf8');
        const savedConfig = JSON.parse(raw);

        // ✅ MERGE PROFUNDO (corrige bugs de economy/rp)
        const finalConfig = {
            ...defaultConfig,
            ...savedConfig,
            economy: {
                ...defaultConfig.economy,
                ...savedConfig.economy
            },
            rp: {
                ...defaultConfig.rp,
                ...savedConfig.rp
            }
        };

        guildConfigs.set(guildId, finalConfig);
        return finalConfig;

    } catch {
        // Cria config nova se não existir
        await fs.writeFile(
            configPath,
            JSON.stringify(defaultConfig, null, 4)
        );

        guildConfigs.set(guildId, defaultConfig);
        return defaultConfig;
    }
}

async function saveGuildConfig(guildId, config) {
    guildConfigs.set(guildId, config);
    await ensureDir();

    const configPath = path.join(configDir, `${guildId}.json`);
    await fs.writeFile(
        configPath,
        JSON.stringify(config, null, 4)
    );
}

module.exports = {
    getGuildConfig,
    saveGuildConfig
};
