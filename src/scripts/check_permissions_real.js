const fs = require('fs');
const path = require('path');

// Função para verificar restrições reais dos comandos
function verificarRestricoesReais() {
  const commandsPath = path.join(__dirname, '../commands');
  const results = [];
  
  function scanDirectory(dir, category = '') {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        scanDirectory(fullPath, item.name);
      } else if (item.name.endsWith('.js')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const fileName = path.basename(item.name, '.js');
          
          // Extrair nome do comando
          const nameMatch = content.match(/setName\(['"`]([^'"`]+)['"`]\)/);
          const commandName = nameMatch ? nameMatch[1] : fileName;
          
          // Verificar se tem module.exports e execute
          const hasModuleExports = content.includes('module.exports');
          const hasExecute = content.includes('async execute');
          
          // Verificar restrições
          const restrictions = [];
          
          // 1. defaultMemberPermissions
          if (content.includes('defaultMemberPermissions')) {
            const permMatch = content.match(/defaultMemberPermissions\(([^)]+)\)/);
            if (permMatch) {
              restrictions.push(`defaultMemberPermissions(${permMatch[1]})`);
            } else {
              restrictions.push('defaultMemberPermissions');
            }
          }
          
          // 2. Verificações manuais de permissão
          if (content.includes('interaction.member.permissions.has')) {
            const permMatches = content.match(/interaction\.member\.permissions\.has\([^)]+\)/g);
            if (permMatches) {
              restrictions.push(...permMatches);
            }
          }
          
          if (content.includes('member.permissions.has')) {
            const permMatches = content.match(/member\.permissions\.has\([^)]+\)/g);
            if (permMatches) {
              restrictions.push(...permMatches);
            }
          }
          
          // 3. Verificações de cargo específico
          if (content.includes('hasRole') || content.includes('roles.cache.has')) {
            const roleMatches = content.match(/(hasRole|roles\.cache\.has)\([^)]+\)/g);
            if (roleMatches) {
              restrictions.push(...roleMatches);
            }
          }
          
          // 4. Verificações de ID de usuário
          if (content.includes('interaction.user.id') && content.includes('===') || 
              content.includes('allowedUsers') || content.includes('ownerId')) {
            restrictions.push('Verificação de usuário específico');
          }
          
          // 5. Verificar se é comando de admin (baseado no nome e categoria)
          const adminCommands = ['ban', 'kick', 'mute', 'unmute', 'warn', 'nuke', 'reload', 'eval', 'clear'];
          const adminCategories = ['admin'];
          const isAdminCommand = adminCommands.includes(commandName) || adminCategories.includes(category);
          
          if (isAdminCommand) {
            restrictions.push('Comando de administrador (pelo nome/categoria)');
          }
          
          results.push({
            category,
            fileName,
            commandName,
            hasModuleExports,
            hasExecute,
            restrictions,
            isRestricted: restrictions.length > 0,
            isAdminCommand,
            path: fullPath
          });
        } catch (error) {
          results.push({
            category,
            fileName: path.basename(item.name, '.js'),
            error: error.message,
            path: fullPath
          });
        }
      }
    }
  }
  
  scanDirectory(commandsPath);
  return results;
}

const results = verificarRestricoesReais();

console.log('=== ANÁLISE DE RESTRIÇÕES DE COMANDOS ===');
console.log('Total de arquivos:', results.length);

let workingCommands = [];
let restrictedCommands = [];
let freeCommands = [];
let errorCommands = [];

results.forEach(cmd => {
  if (cmd.error) {
    console.log(`❌ ERRO: ${cmd.fileName} - ${cmd.error}`);
    errorCommands.push(cmd);
  } else if (!cmd.hasModuleExports || !cmd.hasExecute) {
    console.log(`⚠️ PROBLEMA ESTRUTURAL: ${cmd.fileName} - ${!cmd.hasModuleExports ? 'Sem module.exports' : ''}${!cmd.hasExecute ? 'Sem execute' : ''}`);
    errorCommands.push(cmd);
  } else if (cmd.isRestricted) {
    console.log(`🔒 RESTRITO: ${cmd.commandName} - ${cmd.restrictions.join(', ')}`);
    restrictedCommands.push(cmd);
  } else {
    console.log(`✅ LIVRE: ${cmd.commandName} (${cmd.category})`);
    freeCommands.push(cmd);
  }
});

console.log('\n=== RESUMO ===');
console.log('Comandos com erro:', errorCommands.length);
console.log('Comandos funcionais:', workingCommands.length + restrictedCommands.length + freeCommands.length);
console.log('Comandos com restrições:', restrictedCommands.length);
console.log('Comandos livres para todos:', freeCommands.length);

console.log('\n=== COMANDOS LIVRES PARA TODOS MEMBROS ===');
freeCommands.forEach(cmd => {
  console.log(`✅ ${cmd.commandName} - Categoria: ${cmd.category}`);
});

console.log('\n=== COMANDOS COM RESTRIÇÕES ===');
restrictedCommands.forEach(cmd => {
  console.log(`🔒 ${cmd.commandName} - Categoria: ${cmd.category}`);
  console.log(`   Motivos: ${cmd.restrictions.join(', ')}`);
});

console.log('\n=== COMANDOS DE ADMINISTRADOR ===');
restrictedCommands.filter(cmd => cmd.isAdminCommand).forEach(cmd => {
  console.log(`👑 ${cmd.commandName} - Categoria: ${cmd.category}`);
  console.log(`   Motivos: ${cmd.restrictions.join(', ')}`);
});

console.log('\n=== RECOMENDAÇÕES ===');
if (freeCommands.length > 0) {
  console.log('✅ COMANDOS JÁ ESTÃO LIVRES PARA TODOS:');
  console.log('Estes comandos aparecerão para todos os membros sem restrições.');
} else {
  console.log('⚠️ ATENÇÃO: Nenhum comando encontrado livre para todos os membros.');
  console.log('Todos os comandos têm alguma restrição que pode bloquear acesso.');
}

if (restrictedCommands.length > 0) {
  console.log('\n🔒 COMANDOS QUE PRECISAM DE ATENÇÃO:');
  console.log('Estes comandos têm restrições que podem bloquear acesso de membros normais.');
  console.log('Use o novo sistema de permissões para gerenciar quem pode usar cada comando.');
}
