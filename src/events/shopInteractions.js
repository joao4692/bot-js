const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

function getItemsPath() {
    return path.join(__dirname, '../data/rp/items.json');
}

function loadItems() {
    const itemsPath = getItemsPath();
    if (!fs.existsSync(itemsPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
    } catch (e) {
        console.error('[shopInteractions] Erro ao ler items.json:', e);
        return {};
    }
}

function saveItems(items) {
    const itemsPath = getItemsPath();
    fs.mkdirSync(path.dirname(itemsPath), { recursive: true });
    fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2));
}

function isAdmin(interaction) {
    return interaction.inGuild() && interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

function buildAddItemModal() {
    const modal = new ModalBuilder()
        .setCustomId('shop_add_item_modal')
        .setTitle('Adicionar Item à Loja');

    const idInput = new TextInputBuilder()
        .setCustomId('item_id')
        .setLabel('ID do Item (único)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

    const nameInput = new TextInputBuilder()
        .setCustomId('item_name')
        .setLabel('Nome do Item')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const descInput = new TextInputBuilder()
        .setCustomId('item_description')
        .setLabel('Descrição do Item')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);

    const priceInput = new TextInputBuilder()
        .setCustomId('item_price')
        .setLabel('Preço de Compra (0 para não vendível)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

    const advancedInput = new TextInputBuilder()
        .setCustomId('item_advanced')
        .setLabel('Avançado (JSON opcional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500);

    modal.addComponents(
        new ActionRowBuilder().addComponents(idInput),
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(advancedInput)
    );

    return modal;
}

async function handleShopSelect(interaction) {
    const itemId = interaction.values?.[0];
    const items = loadItems();
    const item = items[itemId];

    if (!item) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setTitle('❌ Item não encontrado')], ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor('#f9a825')
        .setTitle(`🏪 ${item.name || itemId}`)
        .setDescription(item.description || 'Sem descrição')
        .addFields(
            { name: 'ID', value: String(itemId), inline: true },
            { name: 'Preço', value: item.price ? String(item.price) : 'Não vendível', inline: true },
            { name: 'Venda', value: item.sell_price != null ? String(item.sell_price) : 'Não vendível', inline: true }
        );

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAdminButtons(interaction) {
    if (!isAdmin(interaction)) {
        return interaction.reply({ content: '❌ Você não tem permissão.', ephemeral: true });
    }

    if (interaction.customId === 'shop_admin_add') {
        return interaction.showModal(buildAddItemModal());
    }

    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('⚙️ Administração da Loja')
        .setDescription('Use `/loja additem` e `/loja removeitem` para gerenciar itens.');

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleShopAddItemModal(interaction) {
    if (!isAdmin(interaction)) {
        return interaction.reply({ content: '❌ Você não tem permissão.', ephemeral: true });
    }

    const itemId = interaction.fields.getTextInputValue('item_id')?.trim();
    const name = interaction.fields.getTextInputValue('item_name')?.trim();
    const description = interaction.fields.getTextInputValue('item_description')?.trim();
    const priceRaw = interaction.fields.getTextInputValue('item_price')?.trim();
    const advancedRaw = interaction.fields.getTextInputValue('item_advanced')?.trim();

    if (!itemId || !name || !description || !priceRaw) {
        return interaction.reply({ content: '❌ Campos obrigatórios ausentes.', ephemeral: true });
    }

    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
        return interaction.reply({ content: '❌ Preço inválido.', ephemeral: true });
    }

    const items = loadItems();
    if (items[itemId]) {
        return interaction.reply({ content: '❌ Já existe um item com esse ID.', ephemeral: true });
    }

    let advanced = {};
    if (advancedRaw) {
        try {
            advanced = JSON.parse(advancedRaw);
        } catch {
            return interaction.reply({ content: '❌ JSON avançado inválido.', ephemeral: true });
        }
    }

    items[itemId] = {
        name,
        description,
        price: price > 0 ? price : null,
        ...advanced
    };

    saveItems(items);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Item adicionado')
        .setDescription(`Item **${name}** criado com ID \`${itemId}\`.`);

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleShopConfirmRemove(interaction) {
    if (!isAdmin(interaction)) {
        return interaction.reply({ content: '❌ Você não tem permissão.', ephemeral: true });
    }

    const itemId = interaction.customId.replace('shop_confirm_remove_', '');
    const items = loadItems();
    const item = items[itemId];

    if (!item) {
        return interaction.update({
            embeds: [new EmbedBuilder().setColor('#ff0000').setTitle('❌ Item não encontrado')],
            components: []
        });
    }

    delete items[itemId];
    saveItems(items);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Item removido')
        .setDescription(`Item \`${itemId}\` removido da loja.`);

    return interaction.update({ embeds: [embed], components: [] });
}

async function handleShopCancelRemove(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('⛔ Remoção cancelada')
        .setDescription('A remoção do item foi cancelada.');

    return interaction.update({ embeds: [embed], components: [] });
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (interaction.isStringSelectMenu() && interaction.customId === 'shop_select') {
                return handleShopSelect(interaction);
            }

            if (interaction.isButton()) {
                if (interaction.customId === 'shop_admin_add' || interaction.customId === 'shop_admin_edit' || interaction.customId === 'shop_admin_remove') {
                    return handleAdminButtons(interaction);
                }
                if (interaction.customId.startsWith('shop_confirm_remove_')) {
                    return handleShopConfirmRemove(interaction);
                }
                if (interaction.customId === 'shop_cancel_remove') {
                    return handleShopCancelRemove(interaction);
                }
            }

            if (interaction.isModalSubmit() && interaction.customId === 'shop_add_item_modal') {
                return handleShopAddItemModal(interaction);
            }
        } catch (e) {
            console.error('[shopInteractions] Erro:', e);
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                await interaction.reply({ content: '❌ Erro ao processar interação da loja.', ephemeral: true }).catch(() => null);
            }
        }
    }
};
