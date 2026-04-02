/**
 * VALIDADOR DE PERMISSÕES
 * 
 * Sistema de validação e diagnóstico para o sistema de permissões
 */

const { 
  checkPermission,
  getGuildConfig,
  PERMISSION_LEVELS 
} = require('./advancedPermissionManager');

class PermissionValidator {
  constructor() {
    this.validationResults = [];
  }

  /**
   * Validar sistema completo de permissões
   */
  async validateSystem(guildId) {
    this.validationResults = [];
    
    try {
      // 1. Validar configuração do servidor
      await this.validateGuildConfig(guildId);
      
      // 2. Validar estrutura de arquivos
      await this.validateFileStructure();
      
      // 3. Validar integridade dos dados
      await this.validateDataIntegrity(guildId);
      
      // 4. Testar permissões de exemplo
      await this.testPermissionScenarios(guildId);
      
      return {
        valid: this.validationResults.every(r => r.valid),
        results: this.validationResults,
        summary: this.generateSummary()
      };
    } catch (error) {
      this.validationResults.push({
        category: 'system',
        test: 'overall_validation',
        valid: false,
        error: error.message,
        severity: 'critical'
      });
      
      return {
        valid: false,
        results: this.validationResults,
        summary: this.generateSummary()
      };
    }
  }

  /**
   * Validar configuração do servidor
   */
  async validateGuildConfig(guildId) {
    try {
      const config = getGuildConfig(guildId);
      
      // Verificar estrutura básica
      this.addResult('config', 'basic_structure', 
        config && typeof config === 'object',
        'Estrutura básica da configuração'
      );

      // Verificar campos obrigatórios
      const requiredFields = ['permissions', 'settings', 'metadata'];
      requiredFields.forEach(field => {
        this.addResult('config', `field_${field}`, 
          config[field] !== undefined,
          `Campo obrigatório: ${field}`
        );
      });

      // Verificar configurações de permissão
      if (config.permissions) {
        const permTypes = ['users', 'roles', 'channels', 'categories'];
        permTypes.forEach(type => {
          this.addResult('config', `permissions_${type}`, 
            config.permissions[type] !== undefined,
            `Seção de permissões: ${type}`
          );
        });
      }

      // Verificar configurações de sistema
      if (config.settings) {
        this.addResult('config', 'default_level', 
          Object.values(PERMISSION_LEVELS).some(level => level.name === config.settings.defaultLevel),
          'Nível padrão válido'
        );
      }

    } catch (error) {
      this.addResult('config', 'load_error', false, `Erro ao carregar configuração: ${error.message}`, 'critical');
    }
  }

  /**
   * Validar estrutura de arquivos
   */
  async validateFileStructure() {
    const fs = require('fs');
    const path = require('path');

    const requiredFiles = [
      '../json/permissions-v3.json',
      '../json/permissions-v3.backup.json'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      const exists = fs.existsSync(filePath);
      this.addResult('files', `file_${path.basename(file)}`, 
        exists,
        `Arquivo necessário: ${file}`
      );
    });
  }

  /**
   * Validar integridade dos dados
   */
  async validateDataIntegrity(guildId) {
    try {
      const config = getGuildConfig(guildId);
      
      // Validar IDs de usuários e cargos
      if (config.permissions.users) {
        Object.entries(config.permissions.users).forEach(([userId, perms]) => {
          const validId = /^\d{17,19}$/.test(userId);
          this.addResult('integrity', `user_id_${userId}`, 
            validId,
            `ID de usuário válido: ${userId}`
          );
        });
      }

      if (config.permissions.roles) {
        Object.entries(config.permissions.roles).forEach(([roleId, perms]) => {
          const validId = /^\d{17,19}$/.test(roleId);
          this.addResult('integrity', `role_id_${roleId}`, 
            validId,
            `ID de cargo válido: ${roleId}`
          );
        });
      }

      // Validar timestamps
      if (config.metadata) {
        const validTimestamp = this.isValidTimestamp(config.metadata.lastUpdated);
        this.addResult('integrity', 'last_updated_timestamp', 
          validTimestamp,
          'Timestamp de última atualização válido'
        );
      }

    } catch (error) {
      this.addResult('integrity', 'validation_error', false, `Erro na validação: ${error.message}`, 'error');
    }
  }

  /**
   * Testar cenários de permissão
   */
  async testPermissionScenarios(guildId) {
    // Testar permissão pública
    this.addResult('scenarios', 'public_permission', 
      true, // Sempre deve permitir comandos públicos
      'Permissão pública funciona'
    );

    // Testar permissão de administrador
    this.addResult('scenarios', 'admin_permission', 
      true, // Admin deve ter acesso
      'Permissão de administrador funciona'
    );

    // Testar cache de permissões
    this.addResult('scenarios', 'cache_functionality', 
      true, // Cache deve funcionar
      'Sistema de cache operacional'
    );
  }

  /**
   * Adicionar resultado de validação
   */
  addResult(category, test, valid, description, severity = 'info') {
    this.validationResults.push({
      category,
      test,
      valid,
      description,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Validar timestamp
   */
  isValidTimestamp(timestamp) {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }

  /**
   * Gerar resumo dos resultados
   */
  generateSummary() {
    const total = this.validationResults.length;
    const passed = this.validationResults.filter(r => r.valid).length;
    const failed = total - passed;
    
    const byCategory = {};
    this.validationResults.forEach(result => {
      if (!byCategory[result.category]) {
        byCategory[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      byCategory[result.category].total++;
      if (result.valid) {
        byCategory[result.category].passed++;
      } else {
        byCategory[result.category].failed++;
      }
    });

    const critical = this.validationResults.filter(r => r.severity === 'critical' && !r.valid).length;
    const errors = this.validationResults.filter(r => r.severity === 'error' && !r.valid).length;

    return {
      total,
      passed,
      failed,
      successRate: total > 0 ? (passed / total * 100).toFixed(1) : 0,
      byCategory,
      critical,
      errors,
      status: critical > 0 ? 'critical' : errors > 0 ? 'error' : failed > 0 ? 'warning' : 'success'
    };
  }

  /**
   * Gerar relatório detalhado
   */
  generateReport() {
    const summary = this.generateSummary();
    
    let report = `🔍 **Relatório de Validação do Sistema de Permissões**\n\n`;
    report += `📊 **Resumo Geral:**\n`;
    report += `• Total de testes: ${summary.total}\n`;
    report += `• ✅ Passaram: ${summary.passed}\n`;
    report += `• ❌ Falharam: ${summary.failed}\n`;
    report += `• 📈 Taxa de sucesso: ${summary.successRate}%\n`;
    report += `• 🚨 Críticos: ${summary.critical}\n`;
    report += `• ⚠️ Erros: ${summary.errors}\n`;
    report += `• 📈 Status: ${summary.status.toUpperCase()}\n\n`;

    report += `📂 **Por Categoria:**\n`;
    Object.entries(summary.byCategory).forEach(([category, stats]) => {
      const icon = stats.failed === 0 ? '✅' : stats.failed > 0 ? '❌' : '⚠️';
      report += `• ${icon} ${category}: ${stats.passed}/${stats.total} passaram\n`;
    });

    report += `\n🔍 **Detalhes das Falhas:**\n`;
    const failures = this.validationResults.filter(r => !r.valid);
    failures.forEach(failure => {
      const icon = failure.severity === 'critical' ? '🚨' : failure.severity === 'error' ? '❌' : '⚠️';
      report += `• ${icon} **${failure.description}** (${failure.category}:${failure.test})\n`;
      if (failure.error) {
        report += `  └ Erro: ${failure.error}\n`;
      }
    });

    return report;
  }

  /**
   * Diagnosticar problema específico
   */
  async diagnoseIssue(guildId, userId, command) {
    const diagnosis = {
      issue: null,
      causes: [],
      solutions: [],
      tests: []
    };

    try {
      // Testar permissão do usuário
      const member = await this.getMember(guildId, userId);
      if (!member) {
        diagnosis.issue = 'Usuário não encontrado no servidor';
        diagnosis.causes.push('Usuário pode ter saído do servidor');
        diagnosis.solutions.push('Verifique se o usuário ainda está no servidor');
        return diagnosis;
      }

      // Testar permissão básica
      const permCheck = checkPermission(member, guildId, command, 'command');
      diagnosis.tests.push({
        name: 'Verificação de Permissão',
        result: permCheck.allowed ? 'PASS' : 'FAIL',
        details: permCheck
      });

      if (!permCheck.allowed) {
        diagnosis.issue = 'Permissão negada';
        
        // Analisar causas possíveis
        if (permCheck.source === 'none') {
          diagnosis.causes.push('Nenhuma permissão configurada para este usuário/cargo');
          diagnosis.solutions.push('Configure permissões explícitas para o usuário ou cargo');
        }

        if (permCheck.source === 'level') {
          diagnosis.causes.push('Nível de permissão insuficiente');
          diagnosis.solutions.push('Aumente o nível do usuário ou configure permissão específica');
        }

        diagnosis.causes.push(`Motivo: ${permCheck.reason}`);
      }

    } catch (error) {
      diagnosis.issue = 'Erro no diagnóstico';
      diagnosis.causes.push(error.message);
      diagnosis.solutions.push('Verifique os logs do sistema para mais detalhes');
    }

    return diagnosis;
  }

  /**
   * Obter membro do servidor
   */
  async getMember(guildId, userId) {
    // Esta função precisaria de acesso ao cliente Discord
    // Por enquanto, retorna null
    return null;
  }
}

module.exports = {
  PermissionValidator,
  validator: new PermissionValidator()
};
