const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllUsers } = require("../../data/economy/jsonprovider");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Mostra os usuários mais ricos.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("total")
        .setDescription("Ranking por riqueza total (carteira + banco)"))
    .addSubcommand(subcommand =>
      subcommand
        .setName("wallet")
        .setDescription("Ranking por carteira"))
    .addSubcommand(subcommand =>
      subcommand
        .setName("bank")
        .setDescription("Ranking por banco")),
  async execute(interaction, client, guildConfig) {
    const allUsersData = await getAllUsers();
    const currency = guildConfig.economy.currency || '💰';
    const mode = guildConfig.economy.mode || 'local';
    const subcommand = interaction.options.getSubcommand();

    // 1. Filter users based on economy mode
    const relevantUsers = Object.entries(allUsersData).filter(([key]) => {
        switch (mode) {
            case 'global':
                return key.startsWith('global_');
            case 'interconnected': {
                const primaryGuild = guildConfig.economy.interconnected_guilds?.[0] || interaction.guild.id;
                return key.startsWith(`interconnected_${primaryGuild}_`);
            }
            case 'local':
            default:
                return key.startsWith(`local_${interaction.guild.id}_`);
        }
    });

    // 2. Determine sort key based on subcommand
    let sortKey;
    let titleSuffix;
    switch (subcommand) {
      case 'wallet':
        sortKey = 'wallet';
        titleSuffix = 'Carteira';
        break;
      case 'bank':
        sortKey = 'bank';
        titleSuffix = 'Banco';
        break;
      case 'total':
      default:
        sortKey = 'total';
        titleSuffix = 'Riqueza Total';
        break;
    }

    // 3. Sort users (inclui badges, cargos, recursos extras)
    const sortedUsers = relevantUsers
      .map(([key, data]) => {
          const userId = key.split('_').pop();
          const wallet = data.wallet || 0;
          const bank = data.bank || 0;
          const total = wallet + bank;
          const badge = data.badge || null;
          const vipRole = data.vipRole || null;
          const resources = data.resources || {};
          return { userId, wallet, bank, total, badge, vipRole, resources };
      })
      .sort((a, b) => b[sortKey] - a[sortKey])
      .slice(0, 10);

    // 4. Find user's own position
    const userKey = `${mode === 'global' ? 'global' : mode === 'interconnected' ? `interconnected_${guildConfig.economy.interconnected_guilds?.[0] || interaction.guild.id}` : `local_${interaction.guild.id}`}_${interaction.user.id}`;
    const userData = allUsersData[userKey];
    let userPosition = null;
    if (userData) {
      const userWallet = userData.wallet || 0;
      const userBank = userData.bank || 0;
      const userTotal = userWallet + userBank;
      const userValue = sortKey === 'total' ? userTotal : sortKey === 'wallet' ? userWallet : userBank;
      const allSorted = relevantUsers
        .map(([key, data]) => {
            const userId = key.split('_').pop();
            const wallet = data.wallet || 0;
            const bank = data.bank || 0;
            const total = wallet + bank;
            return { userId, wallet, bank, total };
        })
        .sort((a, b) => b[sortKey] - a[sortKey]);
      userPosition = allSorted.findIndex(u => u.userId === interaction.user.id) + 1;
    }

    // 5. Build the description (exibe badges, cargos VIP, recursos extras)
    const leaderboardEntries = await Promise.all(sortedUsers.map(async (user, index) => {
        try {
            const fetchedUser = await client.users.fetch(user.userId);
            const medal = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
            const value = user[sortKey];
            let extras = [];
            if (user.badge) extras.push(`🏅 ${user.badge}`);
            if (user.vipRole) extras.push(`<@&${user.vipRole}>`);
            if (user.resources && Object.keys(user.resources).length > 0) {
                extras.push(Object.entries(user.resources).map(([k,v])=>`${k}: ${v}`).join(', '));
            }
            const extrasStr = extras.length ? ` (${extras.join(' | ')})` : '';
            return `${medal} **${fetchedUser.username}** - ${currency} ${value.toLocaleString('pt-BR')}${extrasStr}`;
        } catch {
            const value = user[sortKey];
            return `${index + 1}. *Usuário Desconhecido* - ${currency} ${value.toLocaleString('pt-BR')}`;
        }
    }));

    let description = leaderboardEntries.length > 0 ? leaderboardEntries.join('\n') : 'Ninguém no ranking ainda. Seja o primeiro!';
    if (userPosition && userPosition > 10) {
      const userValue = sortKey === 'total' ? (userData.wallet + userData.bank) : userData[sortKey];
      description += `\n\n**Sua posição:** ${userPosition}º - ${currency} ${userValue.toLocaleString('pt-BR')}`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Ranking de ${titleSuffix} - ${mode.charAt(0).toUpperCase() + mode.slice(1)}`)
      .setColor(guildConfig.embedColor || '#FFD700')
      .setDescription(description)
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `Ranking do servidor: ${interaction.guild.name}` });

    interaction.reply({ embeds: [embed] });
  }
};
