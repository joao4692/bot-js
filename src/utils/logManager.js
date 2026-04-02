const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const logsConfigPath = path.join(__dirname, '../data/logs.json');

/**
 * Tipos de logs disponíveis
 */
const LOG_TYPES = {
  MEMBER_JOIN: 'member_join',
  MEMBER_LEAVE: 'member_leave',
  MEMBER_ROLE_ADD: 'member_role_add',
  MEMBER_ROLE_REMOVE: 'member_role_remove',
  MESSAGE_DELETE: 'message_delete',
  MESSAGE_UPDATE: 'message_update',
  MEMBER_UPDATE: 'member_update',
  CHANNEL_CREATE: 'channel_create',
  CHANNEL_DELETE: 'channel_delete',
  ROLE_CREATE: 'role_create',
  ROLE_DELETE: 'role_delete',
  BAN_ADD: 'ban_add',
  BAN_REMOVE: 'ban_remove'
};

/**
 * Cores para embeds por tipo de log
 */
const LOG_COLORS = {
  member_join: '#00FF00',
  member_leave: '#FF0000',
  member_role_add: '#00AAFF',
  member_role_remove: '#FF6600',
  message_delete: '#FF0000',
  message_update: '#FFFF00',
  member_update: '#9900FF',
  channel_create: '#00FF00',
  channel_delete: '#FF0000',
  role_create: '#00FF00',
  role_delete: '#FF0000',
  ban_add: '#8B0000',
  ban_remove: '#00FF00'
};

/**
 * Descrições dos tipos de log
 */
const LOG_DESCRIPTIONS = {
  member_join: 'Entrada de Membro',
  member_leave: 'Saída de Membro',
  member_role_add: 'Cargo Adicionado',
  member_role_remove: 'Cargo Removido',
  message_delete: 'Mensagem Deletada',
  message_update: 'Mensagem Editada',
  member_update: 'Membro Atualizado',
  channel_create: 'Canal Criado',
  channel_delete: 'Canal Deletado',
  role_create: 'Cargo Criado',
  role_delete: 'Cargo Deletado',
  ban_add: 'Usuário Banido',
  ban_remove: 'Ban Removido'
};

/**
 * Lê a configuração de logs
 */
function readLogsConfig() {
  try {
    if (fs.existsSync(logsConfigPath)) {
      return JSON.parse(fs.readFileSync(logsConfigPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Erro ao ler logs.json:', error);
  }
  return { logChannels: {} };
}

/**
 * Salva a configuração de logs
 */
function saveLogsConfig(data) {
  try {
    fs.writeFileSync(logsConfigPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Erro ao salvar logs.json:', error);
    return false;
  }
}

/**
 * Obtém o canal de log para um tipo específico
 */
function getLogChannel(client, guildId, logType) {
  const config = readLogsConfig();
  const guildConfig = config.logChannels[guildId];

  if (!guildConfig) return null;

  const channelId = guildConfig[logType];
  if (!channelId) return null;

  return client.channels.cache.get(channelId);
}

/**
 * Define um canal de log
 */
function setLogChannel(guildId, logType, channelId) {
  const config = readLogsConfig();

  if (!config.logChannels[guildId]) {
    config.logChannels[guildId] = {};
  }

  config.logChannels[guildId][logType] = channelId;
  return saveLogsConfig(config);
}

/**
 * Remove um canal de log
 */
function removeLogChannel(guildId, logType) {
  const config = readLogsConfig();

  if (!config.logChannels[guildId]) return true;

  delete config.logChannels[guildId][logType];

  // Se não houver mais logs, remover o servidor
  if (Object.keys(config.logChannels[guildId]).length === 0) {
    delete config.logChannels[guildId];
  }

  return saveLogsConfig(config);
}

/**
 * Envia um log de evento
 */
async function sendLog(client, guildId, logType, data) {
  try {
    const channel = getLogChannel(client, guildId, logType);
    if (!channel) return false;

    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS[logType] || '#FFFFFF')
      .setTitle(LOG_DESCRIPTIONS[logType] || logType)
      .setTimestamp();

    // Adiciona os campos específicos do evento
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        embed.addFields({ name: key, value: String(value), inline: true });
      }
    });

    embed.setFooter({ text: 'Sistema de Logs' });

    await channel.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error(`Erro ao enviar log (${logType}):`, error);
    return false;
  }
}

module.exports = {
  LOG_TYPES,
  LOG_COLORS,
  LOG_DESCRIPTIONS,
  readLogsConfig,
  saveLogsConfig,
  getLogChannel,
  setLogChannel,
  removeLogChannel,
  sendLog
};
