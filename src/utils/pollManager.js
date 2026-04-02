const fs = require('fs');
const path = require('path');

class PollManager {
    constructor() {
        this.pollsFile = path.join(__dirname, '../data/polls.json');
        this.polls = new Map();
        this.tempData = new Map(); // Replace global usage
        this.loadPolls();
    }

    loadPolls() {
        try {
            if (fs.existsSync(this.pollsFile)) {
                const data = fs.readFileSync(this.pollsFile, 'utf8');
                const pollsData = JSON.parse(data);
                this.polls = new Map(Object.entries(pollsData));
            }
        } catch (error) {
            console.error('Erro ao carregar enquetes:', error);
            this.polls = new Map();
        }
    }

    savePolls() {
        try {
            const data = JSON.stringify(Object.fromEntries(this.polls), null, 2);
            const dir = path.dirname(this.pollsFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.pollsFile, data);
        } catch (error) {
            console.error('Erro ao salvar enquetes:', error);
        }
    }

    createPoll(pollData) {
        const pollId = `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const poll = {
            id: pollId,
            title: pollData.title,
            description: pollData.description || null,
            options: pollData.options,
            votes: {},
            messageId: pollData.messageId,
            channelId: pollData.channelId,
            guildId: pollData.guildId,
            authorId: pollData.authorId,
            createdAt: new Date().toISOString(),
            endsAt: pollData.duration ? new Date(Date.now() + pollData.duration).toISOString() : null,
            anonymous: pollData.anonymous || false,
            multipleVotes: pollData.multipleVotes || false,
            active: true
        };

        this.polls.set(pollId, poll);
        this.savePolls();
        return poll;
    }

    getPoll(pollId) {
        return this.polls.get(pollId);
    }

    getPollByMessage(messageId) {
        for (const poll of this.polls.values()) {
            if (poll.messageId === messageId) {
                return poll;
            }
        }
        return null;
    }

    vote(pollId, userId, optionIndex) {
        const poll = this.polls.get(pollId);
        if (!poll || !poll.active) {
            return { success: false, error: 'Enquete não encontrada ou encerrada' };
        }

        if (poll.endsAt && new Date() > new Date(poll.endsAt)) {
            poll.active = false;
            this.savePolls();
            return { success: false, error: 'Enquete encerrada' };
        }

        if (optionIndex < 0 || optionIndex >= poll.options.length) {
            return { success: false, error: 'Opção inválida' };
        }

        if (!poll.multipleVotes) {
            for (let i = 0; i < poll.options.length; i++) {
                if (poll.votes[userId] && poll.votes[userId].includes(i)) {
                    poll.votes[userId] = poll.votes[userId].filter(v => v !== i);
                }
            }
        }

        if (!poll.votes[userId]) {
            poll.votes[userId] = [];
        }

        if (!poll.votes[userId].includes(optionIndex)) {
            poll.votes[userId].push(optionIndex);
        }

        this.savePolls();
        return { success: true, poll };
    }

    removeVote(pollId, userId, optionIndex) {
        const poll = this.polls.get(pollId);
        if (!poll || !poll.active) {
            return { success: false, error: 'Enquete não encontrada ou encerrada' };
        }

        if (poll.votes[userId] && poll.votes[userId].includes(optionIndex)) {
            poll.votes[userId] = poll.votes[userId].filter(v => v !== optionIndex);
            this.savePolls();
            return { success: true, poll };
        }

        return { success: false, error: 'Voto não encontrado' };
    }

    endPoll(pollId) {
        const poll = this.polls.get(pollId);
        if (!poll) {
            return { success: false, error: 'Enquete não encontrada' };
        }

        poll.active = false;
        poll.endedAt = new Date().toISOString();
        this.savePolls();
        return { success: true, poll };
    }

    deletePoll(pollId) {
        const poll = this.polls.get(pollId);
        if (!poll) {
            return { success: false, error: 'Enquete não encontrada' };
        }

        this.polls.delete(pollId);
        this.savePolls();
        return { success: true };
    }

    getResults(pollId) {
        const poll = this.polls.get(pollId);
        if (!poll) {
            return null;
        }

        const results = poll.options.map((option, index) => {
            let votes = 0;
            for (const userId in poll.votes) {
                if (poll.votes[userId].includes(index)) {
                    votes++;
                }
            }
            return {
                option,
                votes,
                percentage: Object.keys(poll.votes).length > 0 ? (votes / Object.keys(poll.votes).length) * 100 : 0
            };
        });

        return {
            ...poll,
            results,
            totalVotes: Object.keys(poll.votes).length,
            active: poll.active
        };
    }

    getActivePolls(guildId) {
        const activePolls = [];
        for (const poll of this.polls.values()) {
            if (poll.guildId === guildId && poll.active) {
                if (poll.endsAt && new Date() > new Date(poll.endsAt)) {
                    poll.active = false;
                    this.savePolls();
                } else {
                    activePolls.push(poll);
                }
            }
        }
        return activePolls;
    }

    getUserVotes(pollId, userId) {
        const poll = this.polls.get(pollId);
        if (!poll) {
            return [];
        }
        return poll.votes[userId] || [];
    }

    // Nova função para limpeza de enquetes expiradas
    cleanupExpiredPolls() {
        let cleanedCount = 0;
        const now = new Date();
        
        for (const [pollId, poll] of this.polls.entries()) {
            if (poll.endsAt && new Date(poll.endsAt) < now && poll.active) {
                poll.active = false;
                poll.endedAt = now.toISOString();
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.savePolls();
            console.log(`🧹 Limpeza: ${cleanedCount} enquete(s) expirada(s) marcada(s) como encerrada`);
        }
        
        return cleanedCount;
    }

    // Nova função para obter estatísticas gerais
    getGlobalStats() {
        const allPolls = Array.from(this.polls.values());
        const activePolls = allPolls.filter(p => p.active);
        const totalVotes = allPolls.reduce((sum, poll) => {
            const userVotes = Object.values(poll.votes || {});
            return sum + userVotes.flat().length;
        }, 0);

        return {
            total: allPolls.length,
            active: activePolls.length,
            ended: allPolls.length - activePolls.length,
            totalVotes,
            averageVotes: allPolls.length > 0 ? Math.round(totalVotes / allPolls.length) : 0
        };
    }

    // Nova função para buscar enquetes por autor
    getPollsByAuthor(authorId) {
        const authorPolls = [];
        for (const poll of this.polls.values()) {
            if (poll.authorId === authorId) {
                authorPolls.push(poll);
            }
        }
        return authorPolls;
    }

    // Nova função para validar integridade dos dados
    validateData() {
        const issues = [];
        
        for (const [pollId, poll] of this.polls.entries()) {
            // Verificar campos obrigatórios
            if (!poll.title || !poll.options || !Array.isArray(poll.options)) {
                issues.push(`Enquete ${pollId}: Dados básicos corrompidos`);
                continue;
            }
            
            // Verificar se opções são válidas
            if (poll.options.length < 2 || poll.options.length > 10) {
                issues.push(`Enquete ${pollId}: Número de opções inválido (${poll.options.length})`);
            }
            
            // Verificar se votos são válidos
            if (!poll.votes || typeof poll.votes !== 'object') {
                issues.push(`Enquete ${pollId}: Dados de votos corrompidos`);
            }
        }
        
        return issues;
    }

    // Nova função para backup das enquetes
    createBackup() {
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                polls: Object.fromEntries(this.polls),
                stats: this.getGlobalStats()
            };
            
            const backupFile = this.pollsFile.replace('.json', `_backup_${Date.now()}.json`);
            const data = JSON.stringify(backup, null, 2);
            
            fs.writeFileSync(backupFile, data);
            console.log(`💾 Backup criado: ${backupFile}`);
            return backupFile;
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            return null;
        }
    }

    // Temporary data management (replaced global usage)
    setTempData(userId, data) {
        this.tempData.set(userId, data);
        
        // Auto-cleanup after 10 minutes
        setTimeout(() => {
            this.tempData.delete(userId);
        }, 10 * 60 * 1000);
    }

    getTempData(userId) {
        return this.tempData.get(userId);
    }

    clearTempData(userId) {
        return this.tempData.delete(userId);
    }
}

module.exports = new PollManager();
