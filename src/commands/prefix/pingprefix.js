module.exports = {
    name: 'ping',
    description: 'Replies with Pong!',
    aliases: ['p'],
    cooldown: 5,
    execute(message, args, client) {
        message.reply('Pong! (prefix)');
    },
};
