const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kickcall')
        .setDescription('Remove um membro específico ou todos de uma call.')

        .addChannelOption(option =>
            option.setName('call')
                .setDescription('Call de onde os membros serão removidos')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice)
        )

        .addUserOption(option =>
            option.setName('membro')
                .setDescription('Membro específico para remover (opcional)')
                .setRequired(false)
        )

        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {

        const call = interaction.options.getChannel('call');
        const usuario = interaction.options.getUser('membro');

        // 🔹 Se escolher um membro específico
        if (usuario) {

            const membro = await interaction.guild.members.fetch(usuario.id);

            if (!membro.voice.channel || membro.voice.channel.id !== call.id) {
                return interaction.reply({
                    content: '❌ Esse membro não está nessa call.',
                    ephemeral: true
                });
            }

            try {
                await membro.voice.disconnect();
                return interaction.reply({
                    content: `✅ ${usuario.tag} foi removido da call.`,
                    ephemeral: true
                });
            } catch (error) {
                return interaction.reply({
                    content: '❌ Não consegui remover esse membro. Verifique minhas permissões.',
                    ephemeral: true
                });
            }
        }

        // 🔹 Se NÃO escolher membro → remover todos
        const membros = call.members;

        if (membros.size === 0) {
            return interaction.reply({
                content: '❌ Não há membros nessa call.',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: `🔄 Removendo ${membros.size} membros...`,
            ephemeral: true
        });

        for (const [id, member] of membros) {
            try {
                await member.voice.disconnect();
            } catch (error) {
                console.log(`Erro ao remover ${member.user.tag}`);
            }
        }

        await interaction.followUp({
            content: '✅ Todos os membros foram removidos da call!',
            ephemeral: true
        });
    }
};