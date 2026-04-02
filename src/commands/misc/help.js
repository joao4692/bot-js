const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require('../../utils/logger');

/**
 * Mapeia emojis para categorias
 */
const getCategoryEmoji = (category) => {
  const emojis = {
    admin: "🛠️",
    moderacao: "🛡️",
    moderação: "🛡️",
    detran: "🚗",
    economy: "💰",
    economia: "💰",
    rp: "🎭",
    moderation: "🛡️",
    police: "👮",
    staff: "👥",
    misc: "⚙️",
    ticket: "🎫",
    prefix: "📝",
    util: "⚙️",
    utils: "⚙️",
    diversão: "🎉",
    fun: "🎉",
  };
  return emojis[category.toLowerCase()] || "📁";
};

const normalizeCategory = (category) => {
  if (!category) return 'misc';
  return String(category).trim().toLowerCase();
};

const buildCommandIndexFromClient = (client) => {
  const out = [];

  const slashValues = client?.slashCommands ? Array.from(client.slashCommands.values()) : [];
  for (const cmd of slashValues) {
    if (!cmd?.data?.name) continue;
    const cat = normalizeCategory(cmd.category || 'misc');
    const desc = String(cmd.data.description || 'Sem descrição').trim();
    out.push({
      type: 'slash',
      name: String(cmd.data.name).trim(),
      description: desc.length > 0 ? desc : 'Sem descrição',
      category: cat,
      emoji: getCategoryEmoji(cat)
    });
  }

  const prefixValues = client?.commands ? Array.from(new Set(client.commands.values())) : [];
  for (const cmd of prefixValues) {
    if (!cmd?.name) continue;
    const cat = normalizeCategory(cmd.category || 'misc');
    const desc = String(cmd.description || 'Sem descrição').trim();
    out.push({
      type: 'prefix',
      name: String(cmd.name).trim(),
      description: desc.length > 0 ? desc : 'Sem descrição',
      category: cat,
      emoji: getCategoryEmoji(cat)
    });
  }

  return out;
};

/**
 * Agrupa comandos por categoria
 */
const groupCommandsByCategory = (commands) => {
  const grouped = {};

  for (const cmd of commands) {
    const cat = cmd.category;
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(cmd);
  }

  return grouped;
};

/* =======================
   Comando /help
======================= */

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Mostra todos os comandos disponíveis no bot")
    .addStringOption(option =>
      option
        .setName('categoria')
        .setDescription('Filtrar por categoria (ex: economy, rp, admin, misc)')
        .setRequired(false)
    ),

  async execute(interaction, client, guildConfig) {
    try {
      const requestedCategory = interaction.options.getString('categoria');
      const requestedCategoryNorm = normalizeCategory(requestedCategory);

      const allCommands = buildCommandIndexFromClient(client);

      // Debug log
      if (requestedCategory) {
        logger.log('DEBUG', `[help] Buscando categoria: "${requestedCategory}" (normalizada: "${requestedCategoryNorm}")`);
        logger.log('DEBUG', `[help] Total de comandos carregados: ${allCommands.length}`);
        logger.log('DEBUG', `[help] Categorias disponíveis: ${[...new Set(allCommands.map(c => c.category))].join(', ')}`);
      }

      const filteredCommands = requestedCategory
        ? allCommands.filter(c => normalizeCategory(c.category) === requestedCategoryNorm)
        : allCommands;

      if (filteredCommands.length === 0) {
        const availableCategories = [...new Set(allCommands.map(c => c.category))].join(', ');
        const msg = requestedCategory
          ? `⚠️ Nenhum comando foi encontrado para a categoria **${requestedCategory}**.\n\n**Categorias disponíveis:** \`${availableCategories}\``
          : '⚠️ Nenhum comando foi encontrado.';

        return interaction.reply({
          content: msg,
          ephemeral: true 
        });
      }

      // Agrupar por categoria
      const grouped = groupCommandsByCategory(filteredCommands);

      // Obter plugins ativos
      const plugins = (client.plugins || []).map(p => p.name).join(', ') || 'Nenhum';

      // Criar fields dos comandos
      let fields = Object.entries(grouped).map(([category, cmds]) => {
        const commandsList = cmds
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(cmd => `/${cmd.name} — ${cmd.description || 'Sem descrição'}`)
          .join('\n');

        // Validar se o valor não excede limite (2048 chars)
        let finalValue = commandsList.length > 2048 
          ? commandsList.substring(0, 2045) + '...' 
          : commandsList;

        // Garantir que o value nunca seja vazio
        if (!finalValue || finalValue.trim().length === 0) {
          finalValue = '(sem comandos)';
        }

        // Garantir que name e value são strings válidas
        const categoryName = String(category || 'misc').toUpperCase();
        
        return {
          name: `${getCategoryEmoji(category)} ${categoryName}`,
          value: String(finalValue).trim(),
          inline: false
        };
      });

      // Adicionar field de plugins (se tiver value)
      if (plugins && plugins.trim().length > 0) {
        fields.push({
          name: '🔌 Plugins Ativos',
          value: String(plugins).trim(),
          inline: false
        });
      }

      // Criar embed principal
      const embed = new EmbedBuilder()
        .setTitle("🤖 Ajuda do Bot")
        .setDescription(
          `**Total de comandos:** ${filteredCommands.length}` +
          (interaction.options.getString('categoria') ? `\n**Categoria:** ${requestedCategory}` : '') +
          `\n\nVeja os comandos disponíveis abaixo:`
        )
        .setColor('#3498db')
        .setThumbnail(client.user?.avatarURL() || null)
        .setFooter({ 
          text: `Executado por: ${interaction.user.username} • Use /comando para mais detalhes.`,
          iconURL: interaction.user?.avatarURL() || null
        })
        .setTimestamp();

      // Adicionar no máximo 25 fields (limite do Discord)
      const fieldsToAdd = fields.slice(0, 25);
      if (fieldsToAdd.length > 0) {
        // Validar cada field antes de adicionar (validar name e value)
        const validFields = fieldsToAdd.filter(f => {
          const hasValidName = f.name && String(f.name).trim().length > 0 && String(f.name).length <= 256;
          const hasValidValue = f.value && String(f.value).trim().length > 0 && String(f.value).length <= 2048;
          return hasValidName && hasValidValue;
        });
        
        if (validFields.length > 0) {
          try {
            embed.addFields(validFields);
          } catch (fieldError) {
            logger.log('ERROR', `Erro ao adicionar fields: ${fieldError.message}`);
            logger.log('DEBUG', `Fields com erro:`, JSON.stringify(validFields));
          }
        }
      }

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      logger.log('INFO', `[help] Ajuda exibida para ${interaction.user.tag}. Total: ${filteredCommands.length} comandos.`);
    } catch (err) {
      logger.log('ERROR', `Erro no comando help: ${err.message}`);
      logger.log('ERROR', `Stack: ${err.stack}`);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Erro ao exibir ajuda. Tente novamente mais tarde.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Erro ao exibir ajuda. Tente novamente mais tarde.', ephemeral: true });
      }
    }
  }
};
