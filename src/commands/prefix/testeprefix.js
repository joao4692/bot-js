const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'imagens',
    description: 'Pega imagens de um canal e envia para outro com o # do canal de origem',
    cooldown: 10,

    async execute(message, args, client) {
        // Verificação básica
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const canalOrigem = message.mentions.channels.first();
        const canalDestino = message.mentions.channels.last();

        if (!canalOrigem || !canalDestino) {
            return message.reply(
                '❌ Use assim:\n`!imagens #canal-origem #canal-destino`'
            );
        }

        try {
            // Buscar mensagens do canal de origem
            const mensagens = await canalOrigem.messages.fetch({ limit: 50 });

            // Filtrar mensagens que possuem imagens
            const mensagensComImagem = mensagens.filter(msg =>
                msg.attachments.size > 0
            );

            if (mensagensComImagem.size === 0) {
                return message.reply('⚠️ Nenhuma imagem encontrada no canal.');
            }

            // Enviar imagens para o canal de destino
            for (const msg of mensagensComImagem.values()) {
                for (const attachment of msg.attachments.values()) {
                    canalDestino.send({
                        content: `📸 Imagem vinda de ${canalOrigem}`,
                        files: [attachment.url],
                    });
                }
            }

            message.reply('✅ Imagens enviadas com sucesso!');
        } catch (error) {
            console.error(error);
            message.reply('❌ Ocorreu um erro ao processar as imagens.');
        }
    },
};
