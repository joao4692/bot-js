const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, saveUser, addTransaction } = require('../../data/economy/economyManager');
const { getRpProfile, saveRpProfile } = require('../../data/rp/rpManager');
const bankManager = require('../../data/economy/bankManager');
const fs = require('fs');
const path = require('path');

// Carregar itens dinamicamente
function loadItems() {
  const itemsPath = path.join(__dirname, '../../json/rp/items.json');
  if (!fs.existsSync(itemsPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
  } catch (error) {
    console.error('Erro ao carregar items.json:', error);
    return {};
  }
}

// Salvar itens
function saveItems(items) {
  const itemsPath = path.join(__dirname, '../../json/rp/items.json');
  try {
    fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2));
  } catch (error) {
    console.error('Erro ao salvar items.json:', error);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Sistema unificado de loja e compras')
    .addSubcommand(subcommand =>
      subcommand
        .setName('ver')
        .setDescription('Ver itens disponíveis na loja')
        .addStringOption(option =>
          option
            .setName('categoria')
            .setDescription('Filtrar por categoria')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('comprar')
        .setDescription('Comprar um item')
        .addStringOption(option =>
          option
            .setName('item')
            .setDescription('Nome ou ID do item')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option
            .setName('quantidade')
            .setDescription('Quantidade (padrão: 1)')
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('vender')
        .setDescription('Vender um item do inventário')
        .addStringOption(option =>
          option
            .setName('item')
            .setDescription('Item para vender')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option
            .setName('quantidade')
            .setDescription('Quantidade (padrão: 1)')
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('inventario')
        .setDescription('Ver seu inventário')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('usar')
        .setDescription('Usar um item do inventário')
        .addStringOption(option =>
          option
            .setName('item')
            .setDescription('Item para usar')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('admin')
        .setDescription('[ADMIN] Gerenciar itens da loja')
        .addStringOption(option =>
          option
            .setName('ação')
            .setDescription('Ação administrativa')
            .setRequired(true)
            .addChoices(
              { name: '➕ Adicionar Item', value: 'add' },
              { name: '✏️ Editar Item', value: 'edit' },
              { name: '🗑️ Remover Item', value: 'remove' },
              { name: '📋 Listar Itens', value: 'list' }
            )
        )
        .addStringOption(option =>
          option
            .setName('item')
            .setDescription('Item (para editar/remover)')
            .setRequired(false)
        )
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    
    if (focused.name === 'item') {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'comprar') {
        // Autocomplete para itens da loja
        const allItems = loadItems();
        const purchasableItems = Object.entries(allItems)
          .filter(([id, item]) => item.price && item.price > 0)
          .map(([id, item]) => ({
            name: `${item.name} - 💰${item.price}`,
            value: id
          }));

        const filtered = purchasableItems.filter(item =>
          item.name.toLowerCase().includes(focused.value.toLowerCase())
        ).slice(0, 25);

        await interaction.respond(filtered);
      } else if (subcommand === 'vender' || subcommand === 'usar') {
        // Autocomplete para itens do inventário
        try {
          const rpProfile = await getRpProfile(interaction.guild.id, interaction.user.id);
          if (!rpProfile.inventory || rpProfile.inventory.length === 0) {
            return interaction.respond([]);
          }

          const choices = rpProfile.inventory.map(item => ({
            name: `${item.name} (x${item.quantity || 1})`,
            value: item.itemId
          }));

          const filtered = choices.filter(choice =>
            choice.name.toLowerCase().includes(focused.value.toLowerCase())
          ).slice(0, 25);

          await interaction.respond(filtered);
        } catch (error) {
          console.error('Autocomplete error:', error);
          await interaction.respond([]);
        }
      }
    }
  },

  async execute(interaction, client, guildConfig) {
    const subcommand = interaction.options.getSubcommand();
    const currency = guildConfig.economy?.currency || '💰';

    try {
      switch (subcommand) {
        case 'ver':
          await handleVer(interaction, guildConfig);
          break;
        case 'comprar':
          await handleComprar(interaction, guildConfig);
          break;
        case 'vender':
          await handleVender(interaction, guildConfig);
          break;
        case 'inventario':
          await handleInventario(interaction, guildConfig);
          break;
        case 'usar':
          await handleUsar(interaction, guildConfig);
          break;
        case 'admin':
          await handleAdmin(interaction, guildConfig);
          break;
      }
    } catch (error) {
      console.error('Erro no comando loja:', error);
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Erro')
          .setDescription(`Ocorreu um erro: ${error.message}`)
        ],
        ephemeral: true
      });
    }
  }
};

async function handleVer(interaction, guildConfig) {
  const allItems = loadItems();
  const categoryFilter = interaction.options.getString('categoria');
  const currency = guildConfig.economy?.currency || '💰';

  // Filtrar itens compráveis
  let items = Object.entries(allItems).filter(([id, item]) => 
    item.price && item.price > 0 && !item.hidden
  );

  // Filtrar por categoria se especificado
  if (categoryFilter) {
    items = items.filter(([id, item]) => item.category === categoryFilter);
  }

  if (items.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#ffaa00')
      .setTitle('🏪 Loja do Servidor')
      .setDescription(categoryFilter ? 
        `Nenhum item encontrado na categoria "${categoryFilter}".` : 
        'Nenhum item disponível na loja no momento.'
      )
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }

  // Agrupar por categoria
  const itemsByCategory = {};
  items.forEach(([id, item]) => {
    const category = item.category || 'diversos';
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push({ id, ...item });
  });

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🏪 Loja do Servidor')
    .setDescription('Itens disponíveis para compra:')
    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
    .setTimestamp();

  // Adicionar itens por categoria
  Object.entries(itemsByCategory).forEach(([category, categoryItems]) => {
    const categoryEmojis = {
      'armas': '🔫',
      'veiculos': '🚗',
      'itens': '📦',
      'roles': '👑',
      'diversos': '🎁'
    };

    const emoji = categoryEmojis[category] || '📦';
    const itemsList = categoryItems.map(item => {
      const stockText = item.stock !== undefined ? ` (Estoque: ${item.stock})` : '';
      const limitedText = item.limited ? ' 🏷️' : '';
      return `• **${item.name}**${limitedText}\n  └ 💰 ${currency}${item.price.toLocaleString('pt-BR')}${stockText}`;
    }).join('\n');

    embed.addFields({
      name: `${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      value: itemsList,
      inline: false
    });
  });

  embed.setFooter({ text: 'Use /loja comprar para comprar um item' });

  await interaction.reply({ embeds: [embed] });
}

async function handleComprar(interaction, guildConfig) {
  const itemId = interaction.options.getString('item');
  const quantity = interaction.options.getInteger('quantidade') || 1;
  const allItems = loadItems();
  const currency = guildConfig.economy?.currency || '💰';

  const item = allItems[itemId];
  if (!item || !item.price) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Item Não Encontrado')
        .setDescription('Item não encontrado ou não disponível para compra.')
      ],
      ephemeral: true
    });
  }

  // Verificar estoque
  if (item.stock !== undefined && item.stock < quantity) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Estoque Insuficiente')
        .setDescription(`Apenas ${item.stock} unidades disponíveis.`)
      ],
      ephemeral: true
    });
  }

  const totalPrice = item.price * quantity;

  // Verificar saldo do usuário
  const account = await bankManager.getBankAccount(interaction.guild.id, interaction.user.id);
  const totalBalance = account.wallet + account.bank;

  if (totalBalance < totalPrice) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Saldo Insuficiente')
        .setDescription(`Você precisa de ${currency}${totalPrice.toLocaleString('pt-BR')} para comprar ${quantity}x ${item.name}.\nSaldo atual: ${currency}${totalBalance.toLocaleString('pt-BR')}`)
      ],
      ephemeral: true
    });
  }

  try {
    // Processar pagamento
    let paymentSuccess = false;
    
    // Tentar pagar da carteira primeiro
    if (account.wallet >= totalPrice) {
      const result = await bankManager.withdraw(interaction.guild.id, interaction.user.id, totalPrice, `Compra: ${item.name}`);
      paymentSuccess = result.success;
    } else if (account.bank >= totalPrice) {
      // Tentar do banco
      const result = await bankManager.withdraw(interaction.guild.id, interaction.user.id, totalPrice, `Compra: ${item.name}`);
      paymentSuccess = result.success;
    } else {
      // Combinar carteira + banco
      const walletAmount = account.wallet;
      const bankAmount = totalPrice - walletAmount;
      
      const walletResult = await bankManager.withdraw(interaction.guild.id, interaction.user.id, walletAmount, `Compra: ${item.name}`);
      if (walletResult.success) {
        const bankResult = await bankManager.withdraw(interaction.guild.id, interaction.user.id, bankAmount, `Compra: ${item.name}`);
        paymentSuccess = bankResult.success;
      }
    }

    if (!paymentSuccess) {
      throw new Error('Falha no processamento do pagamento');
    }

    // Adicionar item ao inventário RP
    const rpProfile = await getRpProfile(interaction.guild.id, interaction.user.id);
    if (!rpProfile.inventory) rpProfile.inventory = [];

    const existingItem = rpProfile.inventory.find(i => i.itemId === itemId);
    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + quantity;
    } else {
      rpProfile.inventory.push({
        itemId: itemId,
        name: item.name,
        quantity: quantity,
        purchasedAt: Date.now()
      });
    }

    // Dar cargo se aplicável
    if (item.roleId) {
      const role = interaction.guild.roles.cache.get(item.roleId);
      if (role) {
        await interaction.member.roles.add(role);
      }
    }

    // Atualizar estoque
    if (item.stock !== undefined) {
      item.stock -= quantity;
      saveItems(allItems);
    }

    // Salvar dados
    await saveRpProfile(interaction.guild.id, interaction.user.id, rpProfile);
    await addTransaction(interaction.guild.id, interaction.user.id, guildConfig, 'purchase', -totalPrice, `Comprou ${quantity}x ${item.name}`);

    // Embed de sucesso
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Compra Realizada!')
      .setDescription(`Você comprou **${quantity}x ${item.name}**!`)
      .addFields(
        { name: '💰 Valor Unitário', value: `${currency}${item.price.toLocaleString('pt-BR')}`, inline: true },
        { name: '📦 Quantidade', value: quantity.toString(), inline: true },
        { name: '💳 Total Pago', value: `${currency}${totalPrice.toLocaleString('pt-BR')}`, inline: true },
        { name: '💼 Novo Saldo', value: `${currency}${(totalBalance - totalPrice).toLocaleString('pt-BR')}`, inline: false }
      )
      .setFooter({ text: 'Use /loja inventario para ver seus itens' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao processar compra:', error);
    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Erro na Compra')
        .setDescription('Ocorreu um erro ao processar sua compra.')
      ],
      ephemeral: true
    });
  }
}

async function handleVender(interaction, guildConfig) {
  const itemId = interaction.options.getString('item');
  const quantity = interaction.options.getInteger('quantidade') || 1;
  const allItems = loadItems();
  const currency = guildConfig.economy?.currency || '💰';

  const item = allItems[itemId];
  if (!item) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Item Não Encontrado')
        .setDescription('Item não encontrado.')
      ],
      ephemeral: true
    });
  }

  if (!item.sell_price || item.sell_price <= 0) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('⚠️ Item Não Vendível')
        .setDescription(`**${item.name}** não pode ser vendido.`)
      ],
      ephemeral: true
    });
  }

  // Verificar se tem o item no inventário
  const rpProfile = await getRpProfile(interaction.guild.id, interaction.user.id);
  const inventoryItem = rpProfile.inventory?.find(i => i.itemId === itemId);

  if (!inventoryItem || inventoryItem.quantity < quantity) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Item Insuficiente')
        .setDescription(`Você não tem ${quantity}x ${item.name} no inventário.`)
      ],
      ephemeral: true
    });
  }

  const totalSellPrice = item.sell_price * quantity;

  try {
    // Remover item do inventário
    inventoryItem.quantity -= quantity;
    if (inventoryItem.quantity <= 0) {
      rpProfile.inventory = rpProfile.inventory.filter(i => i.itemId !== itemId);
    }

    // Adicionar dinheiro ao banco
    await bankManager.deposit(interaction.guild.id, interaction.user.id, totalSellPrice, `Venda: ${item.name}`);

    // Salvar dados
    await saveRpProfile(interaction.guild.id, interaction.user.id, rpProfile);
    await addTransaction(interaction.guild.id, interaction.user.id, guildConfig, 'sale', totalSellPrice, `Vendeu ${quantity}x ${item.name}`);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Venda Realizada!')
      .setDescription(`Você vendeu **${quantity}x ${item.name}**!`)
      .addFields(
        { name: '💰 Valor Unitário', value: `${currency}${item.sell_price.toLocaleString('pt-BR')}`, inline: true },
        { name: '📦 Quantidade', value: quantity.toString(), inline: true },
        { name: '💳 Total Recebido', value: `${currency}${totalSellPrice.toLocaleString('pt-BR')}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao processar venda:', error);
    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Erro na Venda')
        .setDescription('Ocorreu um erro ao processar sua venda.')
      ],
      ephemeral: true
    });
  }
}

async function handleInventario(interaction, guildConfig) {
  const rpProfile = await getRpProfile(interaction.guild.id, interaction.user.id);

  if (!rpProfile.inventory || rpProfile.inventory.length === 0) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('🎒 Inventário Vazio')
        .setDescription('Você não tem itens no inventário.')
      ],
      ephemeral: true
    });
  }

  // Agrupar itens por categoria
  const itemsByCategory = {};
  rpProfile.inventory.forEach(item => {
    const allItems = loadItems();
    const itemData = allItems[item.itemId];
    const category = itemData?.category || 'diversos';
    
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push({ ...item, ...itemData });
  });

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🎒 Seu Inventário')
    .setDescription('Seus itens disponíveis:')
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  Object.entries(itemsByCategory).forEach(([category, items]) => {
    const categoryEmojis = {
      'armas': '🔫',
      'veiculos': '🚗',
      'itens': '📦',
      'roles': '👑',
      'diversos': '🎁'
    };

    const emoji = categoryEmojis[category] || '📦';
    const itemsList = items.map(item => {
      const usableText = item.usable !== false ? ' ✅' : ' ❌';
      const sellText = item.sell_price ? ` (Vende: 💰${item.sell_price})` : '';
      return `• **${item.name}** (x${item.quantity})${usableText}${sellText}`;
    }).join('\n');

    embed.addFields({
      name: `${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      value: itemsList,
      inline: false
    });
  });

  embed.setFooter({ text: 'Use /loja usar para usar um item • /loja vender para vender itens' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleUsar(interaction, guildConfig) {
  const itemId = interaction.options.getString('item');
  const allItems = loadItems();

  const item = allItems[itemId];
  if (!item) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Item Não Encontrado')
        .setDescription('Item não encontrado.')
      ],
      ephemeral: true
    });
  }

  // Verificar se tem o item no inventário
  const rpProfile = await getRpProfile(interaction.guild.id, interaction.user.id);
  const inventoryItem = rpProfile.inventory?.find(i => i.itemId === itemId);

  if (!inventoryItem || inventoryItem.quantity <= 0) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Item Não Disponível')
        .setDescription(`Você não tem **${item.name}** no inventário.`)
      ],
      ephemeral: true
    });
  }

  if (item.usable === false) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('⚠️ Item Não Usável')
        .setDescription(`**${item.name}** não pode ser usado.`)
      ],
      ephemeral: true
    });
  }

  try {
    // Implementar efeitos do item
    let effectMessage = 'Item usado com sucesso!';

    // Efeitos baseados no tipo
    if (item.type === 'money') {
      const amount = item.effect?.amount || 100;
      await bankManager.deposit(interaction.guild.id, interaction.user.id, amount, `Uso de item: ${item.name}`);
      effectMessage = `Você recebeu **💰${amount}**!`;
    } else if (item.type === 'role') {
      if (item.roleId) {
        const role = interaction.guild.roles.cache.get(item.roleId);
        if (role) {
          await interaction.member.roles.add(role);
          effectMessage = `Cargo **${role.name}** adicionado!`;
        }
      }
    } else if (item.type === 'heal') {
      effectMessage = `Você se curou e está se sentindo melhor!`;
    }

    // Remover item do inventário
    inventoryItem.quantity -= 1;
    if (inventoryItem.quantity <= 0) {
      rpProfile.inventory = rpProfile.inventory.filter(i => i.itemId !== itemId);
    }

    await saveRpProfile(interaction.guild.id, interaction.user.id, rpProfile);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Item Usado!')
      .setDescription(`Você usou **${item.name}**!`)
      .addFields({ name: '📄 Efeito', value: effectMessage, inline: false })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao usar item:', error);
    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Erro ao Usar Item')
        .setDescription('Ocorreu um erro ao usar o item.')
      ],
      ephemeral: true
    });
  }
}

async function handleAdmin(interaction, guildConfig) {
  // Verificar permissões de admin
  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Sem Permissão')
        .setDescription('Apenas administradores podem usar comandos administrativos.')
      ],
      ephemeral: true
    });
  }

  const action = interaction.options.getString('ação');
  const allItems = loadItems();

  switch (action) {
    case 'list':
      await handleAdminList(interaction, allItems);
      break;
    case 'add':
      // Implementar adição de item (poderia usar modal)
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ffaa00')
          .setTitle('⚠️ Em Desenvolvimento')
          .setDescription('Função de adicionar itens em desenvolvimento.')
        ],
        ephemeral: true
      });
      break;
    case 'edit':
      // Implementar edição de item
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ffaa00')
          .setTitle('⚠️ Em Desenvolvimento')
          .setDescription('Função de editar itens em desenvolvimento.')
        ],
        ephemeral: true
      });
      break;
    case 'remove':
      // Implementar remoção de item
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ffaa00')
          .setTitle('⚠️ Em Desenvolvimento')
          .setDescription('Função de remover itens em desenvolvimento.')
        ],
        ephemeral: true
      });
      break;
  }
}

async function handleAdminList(interaction, allItems) {
  if (Object.keys(allItems).length === 0) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('📋 Lista de Itens')
        .setDescription('Nenhum item cadastrado.')
      ],
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('📋 Todos os Itens Cadastrados')
    .setDescription('Lista de todos os itens disponíveis no sistema:')
    .setTimestamp();

  const itemsList = Object.entries(allItems).map(([id, item]) => {
    const priceText = item.price ? `💰${item.price}` : 'Não vendível';
    const sellText = item.sell_price ? `Vende: 💰${item.sell_price}` : 'Não vende';
    return `• **${item.name}** (\`${id}\`)\n  └ Compra: ${priceText} | ${sellText}`;
  }).join('\n\n');

  if (itemsList.length > 4000) {
    // Se for muito longo, dividir em múltiplos embeds
    const chunks = itemsList.match(/.{1,4000}/g) || [];
    chunks.forEach((chunk, index) => {
      embed.addFields({
        name: index === 0 ? 'Itens' : `Itens (cont.)`,
        value: chunk,
        inline: false
      });
    });
  } else {
    embed.addFields({ name: 'Itens', value: itemsList, inline: false });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
