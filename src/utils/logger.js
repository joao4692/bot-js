const { EmbedBuilder } = require('discord.js');
const colors = {
    reset: '\x1b[0m',
    gray: '\x1b[90m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
};

function now() {
    return new Date().toISOString();
}

function log(level, msg, ctx = {}) {
    const map = {
        DEBUG: colors.gray + '🐞 DEBUG',
        INFO: colors.cyan + 'ℹ️  INFO',
        WARN: colors.yellow + '⚠️  WARN',
        ERROR: colors.red + '❌ ERROR',
        SUCCESS: colors.green + '✅ SUCCESS',
    };
    const env = process.env.NODE_ENV || 'production';
    if (level === 'DEBUG' && env !== 'development') return;
    const ts = colors.blue + '[' + now() + ']' + colors.reset;
    let ctxStr = '';
    if (ctx && Object.keys(ctx).length) ctxStr = colors.magenta + JSON.stringify(ctx) + colors.reset;
    console.log(`${ts} ${map[level] || level}${colors.reset} | ${msg} ${ctxStr}`);
}

/**
 * Sends a log message to the configured log channel.
 * @param {import('discord.js').Client} client The Discord client.
 * @param {object} guildConfig The guild's configuration object.
 * @param {object} logData The data for the log embed.
 * @param {string} logData.title The title of the log.
 * @param {string} logData.color The color of the embed.
 * @param {Array<{name: string, value: string, inline?: boolean}>} logData.fields The fields for the embed.
 */
async function sendLog(client, guildConfig, logData) {
    // logData.type: "loja", "banco", "economia", "rp", "policia", "detran", "hospital", "governo", "inventario", "empregos", etc
    let channelId = null;
    if (logData.type && guildConfig.logs && guildConfig.logs[logData.type]) {
        channelId = guildConfig.logs[logData.type];
    } else if (guildConfig.logChannel) {
        channelId = guildConfig.logChannel;
    }
    if (!channelId) return;
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) return;
        const embed = new EmbedBuilder()
            .setTitle(logData.title)
            .setColor(logData.color)
            .addFields(logData.fields)
            .setTimestamp();
        await channel.send({ embeds: [embed] });
    } catch (error) {
        log('ERROR', `Failed to send log to channel ${channelId}: ${error}`);
    }
}

module.exports = {
    log,
    sendLog,
    logger: {
        log
    }
};
