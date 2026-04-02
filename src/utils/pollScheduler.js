const pollManager = require('./pollManager');

class PollScheduler {
    constructor() {
        this.intervals = new Map();
        this.isRunning = false;
    }

    // Iniciar agendador de tarefas
    start() {
        if (this.isRunning) {
            console.log('⚠️ PollScheduler já está em execução');
            return;
        }

        this.isRunning = true;
        console.log('🚀 PollScheduler iniciado');

        // Limpeza de enquetes expiradas (a cada 5 minutos)
        this.intervals.set('cleanup', setInterval(() => {
            this.runCleanup();
        }, 5 * 60 * 1000));

        // Backup automático (a cada 6 horas)
        this.intervals.set('backup', setInterval(() => {
            this.runBackup();
        }, 6 * 60 * 60 * 1000));

        // Validação de dados (a cada hora)
        this.intervals.set('validate', setInterval(() => {
            this.runValidation();
        }, 60 * 60 * 1000));

        console.log('✅ Tarefas agendadas:');
        console.log('   🧹 Limpeza: a cada 5 minutos');
        console.log('   💾 Backup: a cada 6 horas');
        console.log('   🔍 Validação: a cada hora');
    }

    // Parar agendador
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ PollScheduler não está em execução');
            return;
        }

        this.intervals.forEach((interval, name) => {
            clearInterval(interval);
            console.log(`⏹️ Parada tarefa: ${name}`);
        });

        this.intervals.clear();
        this.isRunning = false;
        console.log('🛑 PollScheduler parado');
    }

    // Executar limpeza
    async runCleanup() {
        try {
            const cleanedCount = pollManager.cleanupExpiredPolls();
            if (cleanedCount > 0) {
                console.log(`🧹 [${new Date().toLocaleTimeString('pt-BR')}] Limpeza: ${cleanedCount} enquete(s) expirada(s)`);
            }
        } catch (error) {
            console.error(`❌ [${new Date().toLocaleTimeString('pt-BR')}] Erro na limpeza automática:`, error);
        }
    }

    // Executar backup
    async runBackup() {
        try {
            const backupFile = pollManager.createBackup();
            if (backupFile) {
                console.log(`💾 [${new Date().toLocaleTimeString('pt-BR')}] Backup automático criado`);
            }
        } catch (error) {
            console.error(`❌ [${new Date().toLocaleTimeString('pt-BR')}] Erro no backup automático:`, error);
        }
    }

    // Executar validação
    async runValidation() {
        try {
            const issues = pollManager.validateData();
            if (issues.length > 0) {
                console.log(`⚠️ [${new Date().toLocaleTimeString('pt-BR')}] Validação: ${issues.length} problema(s) encontrado(s)`);
                issues.forEach(issue => console.log(`   - ${issue}`));
            }
        } catch (error) {
            console.error(`❌ [${new Date().toLocaleTimeString('pt-BR')}] Erro na validação automática:`, error);
        }
    }

    // Obter status do agendador
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeTasks: this.intervals.size,
            tasks: Array.from(this.intervals.keys())
        };
    }

    // Forçar execução manual de uma tarefa
    async forceRun(task) {
        switch (task) {
            case 'cleanup':
                await this.runCleanup();
                break;
            case 'backup':
                await this.runBackup();
                break;
            case 'validate':
                await this.runValidation();
                break;
            default:
                throw new Error(`Tarefa desconhecida: ${task}`);
        }
    }
}

// Criar instância global
const pollScheduler = new PollScheduler();

// Auto-iniciar se não estiver em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
    pollScheduler.start();
}

// Tratamento de desligamento gracioso
process.on('SIGINT', () => {
    console.log('\n🛑 Recebido SIGINT - Parando PollScheduler...');
    pollScheduler.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Recebido SIGTERM - Parando PollScheduler...');
    pollScheduler.stop();
    process.exit(0);
});

module.exports = pollScheduler;
