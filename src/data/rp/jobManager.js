const path = require('path');
const db = require('../../utils/database');
const { getRpProfile, saveRpProfile } = require('./rpManager');
const { getUser, saveUser, addTransaction } = require('../economy/economyManager');
const { getPoliceData, savePoliceData } = require('../police/policeManager');
const { getDetranData, saveDetranData } = require('../detran/detranManager');
const { updateJobStats } = require('./jobStats');
const { processAllBonuses, generateBonusMessage } = require('./workBonusManager');
const { generateWorkEvent, formatEventMessage } = require('./workEventManager');

const jobsPath = path.join(__dirname, '../../data/rp/jobs.json');
const itemsPath = path.join(__dirname, '../../data/rp/items.json');

/**
 * Sistema integrado de empregos com economia, polícia, detran e RP
 */

/**
 * Obter configuração de um emprego
 */
async function getJobConfig(jobId) {
  const jobs = await db.read(jobsPath, {});
  return jobs[jobId] || null;
}

/**
 * Obter todos os empregos
 */
async function getAllJobs() {
  return await db.read(jobsPath, {});
}

/**
 * Obter configuração de um item
 */
async function getItemConfig(itemId) {
  const items = await db.read(itemsPath, {});
  return items[itemId] || null;
}

/**
 * Verificar se o usuário pode trabalhar
 * @returns { canWork: boolean, reason: string | null }
 */
async function canWork(guildId, userId, guildConfig) {
  const rpProfile = await getRpProfile(guildId, userId);
  const economyProfile = await getUser(userId, guildId, guildConfig);

  if (!rpProfile.job) {
    return { canWork: false, reason: 'Você não tem um emprego. Use `/empregos pegar` para conseguir um.' };
  }

  const job = await getJobConfig(rpProfile.job);
  if (!job) {
    return { canWork: false, reason: 'Seu emprego não existe mais. Escolha um novo.' };
  }

  const now = Date.now();
  const cooldownTime = (job.cooldown || 3600) * 1000;

  if (economyProfile.lastWork && now - economyProfile.lastWork < cooldownTime) {
    return {
      canWork: false,
      reason: 'Você trabalhou recentemente',
      remainingTime: economyProfile.lastWork + cooldownTime - now,
      nextWorkTime: economyProfile.lastWork + cooldownTime
    };
  }

  // Verificar items necessários
  if (job.required_item) {
    const hasItem = rpProfile.inventory.some(item => item.itemId === job.required_item);
    if (!hasItem) {
      const itemConfig = await getItemConfig(job.required_item);
      return {
        canWork: false,
        reason: `Você precisa de uma ${itemConfig?.name || 'item'} para trabalhar como ${job.name}`
      };
    }
  }

  // Verificar requisitos específicos de profissão
  const jobSpecificCheck = await checkJobSpecificRequirements(guildId, userId, rpProfile.job, guildConfig);
  if (!jobSpecificCheck.canWork) {
    return jobSpecificCheck;
  }

  return { canWork: true };
}

/**
 * Verificar requisitos específicos da profissão
 */
async function checkJobSpecificRequirements(guildId, userId, jobId, guildConfig) {
  switch (jobId) {
    case 'police_officer':
    case 'police_soldier':
      const policeData = await getPoliceData(userId, guildId);
      if (!policeData || !policeData.role) {
        return { canWork: false, reason: 'Você não tem patente na polícia. Fale com um admin da polícia.' };
      }
      break;

    case 'agent':
      const detranData = await getDetranData(userId, guildId);
      if (!detranData || !detranData.role) {
        return { canWork: false, reason: 'Você não é um agente do Detran. Fale com um admin do Detran.' };
      }
      break;

    case 'mayor':
    case 'judge':
    case 'lawyer':
    case 'surgeon':
    case 'paramedic':
      // Esses cargos são mais livres
      break;
  }

  return { canWork: true };
}

/**
 * Executar trabalho
 */
async function doWork(guildId, userId, guildConfig) {
  const rpProfile = await getRpProfile(guildId, userId);
  const economyProfile = await getUser(userId, guildId, guildConfig);
  const job = await getJobConfig(rpProfile.job);

  if (!job) {
    throw new Error('Emprego não encontrado');
  }

  // Calcular salário base com variações
  const baseSalary = Math.round((job.salary.min + job.salary.max) / 2);
  const variation = Math.random() * 0.4 - 0.2; // -20% a +20%
  const initialSalary = Math.round(baseSalary + (baseSalary * variation));

  // Processar bônus e conquistas
  const bonusData = await processAllBonuses(guildId, userId, initialSalary, guildConfig);
  const finalSalary = bonusData.finalSalary;

  // Adicionar experiência RP
  if (!rpProfile.workExperience) rpProfile.workExperience = 0;
  rpProfile.workExperience += Math.floor(finalSalary / 100);

  // Adicionar ao histórico
  if (!rpProfile.workHistory) rpProfile.workHistory = [];
  rpProfile.workHistory.push({ date: Date.now(), salary: finalSalary });
  if (rpProfile.workHistory.length > 30) rpProfile.workHistory = rpProfile.workHistory.slice(-30);

  // Processar eventos específicos do emprego
  const jobEventResult = await processJobSpecificEvent(guildId, userId, rpProfile.job, finalSalary, guildConfig);
  
  // Gerar evento aleatório de trabalho
  const randomEvent = await generateWorkEvent(guildId, userId, rpProfile.job, finalSalary, guildConfig);
  
  // Aplicar multiplicador do evento se houver
  let eventAdjustedSalary = finalSalary;
  if (randomEvent.salaryMultiplier) {
    eventAdjustedSalary = Math.round(finalSalary * randomEvent.salaryMultiplier);
  }
  
  // Adicionar dinheiro de evento se houver
  if (randomEvent.bonusMoney) {
    eventAdjustedSalary += randomEvent.bonusMoney;
  }
  
  // Atualizar salário final se houver ajustes
  if (eventAdjustedSalary !== finalSalary) {
    economyProfile.wallet = (economyProfile.wallet || 0) - finalSalary + eventAdjustedSalary;
    finalSalary = eventAdjustedSalary;
  }

  // Atualizar economia
  economyProfile.wallet = (economyProfile.wallet || 0) + finalSalary;
  economyProfile.lastWork = Date.now();

  // Adicionar transação
  await addTransaction(userId, guildId, guildConfig, 'work', finalSalary, `Salário de ${job.name} (com bônus e eventos)`);

  // Atualizar estatísticas
  await updateJobStats(guildId, userId, rpProfile.job, finalSalary);

  // Salvar dados
  await saveRpProfile(guildId, userId, rpProfile);
  await saveUser(userId, guildId, guildConfig, economyProfile);

  // Gerar mensagem de bônus
  const currency = guildConfig.economy?.currency || '💰';
  const bonusMessage = generateBonusMessage(bonusData, currency);
  const eventMessage = formatEventMessage(randomEvent);

  return {
    success: true,
    jobName: job.name,
    salary: finalSalary,
    originalSalary: initialSalary,
    experience: rpProfile.workExperience,
    bonusData,
    bonusMessage,
    randomEvent,
    eventMessage,
    additionalInfo: jobEventResult
  };
}

/**
 * Processar eventos específicos do emprego
 */
async function processJobSpecificEvent(guildId, userId, jobId, salary, guildConfig) {
  const additionalInfo = {};

  switch (jobId) {
    case 'police_officer':
    case 'police_soldier':
      const policeData = await getPoliceData(userId, guildId);
      if (policeData) {
        policeData.salary_earned = (policeData.salary_earned || 0) + salary;
        await savePoliceData(userId, guildId, policeData);
        additionalInfo.message = `Você recebeu o salário policial! 🚔`;
      }
      break;

    case 'agent':
      const detranData = await getDetranData(userId, guildId);
      if (detranData) {
        detranData.salary_earned = (detranData.salary_earned || 0) + salary;
        await saveDetranData(guildId, userId, detranData);
        additionalInfo.message = `Você recebeu o salário do Detran! 🚗`;
      }
      break;

    case 'trucker':
      // Chance de ganhar item bônus
      if (Math.random() < 0.3) {
        const rpProfile = await getRpProfile(guildId, userId);
        if (!rpProfile.inventory) rpProfile.inventory = [];

        rpProfile.inventory.push({
          itemId: 'gold_ore',
          name: 'Minério de Ouro',
          quantity: 1
        });

        await saveRpProfile(guildId, userId, rpProfile);
        additionalInfo.bonus = 'Você encontrou um minério de ouro durante o trajeto! 💎';
      }
      break;

    case 'fisher':
      // Chance de ganhar peixe
      if (Math.random() < 0.4) {
        const rpProfile = await getRpProfile(guildId, userId);
        if (!rpProfile.inventory) rpProfile.inventory = [];

        const fishCount = Math.floor(Math.random() * 3) + 1;
        const existingFish = rpProfile.inventory.find(i => i.itemId === 'fish');
        
        if (existingFish) {
          existingFish.quantity = (existingFish.quantity || 1) + fishCount;
        } else {
          rpProfile.inventory.push({
            itemId: 'fish',
            name: 'Peixe',
            quantity: fishCount
          });
        }

        await saveRpProfile(guildId, userId, rpProfile);
        additionalInfo.bonus = `Você pescou ${fishCount} peixe(s)! 🐟`;
      }
      break;

    case 'miner':
      // Chance de encontrar minério
      if (Math.random() < 0.25) {
        const rpProfile = await getRpProfile(guildId, userId);
        if (!rpProfile.inventory) rpProfile.inventory = [];

        rpProfile.inventory.push({
          itemId: 'gold_ore',
          name: 'Minério de Ouro',
          quantity: 1
        });

        await saveRpProfile(guildId, userId, rpProfile);
        additionalInfo.bonus = 'Você encontrou um minério de ouro na mina! ⛏️💎';
      }
      break;

    case 'judge':
    case 'lawyer':
      additionalInfo.message = `Você recebeu honorários de trabalho. ⚖️`;
      break;

    case 'surgeon':
    case 'paramedic':
      additionalInfo.message = `Você salvou uma vida hoje. 💊`;
      break;

    case 'taxi_driver':
      additionalInfo.message = `Você fez uma corrida bem-sucedida. 🚕`;
      break;

    case 'chef':
      additionalInfo.message = `Você preparou uma refeição deliciosa. 👨‍🍳`;
      break;

    case 'mechanic':
      additionalInfo.message = `Você consertou um veículo com sucesso. 🔧`;
      break;

    case 'farmer':
      additionalInfo.message = `Você colheu produtos da sua plantação. 🌾`;
      break;
  }

  return additionalInfo;
}

/**
 * Trocar de emprego
 */
async function switchJob(guildId, userId, newJobId, guildConfig) {
  const newJobConfig = await getJobConfig(newJobId);
  if (!newJobConfig) {
    throw new Error('Emprego não existe');
  }

  const rpProfile = await getRpProfile(guildId, userId);

  // Verificar se pode trocar de emprego
  const lastJobSwitch = rpProfile.lastJobSwitch || 0;
  const switchCooldown = 24 * 60 * 60 * 1000; // 24 horas

  if (Date.now() - lastJobSwitch < switchCooldown && rpProfile.job) {
    const remaining = lastJobSwitch + switchCooldown - Date.now();
    throw new Error(`Você precisa esperar ${Math.ceil(remaining / 1000 / 60)} minutos para trocar de emprego novamente`);
  }

  rpProfile.job = newJobId;
  rpProfile.lastJobSwitch = Date.now();

  await saveRpProfile(guildId, userId, rpProfile);

  return {
    success: true,
    jobName: newJobConfig.name,
    description: newJobConfig.description,
    avgSalary: Math.round((newJobConfig.salary.min + newJobConfig.salary.max) / 2)
  };
}

/**
 * Obter perfil de trabalho do usuário
 */
async function getWorkProfile(guildId, userId, guildConfig) {
  const rpProfile = await getRpProfile(guildId, userId);
  const economyProfile = await getUser(userId, guildId, guildConfig);
  const jobs = await getAllJobs();

  const currentJob = rpProfile.job ? jobs[rpProfile.job] : null;
  const lastWorkTime = economyProfile.lastWork || 0;
  const cooldownTime = currentJob ? (currentJob.cooldown || 3600) * 1000 : 0;
  const nextWorkTime = lastWorkTime + cooldownTime;

  return {
    currentJob: currentJob ? {
      id: rpProfile.job,
      name: currentJob.name,
      description: currentJob.description,
      salary: currentJob.salary
    } : null,
    workExperience: rpProfile.workExperience || 0,
    lastWork: lastWorkTime,
    nextWork: nextWorkTime,
    canWorkNow: Date.now() >= nextWorkTime,
    cooldownRemaining: Math.max(0, nextWorkTime - Date.now())
  };
}

module.exports = {
  getJobConfig,
  getAllJobs,
  getItemConfig,
  canWork,
  checkJobSpecificRequirements,
  doWork,
  processJobSpecificEvent,
  switchJob,
  getWorkProfile
};
