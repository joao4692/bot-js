const fs = require('fs');
const path = require('path');

// Função para atualizar todos os caminhos de json/ para o novo local
function atualizarCaminhosJson() {
  const srcDir = path.join(__dirname, '../src');
  const results = [];
  
  function scanDirectory(dir, relativePath = '') {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const itemRelativePath = path.join(relativePath, item.name);
      
      if (item.isDirectory()) {
        scanDirectory(fullPath, itemRelativePath);
      } else if (item.name.endsWith('.js')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const fileName = path.basename(item.name, '.js');
          
          // Verificar se tem referência a ../../json/
          if (content.includes('../../json/')) {
            // Calcular novo caminho
            const currentDepth = relativePath.split('/').length;
            let newPath = '';
            
            for (let i = 0; i < currentDepth - 1; i++) {
              newPath += '../';
            }
            newPath += 'json/';
            
            results.push({
              file: itemRelativePath,
              fileName,
              oldPath: '../../json/',
              newPath: newPath,
              fullPath
            });
          }
        } catch (error) {
          console.error(`Erro ao ler ${fullPath}:`, error);
        }
      }
    }
  }
  
  scanDirectory(srcDir);
  return results;
}

// Função para atualizar um arquivo
function updateFile(filePath, oldPath, newPath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const updatedContent = content.replace(new RegExp(oldPath.replace(/[.*?]/g, '\\$&'), 'g'), newPath);
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Atualizado: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${filePath}:`, error);
    return false;
  }
}

// Executar atualização
console.log('🔧 Atualizando caminhos de arquivos JSON...');
console.log('');

const filesToUpdate = atualizarCaminhosJson();

if (filesToUpdate.length === 0) {
  console.log('✅ Nenhum arquivo precisa de atualização!');
  console.log('Todos os caminhos já estão corretos.');
} else {
  console.log(`📁 Encontrados ${filesToUpdate.length} arquivos para atualizar:`);
  console.log('');
  
  filesToUpdate.forEach(file => {
    console.log(`📄 ${file.file}`);
    console.log(`   Antigo: ${file.oldPath}`);
    console.log(`   Novo:   ${file.newPath}`);
    console.log('');
  });
  
  console.log('🔄 Aplicando atualizações...');
  console.log('');
  
  let successCount = 0;
  let errorCount = 0;
  
  filesToUpdate.forEach(file => {
    if (updateFile(file.fullPath, file.oldPath, file.newPath)) {
      successCount++;
    } else {
      errorCount++;
    }
  });
  
  console.log('');
  console.log('📊 Resultado:');
  console.log(`✅ Atualizados: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log('');
    console.log('🎉 Todos os arquivos foram atualizados com sucesso!');
    console.log('📁 A pasta json/ agora está dentro de src/');
  }
}

module.exports = { atualizarCaminhosJson };
