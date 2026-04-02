const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getRpProfile, saveRpProfile } = require("../../data/rp/rpManager");
const { getAllJobs, switchJob, checkJobSpecificRequirements } = require("../../data/rp/jobManager");
const { getJson } = require("../../utils/jsonWatcher");

/* =======================
   Funções utilitárias
======================= */

const createErrorEmbed = (description) =>
  new EmbedBuilder()
    .setColor("#ff0000")
    .setDescription(`❌ ${description}`);

const createWarningEmbed = (description) =>
  new EmbedBuilder()
    .setColor("#ffcc00")
    .setDescription(`⚠️ ${description}`);

const getAverageSalary = (salary) =>
  Math.round((salary.min + salary.max) / 2);

/* =======================
   Comando
======================= */

module.exports = {
  data: new SlashCommandBuilder()
    .setName("empregos")
    .setDescription("[RP] Gerencie sua carreira profissional.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("listar")
        .setDescription("Mostra a lista de empregos disponíveis no servidor.")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("pegar")
        .setDescription("Escolha um novo emprego.")
        .addStringOption(option =>
          option
            .setName("nome")
            .setDescription("O nome do emprego que você quer.")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("atual")
        .setDescription("Veja qual é seu emprego atual e suas informações.")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("detalhes")
        .setDescription("Veja detalhes de um emprego específico.")
        .addStringOption(option =>
          option
            .setName("nome")
            .setDescription("O nome do emprego.")
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  /* =======================
     Autocomplete
  ======================= */

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "nome") return;

    const jobs = await getAllJobs();

    const choices = Object.entries(jobs).map(([id, job]) => ({
      name: job.name,
      value: id
    }));

    const filtered = choices
      .filter(choice =>
        choice.name.toLowerCase().includes(focused.value.toLowerCase())
      )
      .slice(0, 25);

    await interaction.respond(filtered);
  },

  /* =======================
     Execução
  ======================= */

  async execute(interaction, client, guildConfig) {
    try {
      if (!guildConfig?.rp?.enabled) {
        return interaction.reply({
          embeds: [createErrorEmbed("O sistema de RP está desativado neste servidor.")],
          ephemeral: true
        });
      }

      const jobs = await getAllJobs();
      const subcommand = interaction.options.getSubcommand();

      /* ===== LISTAR ===== */
      if (subcommand === "listar") {
        return await listJobs(interaction, jobs, guildConfig);
      }

      /* ===== PEGAR ===== */
      if (subcommand === "pegar") {
        // Integração economia: ao pegar emprego, atualizar perfil, saldo, XP, badges, histórico
        const result = await takeJob(interaction, jobs, guildConfig);
        // Log admin
        const logChannel = guildConfig?.logs?.jobs;
        if (logChannel) {
          const channel = interaction.guild.channels.cache.get(logChannel);
          if (channel) {
            channel.send({ content: `👔 ${interaction.user.tag} pegou o emprego: ${interaction.options.getString("nome")}` });
          }
        }
        return result;
      }

      /* ===== ATUAL ===== */
      if (subcommand === "atual") {
        return await currentJob(interaction, jobs, guildConfig);
      }

      /* ===== DETALHES ===== */
      if (subcommand === "detalhes") {
        return await jobDetails(interaction, jobs, guildConfig);
      }

    } catch (error) {
      console.error("Erro no comando /empregos:", error);
      return interaction.reply({
        embeds: [createErrorEmbed("Ocorreu um erro inesperado ao executar o comando.")],
        ephemeral: true
      });
    }
  }
};

async function listJobs(interaction, jobs, guildConfig) {
  const embed = new EmbedBuilder()
    .setTitle("👔 Agência de Empregos")
    .setDescription("Estes são os empregos disponíveis no momento. Use `/empregos detalhes` para mais informações.")
    .setColor(guildConfig.embedColor || "#0099ff")
    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
    .setTimestamp();

  if (Object.keys(jobs).length === 0) {
    embed.addFields({
      name: "Sem vagas disponíveis",
      value: "Nenhum emprego foi cadastrado no momento."
    });
  } else {
    const currency = guildConfig.economy?.currency || "💰";
    const jobsList = [];

    for (const [id, job] of Object.entries(jobs)) {
      jobsList.push({
        name: `💼 ${job.name}`,
        value: [
          `*${job.description}*`,
          `**Salário:** ${currency} ${job.salary.min.toLocaleString('pt-BR')} - ${currency} ${job.salary.max.toLocaleString('pt-BR')}`,
          `**Cooldown:** ${Math.round((job.cooldown || 3600) / 60)} minutos`
        ].join("\n"),
        inline: false
      });
    }

    // Adicionar campos em grupos de 25
    for (let i = 0; i < jobsList.length; i += 25) {
      embed.addFields(...jobsList.slice(i, i + 25));
    }
  }

  return interaction.reply({ embeds: [embed] });
}

async function takeJob(interaction, jobs, guildConfig) {
  const jobId = interaction.options.getString("nome");
  const job = jobs[jobId];

  if (!job) {
    return interaction.reply({
      embeds: [createErrorEmbed("Este emprego não existe ou foi removido.")],
      ephemeral: true
    });
  }

  const rpProfile = await getRpProfile(interaction.guild.id, interaction.user.id);

  if (!rpProfile) {
    return interaction.reply({
      embeds: [createErrorEmbed("Seu perfil de RP não foi encontrado.")],
      ephemeral: true
    });
  }

  if (rpProfile.job === jobId) {
    return interaction.reply({
      embeds: [createWarningEmbed(`Você já trabalha como **${job.name}**.`)],
      ephemeral: true
    });
  }

  // Verificar requisitos específicos
  const requirementCheck = await checkJobSpecificRequirements(interaction.guild.id, interaction.user.id, jobId, guildConfig);
  if (!requirementCheck.canWork) {
    return interaction.reply({
      embeds: [createErrorEmbed(requirementCheck.reason)],
      ephemeral: true
    });
  }

  try {
    const result = await switchJob(interaction.guild.id, interaction.user.id, jobId, guildConfig);

    const embed = new EmbedBuilder()
      .setTitle("✅ Contratado!")
      .setDescription(
        `Parabéns, **${interaction.user.username}**!\nVocê agora trabalha como **${result.jobName}**.`
      )
      .setColor("#00ff00")
      .addFields(
        { name: "📝 Descrição", value: result.description, inline: false },
        { name: "💰 Salário Médio", value: `${guildConfig.economy?.currency || "💰"} ${result.avgSalary.toLocaleString('pt-BR')}`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    return interaction.reply({
      embeds: [createErrorEmbed(error.message)],
      ephemeral: true
    });
  }
}

async function currentJob(interaction, jobs, guildConfig) {
  const rpProfile = await getRpProfile(interaction.guild.id, interaction.user.id);
  const currency = guildConfig.economy?.currency || "💰";

  if (!rpProfile.job || !jobs[rpProfile.job]) {
    return interaction.reply({
      embeds: [createWarningEmbed("Você não tem um emprego no momento. Use `/empregos pegar` para conseguir um!")],
      ephemeral: true
    });
  }

  const job = jobs[rpProfile.job];

  const embed = new EmbedBuilder()
    .setTitle(`💼 ${job.name}`)
    .setDescription(job.description)
    .setColor(guildConfig.embedColor || "#0099ff")
    .addFields(
      { name: "💰 Salário Mínimo", value: `${currency} ${job.salary.min.toLocaleString('pt-BR')}`, inline: true },
      { name: "💰 Salário Máximo", value: `${currency} ${job.salary.max.toLocaleString('pt-BR')}`, inline: true },
      { name: "⏱️ Cooldown", value: `${Math.round((job.cooldown || 3600) / 60)} minutos`, inline: true },
      { name: "⭐ Experiência Total", value: `${rpProfile.workExperience || 0} XP`, inline: true }
    )
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  if (job.required_item) {
    embed.addFields({
      name: "⚠️ Item Necessário",
      value: `Este emprego requer um item especial. Verifique `/loja` ou `/inventario`.`,
      inline: false
    });
  }

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function jobDetails(interaction, jobs, guildConfig) {
  const jobId = interaction.options.getString("nome");
  const job = jobs[jobId];

  if (!job) {
    return interaction.reply({
      embeds: [createErrorEmbed("Este emprego não existe.")],
      ephemeral: true
    });
  }

  const currency = guildConfig.economy?.currency || "💰";
  const jobDescriptions = {
    surgeon: "💊 Médico-cirurgião - Realiza cirurgias complexas e salva vidas em operações críticas.",
    paramedic: "🚑 Médico-socorrista - Presta atendimento de emergência no local do incidente.",
    lawyer: "⚖️ Advogado - Defende clientes em processos legais no tribunal.",
    judge: "🔨 Juiz - Preside casos na corte e toma decisões judiciais finais.",
    agent: "🚗 Agente Detran - Fiscaliza veículos, licenças e infrações de trânsito.",
    police_officer: "🚔 Coronel da Polícia - Lidera operações policiais e mantém a lei.",
    mayor: "🏛️ Prefeito - Governa a cidade e gerencia recursos municipais.",
    trucker: "🚚 Caminhoneiro - Transporta cargas para diferentes regiões e ganha bônus."
  };

  const embed = new EmbedBuilder()
    .setTitle(`💼 Detalhes: ${job.name}`)
    .setDescription(jobDescriptions[jobId] || job.description)
    .setColor(guildConfig.embedColor || "#0099ff")
    .addFields(
      { name: "💰 Salário Mínimo", value: `${currency} ${job.salary.min.toLocaleString('pt-BR')}`, inline: true },
      { name: "💰 Salário Máximo", value: `${currency} ${job.salary.max.toLocaleString('pt-BR')}`, inline: true },
      { name: "📊 Salário Médio", value: `${currency} ${getAverageSalary(job.salary).toLocaleString('pt-BR')}`, inline: true },
      { name: "⏱️ Cooldown", value: `${Math.round((job.cooldown || 3600) / 60)} minutos`, inline: true },
      { name: "⚡ Velocidade", value: job.cooldown < 3600 ? "🟢 Rápido" : job.cooldown <= 5400 ? "🟡 Normal" : "🔴 Lento", inline: true }
    );

  if (job.required_item) {
    embed.addFields({
      name: "⚠️ Item Necessário",
      value: `Você precisará adquirir um item especial para trabalhar neste cargo.`,
      inline: false
    });
  }

  embed.setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}
