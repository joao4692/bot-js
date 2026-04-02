require('dotenv').config();
const colors = require('colors');
const BotClient = require('./client');
const { performance } = require('perf_hooks');

// Inicialização
const client = new BotClient();
const startTime = performance.now();

// Configuração centralizada
client.config = require('./config/config.js');
client.env = process.env.NODE_ENV || 'production';
client.startTime = Date.now();

// Sistema de logs melhorado
const setupErrorHandling = () => {
  // Unhandled Rejections
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason.stack : String(reason);
    client.log('ERROR', `Unhandled Rejection: ${error}`);
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Uncaught Exceptions
  process.on('uncaughtException', (error) => {
    client.log('ERROR', `Uncaught Exception: ${error.message}`);
    console.error('Uncaught Exception:', error);
    
    // Graceful shutdown
    setTimeout(() => {
      client.log('WARN', 'Fazendo graceful shutdown...');
      process.exit(1);
    }, 5000);
  });

  // Warning handler
  process.on('warning', (warning) => {
    if (client.env === 'development') {
      client.log('WARN', `Warning: ${warning.name} - ${warning.message}`);
    }
  });
};

// Sistema de monitoramento de saúde
const setupHealthMonitoring = () => {
  const printHealth = () => {
    const used = process.memoryUsage();
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();
    
    const healthData = {
      memory: {
        rss: `${(used.rss / 1024 / 1024).toFixed(1)}MB`,
        heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(1)}MB`,
        heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(1)}MB`,
        external: `${(used.external / 1024 / 1024).toFixed(1)}MB`
      },
      uptime: {
        seconds: Math.floor(uptime),
        formatted: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`
      },
      process: {
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
      },
      performance: {
        cpuUser: cpuUsage.user,
        cpuSystem: cpuUsage.system
      }
    };

    client.log('INFO', `Health Check: RAM ${healthData.memory.rss} | Uptime ${healthData.uptime.formatted} | PID ${healthData.process.pid}`);
    
    // Alertas de memória
    if (used.heapUsed > 500 * 1024 * 1024) { // 500MB
      client.log('WARN', `Alta memória detectada: ${healthData.memory.heapUsed}`);
    }
  };

  // Health check a cada 5 minutos
  setInterval(printHealth, 1000 * 60 * 5);
  
  // Primeiro health check após 30 segundos
  setTimeout(printHealth, 30000);
  
  return printHealth;
};

// CLI interna melhorada
const setupCLI = () => {
  if (!process.stdin.isTTY) return;

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (input) => {
    const cmd = input.trim().toLowerCase();
    
    try {
      switch (cmd) {
        case 'reload commands':
        case 'rc':
          await client.loadCommands();
          client.log('SUCCESS', 'Comandos recarregados!');
          break;
          
        case 'reload events':
        case 're':
          await client.loadEvents();
          client.log('SUCCESS', 'Eventos recarregados!');
          break;
          
        case 'reload all':
        case 'ra':
          await client.loadCommands();
          await client.loadEvents();
          client.log('SUCCESS', 'Comandos e eventos recarregados!');
          break;
          
        case 'stats':
        case 'health':
          const health = setupHealthMonitoring();
          health();
          break;
          
        case 'uptime':
          const uptime = process.uptime();
          client.log('INFO', `Uptime: ${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`);
          break;
          
        case 'guilds':
          client.log('INFO', `Servidores: ${client.guilds.cache.size}`);
          break;
          
        case 'users':
          const users = client.users.cache.size;
          client.log('INFO', `Usuários: ${users}`);
          break;
          
        case 'help':
          client.log('INFO', 'Comandos CLI: reload commands (rc), reload events (re), reload all (ra), stats, uptime, guilds, users, help, shutdown');
          break;
          
        case 'shutdown':
        case 'exit':
          client.log('WARN', 'Desligando o bot...');
          await client.destroy();
          process.exit(0);
          break;
          
        default:
          if (cmd) {
            client.log('INFO', `Comando CLI desconhecido: ${cmd}. Digite "help" para ver os comandos.`);
          }
      }
    } catch (error) {
      client.log('ERROR', `Erro no comando CLI '${cmd}': ${error.message}`);
    }
  });

  // Mensagem de boas-vindas
  setTimeout(() => {
    client.log('INFO', 'CLI interna ativa. Digite "help" para ver comandos disponíveis.');
  }, 2000);
};

// Sistema de modules
const loadModules = () => {
  // Dashboard web
  try {
    require('./dashboard/server');
    client.log('SUCCESS', 'Dashboard web inicializada na porta ' + (process.env.DASHBOARD_PORT || 3001));
  } catch (error) {
    client.log('WARN', 'Dashboard web não encontrada ou falhou ao iniciar: ' + error.message);
  }

  // Sharding
  if (process.env.SHARDING === 'true') {
    try {
      require('./shards/shardManager');
      client.log('SUCCESS', 'ShardingManager pronto.');
    } catch (error) {
      client.log('WARN', 'ShardingManager não encontrado. Rodando em modo standalone.');
    }
  }

  // Plugins
  try {
    if (client.loadPlugins) {
      client.loadPlugins();
      client.log('SUCCESS', 'Sistema de plugins carregado.');
    }
  } catch (error) {
    client.log('WARN', 'Erro ao carregar plugins: ' + error.message);
  }
};

// Sistema de inicialização
const initializeBot = async () => {
  try {
    console.clear();
    
    // Banner de inicialização
    console.log(`${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║                                                              ║
║                    🚀 BOT INITIALIZER v2.0               ║
║                                                              ║
║                 ${colors.green}Discord RP Dayz Console${colors.cyan}                    ║
║                                                              ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

    console.log(`${colors.yellow}
┌─────────────────────────────────────────────────────────────────────┐
│  🔧 CONFIGURAÇÃO DO SISTEMA                                    │
│  📊 Ambiente: ${client.env.toUpperCase().padEnd(12)}                        │
│  🔧 Node.js: ${process.version.padEnd(14)}                       │
│  💻 Plataforma: ${process.platform.padEnd(12)}                       │
│  ⏰ Início: ${new Date().toLocaleString('pt-BR').padEnd(20)}    │
└─────────────────────────────────────────────────────────────────────┘
${colors.reset}`);
    
    client.log('INFO', '🚀 Inicializando subsistemas...');
    
    // Setup error handling
    setupErrorHandling();
    
    // Setup health monitoring
    setupHealthMonitoring();
    
    // Setup CLI
    setupCLI();
    
    // Load modules
    loadModules();
    
    console.log(`${colors.green}
┌─────────────────────────────────────────────────────────────────────┐
│  🔗 CONECTANDO AO DISCORD...                                   │
└─────────────────────────────────────────────────────────────────────┘
${colors.reset}`);
    
    // Start bot
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN não encontrado no ambiente!');
    }
    
    await client.start(token);
    
    const initTime = ((performance.now() - startTime) / 1000).toFixed(2);
    
    console.log(`${colors.green}
╔════════════════════════════════════════════════════════════╗
║                                                              ║
║                    ✅ BOT INICIALIZADO!                   ║
║                                                              ║
║                 Tempo: ${initTime}s | Status: ONLINE           ║
║                                                              ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);
    
    client.log('SUCCESS', `🎉 Bot inicializado com sucesso em ${initTime}s!`);
    
  } catch (error) {
    console.log(`${colors.red}
╔════════════════════════════════════════════════════════════╗
║                                                              ║
║                    ❌ FALHA NA INICIALIZAÇÃO            ║
║                                                              ║
║                 Erro: ${error.message.padEnd(37)}        ║
║                                                              ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);
    
    client.log('ERROR', `❌ Falha na inicialização: ${error.message}`);
    console.error('Erro completo:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const setupGracefulShutdown = () => {
  const shutdown = async (signal) => {
    client.log('WARN', `Recebido sinal ${signal}, desligando graceful...`);
    
    try {
      if (client && client.destroy) {
        await client.destroy();
      }
      client.log('SUCCESS', 'Bot desligado com sucesso.');
      process.exit(0);
    } catch (error) {
      client.log('ERROR', `Erro no shutdown: ${error.message}`);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

// Inicialização
setupGracefulShutdown();
initializeBot();

module.exports = client;
