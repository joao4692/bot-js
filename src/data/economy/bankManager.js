const path = require('path');
const db = require('../../utils/database');

const bankFilePath = path.join(__dirname, '../../data/bank.json');

/**
 * SISTEMA UNIFICADO DE BANCO
 * Gerencia contas, transações, empréstimos, saques, depósitos e muito mais!
 */

// ============================================
// 1. FUNÇÕES BÁSICAS DE CONTA
// ============================================

/**
 * Obter conta bancária de um usuário
 */
async function getBankAccount(guildId, userId) {
  const bankData = await db.read(bankFilePath, {});
  const key = `${guildId}_${userId}`;
  
  // Log para debug
  console.log(`[BANK DEBUG] Buscando conta - Usuário: ${userId}, Chave: ${key}`);
  
  const accountData = bankData[key];
  
  if (accountData) {
    console.log(`[BANK DEBUG] Conta encontrada - Saldo: ${accountData.bank}, Limite: ${accountData.bankLimit}`);
  } else {
    console.log(`[BANK DEBUG] Conta não encontrada para usuário: ${userId}`);
  }
  
  if (!accountData) {
    accountData = {
      userId,
      guildId,
      wallet: 0,
      bank: 0,
      savings: 0, // Poupança com juros
      lastDaily: 0,
      lastWeekly: 0,
      lastMonthly: 0,
      loans: [], // Empréstimos ativos
      totalLoaned: 0,
      transactionHistory: [],
      accountCreated: Date.now(),
      accountLevel: 1,
      bankLimit: 100000, // Limite inicial
      accountStatus: 'active' // active, frozen, blocked
    };
    bankData[key] = accountData;
    await db.write(bankFilePath, bankData);
  }

  return accountData;
}

/**
 * Salvar conta bancária
 */
async function saveBankAccount(guildId, userId, accountData) {
  const bankData = await db.read(bankFilePath, {});
  const key = `${guildId}_${userId}`;
  
  // Log antes de salvar
  console.log(`[BANK DEBUG] Salvando conta - Usuário: ${userId}, Saldo Atual: ${accountData.bank}, Limite: ${accountData.bankLimit}`);
  
  bankData[key] = accountData;
  await db.write(bankFilePath, bankData);
  
  // Verificação pós-salvamento
  const savedData = await db.read(bankFilePath, {});
  const savedAccount = savedData[key];
  
  if (savedAccount) {
    console.log(`[BANK DEBUG] Pós-salvamento - Saldo salvo: ${savedAccount.bank}, Saldo esperado: ${accountData.bank}`);
    console.log(`[BANK DEBUG] Dados correspondem? ${savedAccount.bank === accountData.bank ? 'SIM' : 'NÃO'}`);
  } else {
    console.log(`[BANK DEBUG] ERRO: Conta não encontrada após salvar!`);
  }
  
  return savedAccount || accountData;
}

/**
 * Obter todas as contas de um servidor
 */
async function getAllBankAccounts(guildId) {
  const bankData = await db.read(bankFilePath, {});
  return Object.values(bankData).filter(acc => acc.guildId === guildId);
}

// ============================================
// 2. OPERAÇÕES DE DEPÓSITO E SAQUE
// ============================================

/**
 * Depositar dinheiro na conta
 */
async function deposit(guildId, userId, amount, description = '') {
  if (amount <= 0) {
    return { success: false, error: 'Valor deve ser maior que zero' };
  }

  const account = await getBankAccount(guildId, userId);

  // Verificar limite da conta
  if (account.bank + amount > account.bankLimit) {
    return {
      success: false,
      error: `Limite da conta atingido! Máximo: ${account.bankLimit}`,
      currentBalance: account.bank,
      limit: account.bankLimit
    };
  }

  const oldBalance = account.bank;
  account.bank += amount;
  
  // Log detalhado para debug
  console.log(`[BANK DEBUG] Depósito - Usuário: ${userId}, Valor: ${amount}, Saldo Anterior: ${oldBalance}, Saldo Novo: ${account.bank}, Limite: ${account.bankLimit}`);
  
  account.transactionHistory.push({
    type: 'deposit',
    amount,
    timestamp: Date.now(),
    description: description || 'Depósito',
    balance: account.bank
  });

  await saveBankAccount(guildId, userId, account);

  // Verificação pós-salvamento
  const savedAccount = await getBankAccount(guildId, userId);
  console.log(`[BANK DEBUG] Pós-salvamento - Saldo salvo: ${savedAccount.bank}, Saldo esperado: ${account.bank}`);

  return {
    success: true,
    newBalance: account.bank,
    amount,
    message: `Depósito de ${amount} realizado com sucesso!`
  };
}

/**
 * Sacar dinheiro da conta
 */
async function withdraw(guildId, userId, amount, description = '') {
  if (amount <= 0) {
    return { success: false, error: 'Valor deve ser maior que zero' };
  }

  const account = await getBankAccount(guildId, userId);

  if (account.bank < amount) {
    return {
      success: false,
      error: `Saldo insuficiente! Você tem ${account.bank}`,
      currentBalance: account.bank
    };
  }

  account.bank -= amount;
  account.transactionHistory.push({
    type: 'withdraw',
    amount,
    timestamp: Date.now(),
    description: description || 'Saque',
    balance: account.bank
  });

  await saveBankAccount(guildId, userId, account);

  return {
    success: true,
    newBalance: account.bank,
    amount,
    message: `Saque de ${amount} realizado com sucesso!`
  };
}

/**
 * Transferir entre contas
 */
async function transfer(guildId, senderId, receiverId, amount, description = '') {
  if (amount <= 0) {
    return { success: false, error: 'Valor deve ser maior que zero' };
  }

  if (senderId === receiverId) {
    return { success: false, error: 'Não pode transferir para si mesmo' };
  }

  const senderAccount = await getBankAccount(guildId, senderId);
  const receiverAccount = await getBankAccount(guildId, receiverId);

  if (senderAccount.bank < amount) {
    return {
      success: false,
      error: `Saldo insuficiente! Você tem ${senderAccount.bank}`,
      currentBalance: senderAccount.bank
    };
  }

  // Verificar limite do receptor
  if (receiverAccount.bank + amount > receiverAccount.bankLimit) {
    return {
      success: false,
      error: `Limite da conta do receptor atingido!`,
      receiverLimit: receiverAccount.bankLimit
    };
  }

  const timestamp = Date.now();
  const transDesc = description || 'Transferência';

  senderAccount.bank -= amount;
  senderAccount.transactionHistory.push({
    type: 'transfer_sent',
    amount,
    timestamp,
    description: `${transDesc} para ${receiverId}`,
    balance: senderAccount.bank,
    recipient: receiverId
  });

  receiverAccount.bank += amount;
  receiverAccount.transactionHistory.push({
    type: 'transfer_received',
    amount,
    timestamp,
    description: `${transDesc} de ${senderId}`,
    balance: receiverAccount.bank,
    sender: senderId
  });

  await saveBankAccount(guildId, senderId, senderAccount);
  await saveBankAccount(guildId, receiverId, receiverAccount);

  return {
    success: true,
    senderBalance: senderAccount.bank,
    receiverBalance: receiverAccount.bank,
    amount,
    message: 'Transferência realizada com sucesso!'
  };
}

// ============================================
// 3. SISTEMA DE EMPRÉSTIMOS
// ============================================

/**
 * Solicitar empréstimo
 */
async function requestLoan(guildId, userId, amount, months = 1) {
  if (amount <= 0 || months <= 0) {
    return { success: false, error: 'Valores devem ser maiores que zero' };
  }

  const account = await getBankAccount(guildId, userId);

  // Verificar empréstimos ativos
  const activeLoans = account.loans.filter(l => !l.paid);
  if (activeLoans.length >= 3) {
    return {
      success: false,
      error: 'Você tem limite máximo de 3 empréstimos ativos',
      activeLoans: activeLoans.length
    };
  }

  // Taxa de juros: 5% por mês
  const interestRate = 0.05;
  const totalInterest = amount * interestRate * months;
  const totalToPay = amount + totalInterest;

  const loan = {
    id: `loan_${Date.now()}`,
    amount,
    totalToPay,
    interestRate,
    months,
    monthsPaid: 0,
    createdAt: Date.now(),
    dueDate: Date.now() + (months * 30 * 24 * 60 * 60 * 1000),
    paid: false,
    monthlyPayment: totalToPay / months
  };

  account.loans.push(loan);
  account.bank += amount;
  account.totalLoaned += amount;

  account.transactionHistory.push({
    type: 'loan_approved',
    amount,
    timestamp: Date.now(),
    description: `Empréstimo aprovado (${months} mês(es), juros: ${(interestRate * 100)}%)`,
    balance: account.bank
  });

  await saveBankAccount(guildId, userId, account);

  return {
    success: true,
    loan,
    message: 'Empréstimo aprovado!',
    details: {
      principal: amount,
      interest: totalInterest,
      total: totalToPay,
      monthlyPayment: totalToPay / months
    }
  };
}

/**
 * Pagar empréstimo
 */
async function payLoan(guildId, userId, loanId) {
  const account = await getBankAccount(guildId, userId);
  const loan = account.loans.find(l => l.id === loanId);

  if (!loan) {
    return { success: false, error: 'Empréstimo não encontrado' };
  }

  if (loan.paid) {
    return { success: false, error: 'Empréstimo já foi pago' };
  }

  if (account.bank < loan.monthlyPayment) {
    return {
      success: false,
      error: `Saldo insuficiente! Necessário: ${loan.monthlyPayment}`,
      balance: account.bank,
      required: loan.monthlyPayment
    };
  }

  account.bank -= loan.monthlyPayment;
  loan.monthsPaid += 1;

  if (loan.monthsPaid >= loan.months) {
    loan.paid = true;
  }

  account.transactionHistory.push({
    type: 'loan_payment',
    amount: loan.monthlyPayment,
    timestamp: Date.now(),
    description: `Pagamento de empréstimo (${loan.monthsPaid}/${loan.months} meses)`,
    balance: account.bank
  });

  await saveBankAccount(guildId, userId, account);

  return {
    success: true,
    payment: loan.monthlyPayment,
    monthsPaid: loan.monthsPaid,
    monthsTotal: loan.months,
    paid: loan.paid,
    remainingBalance: account.bank,
    message: loan.paid ? 'Empréstimo quitado!' : `Pagamento ${loan.monthsPaid}/${loan.months} realizado!`
  };
}

/**
 * Obter informações do empréstimo
 */
async function getLoanInfo(guildId, userId, loanId) {
  const account = await getBankAccount(guildId, userId);
  const loan = account.loans.find(l => l.id === loanId);

  if (!loan) {
    return null;
  }

  const remainingMonths = loan.months - loan.monthsPaid;
  const remainingAmount = loan.monthlyPayment * remainingMonths;

  return {
    ...loan,
    remainingMonths,
    remainingAmount,
    percentagePaid: (loan.monthsPaid / loan.months) * 100
  };
}

// ============================================
// 4. SISTEMA DE JUROS E POUPANÇA
// ============================================

/**
 * Depositar em poupança (com juros)
 */
async function depositToSavings(guildId, userId, amount) {
  if (amount <= 0) {
    return { success: false, error: 'Valor deve ser maior que zero' };
  }

  const account = await getBankAccount(guildId, userId);

  if (account.bank < amount) {
    return {
      success: false,
      error: `Saldo insuficiente! Você tem ${account.bank}`,
      balance: account.bank
    };
  }

  account.bank -= amount;
  account.savings += amount;

  account.transactionHistory.push({
    type: 'savings_deposit',
    amount,
    timestamp: Date.now(),
    description: 'Depósito em poupança',
    balance: account.savings
  });

  await saveBankAccount(guildId, userId, account);

  return {
    success: true,
    savingsBalance: account.savings,
    bankBalance: account.bank,
    message: 'Depósito em poupança realizado!'
  };
}

/**
 * Sacar da poupança
 */
async function withdrawFromSavings(guildId, userId, amount) {
  if (amount <= 0) {
    return { success: false, error: 'Valor deve ser maior que zero' };
  }

  const account = await getBankAccount(guildId, userId);

  if (account.savings < amount) {
    return {
      success: false,
      error: `Saldo insuficiente em poupança! Você tem ${account.savings}`,
      balance: account.savings
    };
  }

  account.savings -= amount;
  account.bank += amount;

  account.transactionHistory.push({
    type: 'savings_withdraw',
    amount,
    timestamp: Date.now(),
    description: 'Saque de poupança',
    balance: account.savings
  });

  await saveBankAccount(guildId, userId, account);

  return {
    success: true,
    savingsBalance: account.savings,
    bankBalance: account.bank,
    message: 'Saque de poupança realizado!'
  };
}

/**
 * Calcular juros da poupança (1% ao mês)
 */
async function calculateSavingsInterest(guildId, userId) {
  const account = await getBankAccount(guildId, userId);

  const monthlyRate = 0.01; // 1% ao mês
  const interest = Math.floor(account.savings * monthlyRate);

  if (interest > 0) {
    account.savings += interest;
    account.transactionHistory.push({
      type: 'savings_interest',
      amount: interest,
      timestamp: Date.now(),
      description: 'Juros da poupança (1% ao mês)',
      balance: account.savings
    });

    await saveBankAccount(guildId, userId, account);
  }

  return {
    interest,
    newSavingsBalance: account.savings,
    message: interest > 0 ? `Juros de ${interest} adicionados!` : 'Sem juros este mês'
  };
}

// ============================================
// 5. SISTEMA DE PERMISSÕES E CONTA
// ============================================

/**
 * Verificar se conta está ativa
 */
async function isAccountActive(guildId, userId) {
  const account = await getBankAccount(guildId, userId);
  return account.accountStatus === 'active';
}

/**
 * Bloquear/Desbloquear conta (ADMIN)
 */
async function setAccountStatus(guildId, userId, status) {
  const validStatuses = ['active', 'frozen', 'blocked'];
  if (!validStatuses.includes(status)) {
    return { success: false, error: 'Status inválido' };
  }

  const account = await getBankAccount(guildId, userId);
  const oldStatus = account.accountStatus;
  account.accountStatus = status;

  account.transactionHistory.push({
    type: 'account_status_change',
    timestamp: Date.now(),
    description: `Status da conta alterado de ${oldStatus} para ${status}`,
    amount: 0
  });

  await saveBankAccount(guildId, userId, account);

  return {
    success: true,
    oldStatus,
    newStatus: status,
    message: `Status da conta alterado para ${status}`
  };
}

/**
 * Aumentar limite da conta (ADMIN/STAFF)
 */
async function increaseBankLimit(guildId, userId, newLimit) {
  if (newLimit <= 0) {
    return { success: false, error: 'Limite deve ser maior que zero' };
  }

  const account = await getBankAccount(guildId, userId);
  const oldLimit = account.bankLimit;
  account.bankLimit = newLimit;

  account.transactionHistory.push({
    type: 'limit_increased',
    timestamp: Date.now(),
    description: `Limite aumentado de ${oldLimit} para ${newLimit}`,
    amount: 0
  });

  await saveBankAccount(guildId, userId, account);

  return {
    success: true,
    oldLimit,
    newLimit,
    message: `Limite aumentado de ${oldLimit} para ${newLimit}`
  };
}

/**
 * Resetar conta (ADMIN - Limpa tudo)
 */
async function resetAccount(guildId, userId) {
  const account = await getBankAccount(guildId, userId);
  const oldData = { ...account };

  account.wallet = 0;
  account.bank = 0;
  account.savings = 0;
  account.loans = [];
  account.transactionHistory = [];
  account.accountLevel = 1;
  account.totalLoaned = 0;

  await saveBankAccount(guildId, userId, account);

  return {
    success: true,
    oldData,
    message: 'Conta resetada com sucesso!'
  };
}

// ============================================
// 6. SISTEMA DE HISTÓRICO E ESTATÍSTICAS
// ============================================

/**
 * Obter histórico de transações
 */
async function getTransactionHistory(guildId, userId, limit = 20) {
  const account = await getBankAccount(guildId, userId);
  const history = account.transactionHistory.slice().reverse().slice(0, limit);

  return history.map(t => ({
    ...t,
    date: new Date(t.timestamp).toLocaleString('pt-BR'),
    timeAgo: getTimeAgo(t.timestamp)
  }));
}

/**
 * Obter estatísticas da conta
 */
async function getAccountStats(guildId, userId) {
  const account = await getBankAccount(guildId, userId);
  const history = account.transactionHistory;

  const deposits = history
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const withdrawals = history
    .filter(t => t.type === 'withdraw')
    .reduce((sum, t) => sum + t.amount, 0);

  const transfers = history
    .filter(t => t.type === 'transfer_sent')
    .reduce((sum, t) => sum + t.amount, 0);

  const activeLoans = account.loans.filter(l => !l.paid).length;

  return {
    totalBalance: account.wallet + account.bank + account.savings,
    wallet: account.wallet,
    bank: account.bank,
    savings: account.savings,
    bankLimit: account.bankLimit,
    accountLevel: account.accountLevel,
    accountStatus: account.accountStatus,
    stats: {
      totalDeposits: deposits,
      totalWithdrawals: withdrawals,
      totalTransferred: transfers,
      totalTransactions: history.length,
      activeLoans,
      totalLoaned: account.totalLoaned
    },
    accountAge: getTimeAgo(account.accountCreated)
  };
}

/**
 * Obter ranking (Top jogadores por saldo)
 */
async function getTopAccounts(guildId, limit = 10) {
  const allAccounts = await getAllBankAccounts(guildId);

  return allAccounts
    .map(acc => ({
      userId: acc.userId,
      totalBalance: acc.wallet + acc.bank + acc.savings,
      bank: acc.bank,
      savings: acc.savings,
      wallet: acc.wallet
    }))
    .sort((a, b) => b.totalBalance - a.totalBalance)
    .slice(0, limit);
}

// ============================================
// 7. FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Tempo atrás em formato legível
 */
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Agora há pouco';
  if (minutes < 60) return `${minutes}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 30) return `${days}d atrás`;

  return new Date(timestamp).toLocaleDateString('pt-BR');
}

/**
 * Verificar se usuário é staff/admin
 */
function isStaff(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
         member.permissions.has(PermissionsBitField.Flags.ModerateMembers);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Conta básica
  getBankAccount,
  saveBankAccount,
  getAllBankAccounts,

  // Operações principais
  deposit,
  withdraw,
  transfer,

  // Empréstimos
  requestLoan,
  payLoan,
  getLoanInfo,

  // Poupança
  depositToSavings,
  withdrawFromSavings,
  calculateSavingsInterest,

  // Permissões
  isAccountActive,
  setAccountStatus,
  increaseBankLimit,
  resetAccount,

  // Histórico e stats
  getTransactionHistory,
  getAccountStats,
  getTopAccounts,

  // Utilitários
  getTimeAgo,
  isStaff
};
