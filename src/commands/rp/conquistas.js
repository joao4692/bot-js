const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getRpProfile } = require("../../data/rp/rpManager");
const { checkExperienceLevel, calculateAttendanceBonus, checkWorkCountAchievements, BONUS_THRESHOLDS } = require("../../data/rp/workBonusManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("conquistas")
    .setDescription("[RP] Veja suas conquistas e metas profissionais.")
    .addSubcommand(sub => sub
      .setName("perfil")
      .setDescription("Veja seu perfil de conquistas profissionais")
    )
    .addSubcommand(sub => sub
      .setName("metas")
      .setDescription("Veja suas metas e progresso atual")
    )
    .addSubcommand(sub => sub
      .setName("niveis")
      .setDescription("Veja todos os níveis de experiência disponíveis")
    )
    .addSubcommand(sub => sub
      .setName("bonus")
      .setDescription("Veja os bônus disponíveis por assiduidade")
    ),

  async execute(interaction, client, guildConfig) {
    if (!guildConfig.rp || !guildConfig.rp.enabled) {
      return interaction.reply({ 
        embeds: [new EmbedBuilder()
          .setColor("#ff0000")
          .setDescription('❌ O sistema de RP está desativado neste servidor.')
        ], 
        ephemeral: true 
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "perfil") {
      return await handleProfile(interaction, guildConfig);
    } else if (subcommand === "metas") {
      return await handleGoals(interaction, guildConfig);
    } else if (subcommand === "niveis") {
      return await handleLevels(interaction, guildConfig);
    } else if (subcommand === "bonus") {
      return await handleBonuses(interaction, guildConfig);
    }
  }
};

async function handleProfile(interaction, guildConfig) {
  try {
    const rpProfile = await getRpProfile(interaction.guild.id, interaction.user.id);
    const currency = guildConfig.economy.currency || '💰';
    
    // Obter informações
    const experienceLevel = await checkExperienceLevel(interaction.guild.id, interaction.user.id);
    const attendanceBonus = await calculateAttendanceBonus(interaction.guild.id, interaction.user.id);
    const achievements = await checkWorkCountAchievements(interaction.guild.id, interaction.user.id, guildConfig);
    
    const totalWorks = rpProfile.workHistory ? rpProfile.workHistory.length : 0;
    const experience = rpProfile.workExperience || 0;
    
    const embed = new EmbedBuilder()
      .setTitle("🏆 Seu Perfil de Conquistas")
      .setColor(guildConfig.embedColor || '#00ff00')
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "💼 Trabalhos Realizados", value: `${totalWorks.toLocaleString('pt-BR')}`, inline: true },
        { name: "⭐ Experiência Total", value: `${experience.toLocaleString('pt-BR')} XP`, inline: true },
        { name: "🏅 Nível Atual", value: experienceLevel.currentLevel ? experienceLevel.currentLevel.level : "Iniciante", inline: true }
      )
      .setTimestamp();

    // Adicionar conquistas desbloqueadas
    if (rpProfile.achievements && rpProfile.achievements.length > 0) {
      const achievementNames = rpProfile.achievements.map(a => {
        if (a.startsWith('work_count_')) {
          const threshold = a.replace('work_count_', '');
          return BONUS_THRESHOLDS.total_works[threshold]?.bonus || a;
        }
        return a;
      });
      
      embed.addFields({
        name: "🎖️ Conquistas Desbloqueadas",
        value: achievementNames.join(', ') || "Nenhuma",
        inline: false
      });
    }

    // Adicionar bônus atual
    if (attendanceBonus.bonus) {
      embed.addFields({
        name: "🔥 Bônus de Assiduidade Atual",
        value: `**${attendanceBonus.bonus}**: ${attendanceBonus.description}`,
        inline: false
      });
    }

    // Adicionar próximas metas
    const nextGoals = [];
    
    if (experienceLevel.nextLevel) {
      nextGoals.push(`📈 Próximo nível: ${experienceLevel.nextLevel.level} (${experienceLevel.nextLevel.remaining} XP restantes)`);
    }
    
    // Próxima conquista por trabalhos
    const nextWorkThreshold = Object.keys(BONUS_THRESHOLDS.total_works)
      .map(t => parseInt(t))
      .find(t => totalWorks < t);
    
    if (nextWorkThreshold) {
      const nextAchievement = BONUS_THRESHOLDS.total_works[nextWorkThreshold];
      nextGoals.push(`🎯 Próxima conquista: ${nextAchievement.bonus} (${nextWorkThreshold - totalWorks} trabalhos restantes)`);
    }
    
    // Próximo bônus de assiduidade
    const consecutiveDays = await getConsecutiveDays(rpProfile.workHistory);
    const nextDayThreshold = Object.keys(BONUS_THRESHOLDS.consecutive_days)
      .map(d => parseInt(d))
      .find(d => consecutiveDays < d);
    
    if (nextDayThreshold) {
      const nextBonus = BONUS_THRESHOLDS.consecutive_days[nextDayThreshold];
      nextGoals.push(`🔥 Próximo bônus: ${nextBonus.bonus} (${nextDayThreshold - consecutiveDays} dias restantes)`);
    }
    
    if (nextGoals.length > 0) {
      embed.addFields({
        name: "🎯 Próximas Metas",
        value: nextGoals.join('\n'),
        inline: false
      });
    }

    interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Erro ao carregar perfil de conquistas:', error);
    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor("#ff0000")
        .setDescription(`❌ Erro ao carregar perfil: ${error.message}`)
      ],
      ephemeral: true
    });
  }
}

async function handleGoals(interaction, guildConfig) {
  try {
    const rpProfile = await getRpProfile(interaction.guild.id, interaction.user.id);
    const currency = guildConfig.economy.currency || '💰';
    
    const totalWorks = rpProfile.workHistory ? rpProfile.workHistory.length : 0;
    const experience = rpProfile.workExperience || 0;
    const consecutiveDays = await getConsecutiveDays(rpProfile.workHistory);
    
    const embed = new EmbedBuilder()
      .title("🎯 Suas Metas Profissionais")
      .setColor(guildConfig.embedColor || '#0099ff')
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    // Metas de trabalhos
    const workGoals = [];
    for (const [threshold, achievement] of Object.entries(BONUS_THRESHOLDS.total_works)) {
      const count = parseInt(threshold);
      const completed = totalWorks >= count;
      const progress = Math.min(100, Math.round((totalWorks / count) * 100));
      
      workGoals.push(
        `${completed ? '✅' : '⏳'} **${achievement.bonus}**: ${progress}% (${totalWorks}/${count})`
      );
    }
    
    // Metas de experiência
    const experienceGoals = [];
    for (const [threshold, level] of Object.entries(BONUS_THRESHOLDS.experience_levels)) {
      const xp = parseInt(threshold);
      const completed = experience >= xp;
      const progress = Math.min(100, Math.round((experience / xp) * 100));
      
      experienceGoals.push(
        `${completed ? '✅' : '⏳'} **Nível ${level.level}**: ${progress}% (${experience}/${xp} XP)`
      );
    }
    
    // Metas de assiduidade
    const attendanceGoals = [];
    for (const [days, bonus] of Object.entries(BONUS_THRESHOLDS.consecutive_days)) {
      const required = parseInt(days);
      const completed = consecutiveDays >= required;
      const progress = Math.min(100, Math.round((consecutiveDays / required) * 100));
      
      attendanceGoals.push(
        `${completed ? '✅' : '⏳'} **${bonus.bonus}**: ${progress}% (${consecutiveDays}/${required} dias)`
      );
    }
    
    embed.addFields(
      { name: "💼 Metas de Trabalhos", value: workGoals.join('\n'), inline: true },
      { name: "⭐ Metas de Experiência", value: experienceGoals.join('\n'), inline: true },
      { name: "🔥 Metas de Assiduidade", value: attendanceGoals.join('\n'), inline: true }
    );

    embed.setTimestamp();
    interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Erro ao carregar metas:', error);
    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor("#ff0000")
        .setDescription(`❌ Erro ao carregar metas: ${error.message}`)
      ],
      ephemeral: true
    });
  }
}

async function handleLevels(interaction, guildConfig) {
  try {
    const currency = guildConfig.economy.currency || '💰';
    
    const embed = new EmbedBuilder()
      .setTitle("📊 Níveis de Experiência Profissional")
      .setColor(guildConfig.embedColor || '#9b59b6')
      .setDescription("Aqui estão todos os níveis de experiência disponíveis e seus bônus:")
      .setTimestamp();

    const levels = Object.entries(BONUS_THRESHOLDS.experience_levels)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    const levelDescriptions = levels.map(([threshold, level]) => {
      return `**${level.level}** (${threshold} XP)\n🎁 Bônus: ${currency} ${level.bonus.toLocaleString('pt-BR')}\n`;
    });

    // Adicionar campos em grupos
    for (let i = 0; i < levelDescriptions.length; i += 2) {
      embed.addFields(
        { name: `Nível ${i + 1}`, value: levelDescriptions[i] || 'N/A', inline: true },
        { name: `Nível ${i + 2}`, value: levelDescriptions[i + 1] || 'N/A', inline: true }
      );
    }

    interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Erro ao carregar níveis:', error);
    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor("#ff0000")
        .setDescription(`❌ Erro ao carregar níveis: ${error.message}`)
      ],
      ephemeral: true
    });
  }
}

async function handleBonuses(interaction, guildConfig) {
  try {
    const embed = new EmbedBuilder()
      .setTitle("🔥 Bônus de Assiduidade")
      .setColor(guildConfig.embedColor || '#e67e22')
      .setDescription("Trabalhe dias consecutivos para desbloquear bônus permanentes:")
      .setTimestamp();

    const bonuses = Object.entries(BONUS_THRESHOLDS.consecutive_days)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    const bonusDescriptions = bonuses.map(([days, bonus]) => {
      return `**${bonus.bonus}** (${days} dias)\n💎 ${bonus.description}\n`;
    });

    // Adicionar campos em grupos
    for (let i = 0; i < bonusDescriptions.length; i += 2) {
      embed.addFields(
        { name: `${i + 1} Dias Consecutivos`, value: bonusDescriptions[i] || 'N/A', inline: true },
        { name: `${i + 2} Dias Consecutivos`, value: bonusDescriptions[i + 1] || 'N/A', inline: true }
      );
    }

    interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Erro ao carregar bônus:', error);
    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor("#ff0000")
        .setDescription(`❌ Erro ao carregar bônus: ${error.message}`)
      ],
      ephemeral: true
    });
  }
}

// Função auxiliar para calcular dias consecutivos (copiada do workBonusManager)
async function getConsecutiveDays(workHistory) {
  if (!workHistory || workHistory.length === 0) return 0;
  
  const sortedHistory = [...workHistory].sort((a, b) => b.date - a.date);
  
  let consecutiveDays = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastWork = new Date(sortedHistory[0].date);
  lastWork.setHours(0, 0, 0, 0);
  
  if (lastWork.getTime() !== today.getTime()) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastWork.getTime() !== yesterday.getTime()) {
      return 0;
    }
  }
  
  for (let i = 1; i < sortedHistory.length; i++) {
    const currentWork = new Date(sortedHistory[i].date);
    const previousWork = new Date(sortedHistory[i-1].date);
    
    currentWork.setHours(0, 0, 0, 0);
    previousWork.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((previousWork - currentWork) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      consecutiveDays++;
    } else {
      break;
    }
  }
  
  return consecutiveDays;
}
