const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('criar-servidor')
        .setDescription('🚀 Cria todo o layout completo do servidor RP')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;

        const estrutura = [
            {
                name: "👀 BOAS-VINDAS",
                channels: [
                    { name: "📜・regras", type: ChannelType.GuildText },
                    { name: "📢・avisos-oficiais", type: ChannelType.GuildText },
                    { name: "🧾・enquetes", type: ChannelType.GuildText },
                    { name: "🧾・convites", type: ChannelType.GuildText }
                ]
            },
            {
                name: "💬 GERAL",
                channels: [
                    { name: "💣・chat-geral", type: ChannelType.GuildText },
                    { name: "📸・midia-rp", type: ChannelType.GuildText },
                    { name: "🎮・denuncias", type: ChannelType.GuildText },
                    { name: "💻・lista-comandos", type: ChannelType.GuildText },
                    { name: "😂・memes", type: ChannelType.GuildText },
                    { name: "❓・duvidas", type: ChannelType.GuildText },
                    { name: "🔊・geral-1", type: ChannelType.GuildVoice },
                    { name: "🔊・geral-2", type: ChannelType.GuildVoice }
                ]
            },
            {
                name: "🕵️ WHITELIST",
                channels: [
                    { name: "📋・faca-sua-whitelist", type: ChannelType.GuildText },
                    { name: "📮・solicitar-identidade", type: ChannelType.GuildText },
                    { name: "🎙️・call-whitelist-1", type: ChannelType.GuildVoice },
                    { name: "🎙️・call-whitelist-2", type: ChannelType.GuildVoice }
                ]
            },
            {
                name: "🚨 SUPORTE",
                channels: [
                    { name: "🎫・abrir-ticket", type: ChannelType.GuildText },
                    { name: "📘・como-funciona", type: ChannelType.GuildText },
                    { name: "🎙️・call-suporte", type: ChannelType.GuildVoice }
                ]
            },
            {
                name: "💎 VIP",
                channels: [
                    { name: "🎁・vantagens-vip", type: ChannelType.GuildText },
                    { name: "💎・vip-lojas", type: ChannelType.GuildText },
                    { name: "💎・vip-faccao", type: ChannelType.GuildText },
                    { name: "🎙️・call-vip", type: ChannelType.GuildVoice }
                ]
            },
            {
                name: "🏛️ GOVERNO",
                channels: [
                    { name: "🏢・prefeitura", type: ChannelType.GuildText },
                    { name: "🧑‍⚖️・juiz", type: ChannelType.GuildText },
                    { name: "📑・codigo-penal", type: ChannelType.GuildText },
                    { name: "💵・folha-pagamento", type: ChannelType.GuildText }
                ]
            },
            {
                name: "🚔 POLÍCIA",
                channels: [
                    { name: "👮‍♀️・regras-abordagem", type: ChannelType.GuildText },
                    { name: "👮・pena-prisao", type: ChannelType.GuildText },
                    { name: "📋・boletim-ocorrencia", type: ChannelType.GuildText },
                    { name: "🎙️・call-patrulhamento", type: ChannelType.GuildVoice }
                ]
            },
            {
                name: "🏥 HOSPITAL",
                channels: [
                    { name: "🏥・hospital", type: ChannelType.GuildText },
                    { name: "💊・farmacia", type: ChannelType.GuildText },
                    { name: "📋・prontuarios", type: ChannelType.GuildText },
                    { name: "🎙️・call-hospital", type: ChannelType.GuildVoice }
                ]
            },
            {
                name: "🏭 INDÚSTRIA",
                channels: [
                    { name: "🥫・fabrica-alimenticia", type: ChannelType.GuildText },
                    { name: "🔫・fabrica-armamentos", type: ChannelType.GuildText },
                    { name: "👘・fabrica-costura", type: ChannelType.GuildText }
                ]
            },
            {
                name: "⚙️ SISTEMA",
                channels: [
                    { name: "🤖・comandos-bot", type: ChannelType.GuildText },
                    { name: "📜・logs-gerais", type: ChannelType.GuildText },
                    { name: "❌・erros-bot", type: ChannelType.GuildText },
                    { name: "✅・status-bot", type: ChannelType.GuildText }
                ]
            },
            {
                name: "📁 STAFF",
                channels: [
                    { name: "📌・avisos-staff", type: ChannelType.GuildText },
                    { name: "💬・chat-staff", type: ChannelType.GuildText },
                    { name: "🛠️・comandos-admin", type: ChannelType.GuildText },
                    { name: "🤖・bot-testes", type: ChannelType.GuildText },
                    { name: "🎙️・call-staff", type: ChannelType.GuildVoice },
                    { name: "🎙️・call-admin", type: ChannelType.GuildVoice }
                ]
            }
        ];

        let total = 0;

        try {
            for (let i = 0; i < estrutura.length; i++) {
                const catData = estrutura[i];

                const categoria = await guild.channels.create({
                    name: catData.name,
                    type: ChannelType.GuildCategory,
                    position: i
                });

                for (const canal of catData.channels) {
                    await guild.channels.create({
                        name: canal.name.toLowerCase(),
                        type: canal.type,
                        parent: categoria
                    });

                    total++;
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Servidor configurado com sucesso!')
                .setDescription('Todas as categorias e canais foram criados.')
                .addFields(
                    { name: '📊 Total de canais', value: `${total}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error(err);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('❌ Erro ao criar servidor')
                        .setDescription(err.message)
                ]
            });
        }
    }
};