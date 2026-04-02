require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Enhanced configuration
const DEPLOY_TYPE = process.argv[2]?.toLowerCase() || process.env.DEPLOY_TYPE || 'guild';
const COMMANDS_DIR = path.join(__dirname, 'commands');
const JSON_DIRS = [
    path.join(__dirname, 'json'),
    path.join(__dirname, 'json', 'companies'),
    path.join(__dirname, 'json', 'events'),
    path.join(__dirname, 'json', 'legal'),
    path.join(__dirname, 'json', 'market')
];

// Enhanced validation system
function validateEnvironment() {
    console.log(`[DEPLOY] Modo de deploy selecionado: ${DEPLOY_TYPE.toUpperCase()}`);
    
    const requiredEnvs = ['DISCORD_TOKEN', 'CLIENT_ID'];
    if (DEPLOY_TYPE === 'guild' || DEPLOY_TYPE === 'both') {
        requiredEnvs.push('GUILD_ID');
    }

    const missing = [];
    for (const env of requiredEnvs) {
        if (!process.env[env]) {
            missing.push(env);
        }
    }

    if (missing.length > 0) {
        console.error(`❌ [ERRO] Variáveis de ambiente obrigatórias não encontradas:`);
        missing.forEach(env => console.error(`   - ${env}`));
        console.error('\n💡 Verifique seu arquivo .env');
        process.exit(1);
    }

    console.log('✅ [OK] Variáveis de ambiente validadas');
    return true;
}

// Enhanced command loader with validation
function loadCommands() {
    const commands = [];
    
    if (!fs.existsSync(COMMANDS_DIR)) {
        console.error(`❌ [ERRO] Diretório de comandos não encontrado: ${COMMANDS_DIR}`);
        process.exit(1);
    }

    const walk = (dir) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                walk(fullPath);
                continue;
            }
            
            if (!item.name.endsWith('.js')) continue;
            
            try {
                const command = require(fullPath);
                
                // Validate slash command structure
                if (!command.data) {
                    console.warn(`⚠️ [AVISO] Comando ${item.name} não tem 'data'`);
                    continue;
                }
                
                if (!command.execute) {
                    console.warn(`⚠️ [AVISO] Comando ${command.data.name} não tem 'execute'`);
                    continue;
                }
                
                // Validate command data
                if (!command.data.name) {
                    console.warn(`⚠️ [AVISO] Comando ${item.name} não tem nome definido`);
                    continue;
                }
                
                if (!command.data.description) {
                    console.warn(`⚠️ [AVISO] Comando ${command.data.name} não tem descrição`);
                    continue;
                }
                
                // Convert to JSON and validate
                const commandJSON = command.data.toJSON();
                
                // Check for required fields
                if (!commandJSON.name || !commandJSON.description) {
                    console.warn(`⚠️ [AVISO] Comando ${item.name} tem dados inválidos`);
                    continue;
                }
                
                commands.push(commandJSON);
                console.log(`✅ [OK] Comando carregado: ${commandJSON.name}`);
                
            } catch (error) {
                console.error(`❌ [ERRO] Falha ao carregar comando ${item.name}:`, error.message);
            }
        }
    };
    
    walk(COMMANDS_DIR);
    
    if (commands.length === 0) {
        console.warn('⚠️ [AVISO] Nenhum comando válido encontrado para deploy');
        return [];
    }
    
    console.log(`📦 [INFO] ${commands.length} comando(s) carregado(s) com sucesso`);
    return commands;
}

// Enhanced deploy function with better error handling
async function deploy(commands) {
    if (commands.length === 0) {
        console.warn('⚠️ [AVISO] Nenhum comando para registrar.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const { CLIENT_ID, GUILD_ID } = process.env;
    
    const targets = [];
    if (DEPLOY_TYPE === 'global' || DEPLOY_TYPE === 'both') {
        targets.push({ 
            route: Routes.applicationCommands(CLIENT_ID), 
            name: 'GLOBAL' 
        });
    }
    if (DEPLOY_TYPE === 'guild' || DEPLOY_TYPE === 'both') {
        targets.push({ 
            route: Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), 
            name: 'GUILD' 
        });
    }

    console.log(`🚀 [DEPLOY] Iniciando deploy para: ${targets.map(t => t.name).join(', ')}`);
    console.log(`📊 [INFO] Total de comandos: ${commands.length}`);

    for (const target of targets) {
        try {
            console.log(`📤 [DEPLOY] Enviando comandos para ${target.name}...`);
            
            const startTime = Date.now();
            const data = await rest.put(target.route, { body: commands });
            const endTime = Date.now();
            
            console.log(`✅ [SUCESSO] ${target.name}: ${data.length} comandos registrados em ${endTime - startTime}ms`);
            
            // Show command summary
            if (data.length > 0) {
                console.log(`📋 [INFO] Comandos registrados em ${target.name}:`);
                data.forEach(cmd => {
                    console.log(`   - /${cmd.name} (${cmd.options?.length || 0} opções)`);
                });
            }
            
        } catch (error) {
            console.error(`❌ [ERRO] Falha no deploy ${target.name}:`, error.message);
            
            // Show detailed error information
            if (error.code) {
                console.error(`🔍 [DEBUG] Código do erro: ${error.code}`);
            }
            
            if (error.status) {
                console.error(`🔍 [DEBUG] Status HTTP: ${error.status}`);
            }
            
            // Don't exit on guild error if we have other targets
            if (targets.length === 1) {
                process.exit(1);
            }
        }
    }
}

// JSON directory updater
function updateJSONDirectories() {
    console.log('📁 [INFO] Verificando diretórios JSON...');
    
    for (const dir of JSON_DIRS) {
        if (!fs.existsSync(dir)) {
            console.log(`📁 [INFO] Criando diretório: ${dir}`);
            fs.mkdirSync(dir, { recursive: true });
        } else {
            console.log(`✅ [OK] Diretório existe: ${dir}`);
        }
    }
}

// Enhanced main function
async function main() {
    const startTime = Date.now();
    
    try {
        console.log('🚀 [DEPLOY] Sistema de Deploy v2.0 - Enhanced');
        console.log('='.repeat(50));
        
        // Validate environment
        validateEnvironment();
        
        // Update directories
        updateJSONDirectories();
        
        // Load commands
        const commands = loadCommands();
        
        if (commands.length > 0) {
            // Deploy commands
            await deploy(commands);
            
            const totalTime = Date.now() - startTime;
            console.log('='.repeat(50));
            console.log(`🎉 [SUCESSO] Deploy concluído em ${totalTime}ms`);
            console.log(`📊 [INFO] ${commands.length} comando(s) deployado(s) com sucesso`);
            
            if (DEPLOY_TYPE === 'global') {
                console.log('⏰ [INFO] Comandos globais podem levar até 1 hora para aparecer em todos os servidores');
            } else {
                console.log('⚡ [INFO] Comandos de guild aparecem instantaneamente');
            }
            
            // Exit successfully
            process.exit(0);
        } else {
            console.log('⚠️ [AVISO] Nenhum comando para fazer deploy');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('❌ [ERRO CRÍTICO] Falha no processo de deploy:', error);
        process.exit(1);
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 [INFO] Deploy interrompido pelo usuário');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 [INFO] Deploy terminado');
    process.exit(0);
});

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🚀 Deploy Script v2.0 - Enhanced

Uso:
  node deploy.js [tipo] [opções]

Tipos:
  guild     - Deploy para servidor específico (padrão)
  global    - Deploy para todos os servidores
  both      - Deploy para ambos

Variáveis de Ambiente Necessárias:
  DISCORD_TOKEN    - Token do bot
  CLIENT_ID        - ID do cliente do bot
  GUILD_ID         - ID do servidor (para deploy guild)

Exemplos:
  node deploy.js guild
  node deploy.js global
  DEPLOY_TYPE=global node deploy.js

Opções:
  --help, -h      - Mostra esta ajuda
    `);
    process.exit(0);
}

// Run main function
main().catch(error => {
    console.error('❌ [ERRO FATAL] Erro não tratado:', error);
    process.exit(1);
});
