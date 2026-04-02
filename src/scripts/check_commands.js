const fs = require('fs');
const path = require('path');

// Função para verificar comandos
function verificarComandos() {
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
          
          // Verificar se tem module.exports
          const hasModuleExports = content.includes('module.exports');
          
          // Verificar se tem SlashCommandBuilder
          const hasSlashCommandBuilder = content.includes('SlashCommandBuilder');
          
          // Verificar se tem função execute
          const hasExecute = content.includes('execute:') || content.includes('async execute');
          
          // Verificar se tem defaultMemberPermissions
          const hasDefaultPermissions = content.includes('defaultMemberPermissions');
          
          // Verificar se tem verificações de permissão manuais
          const hasManualPermissions = content.includes('interaction.member.permissions.has') || 
                                       content.includes('member.permissions.has');
          
          // Extrair nome do comando se possível
          const nameMatch = content.match(/setName\(['"`]([^'"`]+)['"`]\)/);
          const commandName = nameMatch ? nameMatch[1] : fileName;
          
          results.push({
            category,
            fileName,
            commandName,
            hasModuleExports,
            hasSlashCommandBuilder,
            hasExecute,
            hasDefaultPermissions,
            hasManualPermissions,
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

const results = verificarComandos();

console.log('=== ANÁLISE DE COMANDOS ===');
console.log('Total de arquivos:', results.length);

let problematicCommands = [];
let normalCommands = [];

results.forEach(cmd => {
  if (cmd.error) {
    console.log(`❌ ERRO: ${cmd.fileName} - ${cmd.error}`);
    problematicCommands.push(cmd);
  } else {
    const issues = [];
    if (!cmd.hasModuleExports) issues.push('Sem module.exports');
    if (!cmd.hasSlashCommandBuilder) issues.push('Sem SlashCommandBuilder');
    if (!cmd.hasExecute) issues.push('Sem função execute');
    
    if (issues.length > 0) {
      console.log(`⚠️ PROBLEMA: ${cmd.fileName} - ${issues.join(', ')}`);
      problematicCommands.push({...cmd, issues});
    } else {
      const restrictions = [];
      if (cmd.hasDefaultPermissions) restrictions.push('defaultMemberPermissions');
      if (cmd.hasManualPermissions) restrictions.push('Verificação manual de permissões');
      
      if (restrictions.length > 0) {
        console.log(`🔒 RESTRITO: ${cmd.commandName} - ${restrictions.join(', ')}`);
        normalCommands.push({...cmd, restrictions, isRestricted: true});
      } else {
        console.log(`✅ LIVRE: ${cmd.commandName}`);
        normalCommands.push({...cmd, restrictions: [], isRestricted: false});
      }
    }
  }
});

console.log('\n=== RESUMO ===');
console.log('Comandos com problemas estruturais:', problematicCommands.length);
console.log('Comandos funcionais:', normalCommands.length);
console.log('Comandos com restrições:', normalCommands.filter(c => c.isRestricted).length);
console.log('Comandos livres para todos:', normalCommands.filter(c => !c.isRestricted).length);

console.log('\n=== COMANDOS LIVRES PARA TODOS ===');
normalCommands.filter(c => !c.isRestricted).forEach(cmd => {
  console.log(`✅ ${cmd.commandName} (${cmd.category}/${cmd.fileName})`);
});

console.log('\n=== COMANDOS COM RESTRIÇÕES ===');
normalCommands.filter(c => c.isRestricted).forEach(cmd => {
  console.log(`🔒 ${cmd.commandName} - ${cmd.restrictions.join(', ')} (${cmd.category}/${cmd.fileName})`);
});

console.log('\n=== COMANDOS COM PROBLEMAS ESTRUTURAIS ===');
problematicCommands.forEach(cmd => {
  if (cmd.issues) {
    console.log(`⚠️ ${cmd.fileName}: ${cmd.issues.join(', ')}`);
  } else if (cmd.error) {
    console.log(`❌ ${cmd.fileName}: ${cmd.error}`);
  }
});
