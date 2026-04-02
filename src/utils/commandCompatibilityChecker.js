/**
 * VERIFICADOR DE COMPATIBILIDADE DE COMANDOS
 * 
 * Sistema para verificar compatibilidade de comandos com o novo sistema de permissões
 * e identificar problemas de configuração
 */

const fs = require('fs');
const path = require('path');
const { checkPermission } = require('./advancedPermissionManager');

class CommandCompatibilityChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.compatibleCommands = [];
    this.incompatibleCommands = [];
  }

  /**
   * Verificar todos os comandos do sistema
   */
  async checkAllCommands(client, guildId) {
    this.issues = [];
    this.warnings = [];
    this.compatibleCommands = [];
    this.incompatibleCommands = [];

    try {
      // Obter todos os comandos do cliente
      const commands = Array.from(client.slashCommands.values());
      
      console.log(`[COMPATIBILITY] Verificando ${commands.length} comandos...`);

      for (const command of commands) {
        await this.checkCommand(command, guildId);
      }

      // Verificar arquivos de comandos
      await this.checkCommandFiles();

      // Gerar relatório
      return this.generateReport();

    } catch (error) {
      console.error('[COMPATIBILITY] Erro na verificação:', error);
      return {
        success: false,
        error: error.message,
        issues: this.issues,
        warnings: this.warnings
      };
    }
  }

  /**
   * Verificar comando individual
   */
  async checkCommand(command, guildId) {
    const result = {
      name: command.data?.name || 'unknown',
      category: command.category || 'misc',
      compatible: true,
      issues: [],
      warnings: []
    };

    try {
      // 1. Verificar estrutura básica
      if (!command.data?.name) {
        result.issues.push('Comando sem nome definido');
        result.compatible = false;
      }

      if (!command.data?.description) {
        result.warnings.push('Comando sem descrição');
      }

      // 2. Verificar função execute
      if (typeof command.execute !== 'function') {
        result.issues.push('Comando sem função execute');
        result.compatible = false;
      }

      // 3. Verificar permissões padrão
      if (command.data?.defaultMemberPermissions) {
        result.warnings.push('Usa defaultMemberPermissions (pode conflitar com novo sistema)');
      }

      // 4. Verificar se está na whitelist de permissões
      const testMember = {
        id: '123456789012345678', // ID de teste
        permissions: {
          has: (perm) => false // Sem permissões para teste
        },
        roles: {
          cache: new Map()
        }
      };

      // Testar permissão com usuário sem privilégios
      const permCheck = checkPermission(testMember, guildId, command.data?.name, 'command');
      
      if (!permCheck.allowed && permCheck.reason === 'Sem restrição') {
        result.compatible = true;
      } else if (!permCheck.allowed) {
        result.warnings.push('Comando pode ser bloqueado por padrão');
      }

      // 5. Verificar dependências
      if (command.requires) {
        for (const dependency of command.requires) {
          if (!this.checkDependency(dependency)) {
            result.issues.push(`Dependência não encontrada: ${dependency}`);
            result.compatible = false;
          }
        }
      }

      // 6. Verificar cooldown
      if (command.cooldown && typeof command.cooldown !== 'number') {
        result.warnings.push('Cooldown deve ser um número');
      }

    } catch (error) {
      result.issues.push(`Erro na verificação: ${error.message}`);
      result.compatible = false;
    }

    // Adicionar às listas apropriadas
    if (result.compatible) {
      this.compatibleCommands.push(result);
    } else {
      this.incompatibleCommands.push(result);
    }

    // Adicionar issues e warnings globais
    this.issues.push(...result.issues.map(issue => ({ command: result.name, issue })));
    this.warnings.push(...result.warnings.map(warning => ({ command: result.name, warning })));

    return result;
  }

  /**
   * Verificar arquivos de comandos
   */
  async checkCommandFiles() {
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
      this.issues.push({ command: 'system', issue: 'Pasta de comandos não encontrada' });
      return;
    }

    // Verificar estrutura de pastas
    const categories = fs.readdirSync(commandsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`[COMPATIBILITY] Categorias encontradas: ${categories.join(', ')}`);

    // Verificar cada categoria
    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);
      const files = fs.readdirSync(categoryPath);

      for (const file of files) {
        if (file.endsWith('.js')) {
          await this.checkCommandFile(path.join(categoryPath, file), category);
        }
      }
    }
  }

  /**
   * Verificar arquivo de comando individual
   */
  async checkCommandFile(filePath, category) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath, '.js');

      // Verificar se exporta module.exports
      if (!content.includes('module.exports')) {
        this.warnings.push({ 
          command: fileName, 
          warning: 'Arquivo não exporta module.exports' 
        });
      }

      // Verificar se tem SlashCommandBuilder
      if (!content.includes('SlashCommandBuilder')) {
        this.warnings.push({ 
          command: fileName, 
          warning: 'Pode não usar SlashCommandBuilder' 
        });
      }

      // Verificar se tem função execute
      if (!content.includes('execute:')) {
        this.issues.push({ 
          command: fileName, 
          issue: 'Não encontrada função execute' 
        });
      }

      // Verificar problemas comuns
      if (content.includes('interaction.member.permissions.has')) {
        this.warnings.push({ 
          command: fileName, 
          warning: 'Usa verificação de permissões legada' 
        });
      }

    } catch (error) {
      this.issues.push({ 
        command: path.basename(filePath, '.js'), 
        issue: `Erro ao ler arquivo: ${error.message}` 
      });
    }
  }

  /**
   * Verificar dependência
   */
  checkDependency(dependency) {
    try {
      switch (dependency) {
        case 'discord.js':
          require('discord.js');
          return true;
        case 'fs':
          require('fs');
          return true;
        case 'path':
          require('path');
          return true;
        default:
          // Tentar carregar módulo local
          const modulePath = path.join(__dirname, '../', dependency);
          return fs.existsSync(modulePath);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Gerar relatório completo
   */
  generateReport() {
    const totalCommands = this.compatibleCommands.length + this.incompatibleCommands.length;
    const compatibilityRate = totalCommands > 0 ? 
      (this.compatibleCommands.length / totalCommands * 100).toFixed(1) : 0;

    const report = {
      success: this.incompatibleCommands.length === 0,
      summary: {
        total: totalCommands,
        compatible: this.compatibleCommands.length,
        incompatible: this.incompatibleCommands.length,
        compatibilityRate: `${compatibilityRate}%`,
        issues: this.issues.length,
        warnings: this.warnings.length
      },
      compatibleCommands: this.compatibleCommands,
      incompatibleCommands: this.incompatibleCommands,
      issues: this.issues,
      warnings: this.warnings,
      recommendations: this.generateRecommendations()
    };

    // Log no console
    console.log(`[COMPATIBILITY] Relatório gerado:`);
    console.log(`- Total: ${report.summary.total}`);
    console.log(`- Compatíveis: ${report.summary.compatible}`);
    console.log(`- Incompatíveis: ${report.summary.incompatible}`);
    console.log(`- Taxa de compatibilidade: ${report.summary.compatibilityRate}`);
    console.log(`- Issues: ${report.summary.issues}`);
    console.log(`- Warnings: ${report.summary.warnings}`);

    return report;
  }

  /**
   * Gerar recomendações
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.incompatibleCommands.length > 0) {
      recommendations.push({
        type: 'critical',
        title: 'Comandos Incompatíveis',
        description: `${this.incompatibleCommands.length} comandos precisam de correção para funcionar com o novo sistema.`,
        actions: [
          'Verifique os comandos listados na seção "incompatibleCommands"',
          'Corrija as issues identificadas',
          'Teste cada comando após as correções'
        ]
      });
    }

    if (this.issues.some(issue => issue.issue.includes('permissão'))) {
      recommendations.push({
        type: 'warning',
        title: 'Problemas de Permissão',
        description: 'Alguns comandos podem ter problemas com o sistema de permissões.',
        actions: [
          'Revise a verificação de permissões nos comandos',
          'Use o novo sistema de permissões em vez de verificações manuais',
          'Configure permissões adequadas no painel administrativo'
        ]
      });
    }

    if (this.warnings.length > 5) {
      recommendations.push({
        type: 'info',
        title: 'Avisos de Melhoria',
        description: 'Foram encontrados vários avisos que podem melhorar a qualidade dos comandos.',
        actions: [
          'Revise os warnings para melhorar os comandos',
          'Adicione descrições em todos os comandos',
          'Padronize a estrutura dos comandos'
        ]
      });
    }

    if (this.compatibleCommands.length === 0) {
      recommendations.push({
        type: 'critical',
        title: 'Nenhum Comando Compatível',
        description: 'Nenhum comando passou na verificação de compatibilidade.',
        actions: [
          'Verifique a estrutura dos arquivos de comandos',
          'Certifique-se de que todos os comandos exportam module.exports corretamente',
          'Verifique se o cliente está carregando os comandos corretamente'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Gerar embed para Discord
   */
  generateEmbed() {
    const { EmbedBuilder } = require('discord.js');
    const report = this.generateReport();

    const embed = new EmbedBuilder()
      .setColor(report.success ? '#00ff00' : '#ffaa00')
      .setTitle('🔍 Relatório de Compatibilidade de Comandos')
      .setDescription('Verificação de compatibilidade com o novo sistema de permissões')
      .addFields(
        { 
          name: '📊 Resumo', 
          value: `**Total:** ${report.summary.total}\n**✅ Compatíveis:** ${report.summary.compatible}\n**❌ Incompatíveis:** ${report.summary.incompatible}\n**📈 Taxa:** ${report.summary.compatibilityRate}`, 
          inline: true 
        },
        { 
          name: '⚠️ Problemas', 
          value: `**Issues:** ${report.summary.issues}\n**Warnings:** ${report.summary.warnings}`, 
          inline: true 
        }
      )
      .setTimestamp();

    // Adicionar comandos incompatíveis se houver
    if (report.incompatibleCommands.length > 0) {
      const incompatibleList = report.incompatibleCommands
        .slice(0, 10)
        .map(cmd => `• **${cmd.name}**: ${cmd.issues.join(', ')}`)
        .join('\n');

      embed.addFields({
        name: '❌ Comandos Incompatíveis',
        value: incompatibleList + (report.incompatibleCommands.length > 10 ? '\n... e mais' : ''),
        inline: false
      });
    }

    // Adicionar recomendações
    if (report.recommendations.length > 0) {
      const recommendations = report.recommendations
        .slice(0, 3)
        .map(rec => `**${rec.title}:** ${rec.description}`)
        .join('\n\n');

      embed.addFields({
        name: '💡 Recomendações',
        value: recommendations,
        inline: false
      });
    }

    embed.setFooter({ 
      text: `Status: ${report.success ? '✅ Sucesso' : '⚠️ Atenção necessária'}` 
    });

    return embed;
  }
}

// Instância global
const compatibilityChecker = new CommandCompatibilityChecker();

module.exports = {
  compatibilityChecker,
  checkAllCommands: (client, guildId) => compatibilityChecker.checkAllCommands(client, guildId),
  generateEmbed: () => compatibilityChecker.generateEmbed(),
  instance: compatibilityChecker
};
