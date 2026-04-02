const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('movercall')
        .setDescription('Move um membro específico ou todos de uma call para outra.')
        
        .addChannelOption(option =>
            option.setName('origem')
                .setDescription('Call de origem')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice)
        )

        .addChannelOption(option =>
            option.setName('destino')
                .setDescription('Call de destino')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice)
        )

        .addUserOption(option =>
            option.setName('membro')
                .setDescription('Membro específico para mover (opcional)')
                .setRequired(false)
        )

        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {

        const origem = interaction.options.getChannel('origem');
        const destino = interaction.options.getChannel('destino');
        const usuario = interaction.options.getUser('membro');

        if (origem.id === destino.id) {
            return interaction.reply({
                content: '❌ As calls precisam ser diferentes.',
                ephemeral: true
            });
        }

        // 🔹 Caso seja escolhido um membro específico
        if (usuario) {

            const membro = await interaction.guild.members.fetch(usuario.id);

            if (!membro.voice.channel || membro.voice.channel.id !== origem.id) {
                return interaction.reply({
                    content: '❌ Esse membro não está na call de origem.',
                    ephemeral: true
                });
            }

            try {
                await membro.voice.setChannel(destino);
                return interaction.reply({
                    content: `✅ ${usuario.tag} foi movido para ${destino.name}.`,
                    ephemeral: true
                });
            } catch (error) {
                return interaction.reply({
                    content: '❌ Não consegui mover esse membro. Verifique minhas permissões.',
                    ephemeral: true
                });
            }
        }

        // 🔹 Caso NÃO escolha membro → mover todos
        const membros = origem.members;

        if (membros.size === 0) {
            return interaction.reply({
                content: '❌ Não há membros na call de origem.',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: `🔄 Movendo ${membros.size} membros...`,
            ephemeral: true
        });

        for (const [id, member] of membros) {
            try {
                await member.voice.setChannel(destino);
            } catch (error) {
                console.log(`Erro ao mover ${member.user.tag}`);
            }
        }

        await interaction.followUp({
            content: '✅ Todos os membros foram movidos com sucesso!',
            ephemeral: true
        });
    }
};