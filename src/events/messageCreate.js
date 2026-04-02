const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { checkPermission } = require('../utils/permissionMiddleware');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            if (!message || !message.content) return;
            if (message.author?.bot) return;

            // Comandos prefix funcionam apenas em servidor
            if (!message.guild || !message.member) return;

            const prefix = client?.config?.prefix || '!';
            if (!message.content.startsWith(prefix)) return;

            // Remove prefix and split into command and args
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = (args.shift() || '').toLowerCase();
            if (!commandName) return;

            // Get command from client.commands collection
            const command = client.commands.get(commandName) ||
                           client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (!command) return;

            // Verificar permissões (mesmo sistema v3 usado em slash)
            const permCheck = await checkPermission(
                message.member,
                message.guild.id,
                command.name,
                'command',
                { channelId: message.channel.id }
            );

            if (!permCheck.allowed) {
                return message.reply(`❌ Sem permissão para usar este comando. ${permCheck.reason ? `(${permCheck.reason})` : ''}`);
            }

            // Check cooldowns
            if (command.cooldown) {
                const now = Date.now();
                const timestamps = client.cooldowns.get(command.name) || new Map();

                if (timestamps.has(message.author.id)) {
                    const expirationTime = timestamps.get(message.author.id) + command.cooldown * 1000;

                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        return message.reply(`⏰ Aguarde ${timeLeft.toFixed(1)} segundos antes de usar \`${command.name}\` novamente.`);
                    }
                }

                timestamps.set(message.author.id, now);
                setTimeout(() => timestamps.delete(message.author.id), command.cooldown * 1000);
                client.cooldowns.set(command.name, timestamps);
            }

            try {
                logger.log('DEBUG', `[messageCreate] Prefix command: ${commandName}`, { user: message.author.id });
                // Execute command
                await command.execute(message, args, client);
            } catch (error) {
                logger.log('ERROR', `Erro executando comando ${command.name}: ${error.message}`);
                console.error(`Erro executando comando ${command.name}:`, error);
                message.reply('❌ Ocorreu um erro ao executar este comando.');
            }
        } catch (err) {
            logger.log('ERROR', `Erro em messageCreate: ${err.message}`);
            console.error('Erro em messageCreate:', err);
        }
    },
};
