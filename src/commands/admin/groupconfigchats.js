const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('organizargrupo')
    .setDescription('Organiza o servidor completo (sem deletar nada)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;

    async function criarCategoria(nome, pos) {
      let cat = guild.channels.cache.find(
        c => c.name === nome && c.type === ChannelType.GuildCategory
      );

      if (!cat) {
        cat = await guild.channels.create({
          name: nome,
          type: ChannelType.GuildCategory
        });
      }

      await cat.setPosition(pos);
      return cat;
    }

    // ===== CRIAR CATEGORIAS ORGANIZADAS =====
    const categorias = {
      boasVindas: await criarCategoria('👀 BOAS-VINDAS', 0),
      geral: await criarCategoria('💬 GERAL', 1),
      whitelist: await criarCategoria('🕵️ WHITELIST', 2),
      suporte: await criarCategoria('🚨 SUPORTE', 3),
      staff: await criarCategoria('👮 STAFF', 4),
      governo: await criarCategoria('🏛️ GOVERNO', 5),
      policia: await criarCategoria('🚔 POLÍCIA', 6),
      hospital: await criarCategoria('🏥 HOSPITAL', 7),
      industria: await criarCategoria('🏭 INDÚSTRIA', 8),
      banco: await criarCategoria('💰 BANCO', 9),
      caca: await criarCategoria('🐆 CAÇA', 10),
      ilegal: await criarCategoria('🏴‍☠️ ILEGAL', 11),
      vip: await criarCategoria('💎 VIP', 12),
      sistema: await criarCategoria('⚙️ SISTEMA', 13),
    };

    // ===== FUNÇÃO MOVER =====
    async function moverPorPalavra(ch, mapa) {
      const nome = ch.name.toLowerCase();

      if (nome.includes('regra') || nome.includes('aviso') || nome.includes('convite'))
        return ch.setParent(mapa.boasVindas.id);

      if (nome.includes('chat') || nome.includes('midia') || nome.includes('denuncia'))
        return ch.setParent(mapa.geral.id);

      if (nome.includes('white') || nome.includes('identidade'))
        return ch.setParent(mapa.whitelist.id);

      if (nome.includes('ticket') || nome.includes('suporte') || nome.includes('atendimento'))
        return ch.setParent(mapa.suporte.id);

      if (nome.includes('staff') || nome.includes('admin') || nome.includes('bot'))
        return ch.setParent(mapa.staff.id);

      if (nome.includes('prefeitura') || nome.includes('penal') || nome.includes('juiz'))
        return ch.setParent(mapa.governo.id);

      if (nome.includes('policia') || nome.includes('boletim') || nome.includes('mandado'))
        return ch.setParent(mapa.policia.id);

      if (nome.includes('hospital') || nome.includes('farmacia') || nome.includes('medic'))
        return ch.setParent(mapa.hospital.id);

      if (nome.includes('fabrica') || nome.includes('peca') || nome.includes('industria'))
        return ch.setParent(mapa.industria.id);

      if (nome.includes('pix') || nome.includes('banco'))
        return ch.setParent(mapa.banco.id);

      if (nome.includes('pele') || nome.includes('caca'))
        return ch.setParent(mapa.caca.id);

      if (nome.includes('ilegal') || nome.includes('negro') || nome.includes('droga'))
        return ch.setParent(mapa.ilegal.id);

      if (nome.includes('vip'))
        return ch.setParent(mapa.vip.id);

      if (nome.includes('log') || nome.includes('erro') || nome.includes('cmd'))
        return ch.setParent(mapa.sistema.id);
    }

    // ===== ORGANIZAR TODOS CANAIS =====
    for (const channel of guild.channels.cache.values()) {
      if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
        try {
          await moverPorPalavra(channel, categorias);
        } catch (e) {}
      }
    }

    await interaction.editReply('✅ Servidor organizado automaticamente (sem deletar nada)!');
  }
};