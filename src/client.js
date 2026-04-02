const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    Partials,
    REST,
    Routes
} = require('discord.js');

const fs = require('fs');
const path = require('path');

/* =========================
   🎨 Console Visual Enhanced v2.0
========================= */
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};

/* =========================
   🎯 Spinner Animado
========================= */
class Spinner {
    constructor() {
        this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.interval = null;
        this.current = 0;
    }

    start(text = 'Processando...') {
        this.interval = setInterval(() => {
            process.stdout.write(`\r${colors.cyan}${this.frames[this.current]}${colors.reset} ${text}`);
            this.current = (this.current + 1) % this.frames.length;
        }, 80);
    }

    stop(finalText = null) {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            process.stdout.write('\r' + ' '.repeat(process.stdout.columns || 50) + '\r');
            if (finalText) {
                console.log(`${colors.green}✅${colors.reset} ${finalText}`);
            }
        }
    }
}

/* =========================
   📊 Barra de Progresso
========================= */
function progressBar(current, total, size = 30) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((size * current) / total);
    const empty = size - filled;
    
    const bar = `${colors.green}${'█'.repeat(filled)}${colors.gray}${'░'.repeat(empty)}${colors.reset}`;
    const percentageText = `${percentage.toString().padStart(3)}%`;
    
    return `[${bar}] ${percentageText}`;
}

/* =========================
   🎨 Box Drawing Utils
========================= */
function createBox(title, content, width = 60, color = colors.cyan) {
    const padding = 2;
    const innerWidth = width - (padding * 2);
    
    const topBorder = `${color}╔${'═'.repeat(width - 2)}╗${colors.reset}`;
    const bottomBorder = `${color}╚${'═'.repeat(width - 2)}╝${colors.reset}`;
    const sideBorder = `${color}║${colors.reset}`;
    
    const titleLine = title ? 
        `${sideBorder} ${color}${title}${colors.reset} ${' '.repeat(innerWidth - title.length - 2)} ${sideBorder}` :
        `${sideBorder}${' '.repeat(innerWidth)}${sideBorder}`;
    
    const lines = Array.isArray(content) ? content : [content];
    const contentLines = lines.map(line => 
        `${sideBorder} ${line.padEnd(innerWidth)} ${sideBorder}`
    );
    
    return [
        topBorder,
        titleLine,
        ...contentLines,
        bottomBorder
    ].join('\n');
}

class BotClient extends Client {
    constructor(options = {}) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,          // Privileged
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.GuildEmojisAndStickers,
                GatewayIntentBits.GuildIntegrations,
                GatewayIntentBits.GuildWebhooks,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildPresences,        // Privileged
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.DirectMessageTyping,
                GatewayIntentBits.MessageContent         // Privileged
            ],
            partials: [
                Partials.Channel,
                Partials.Message,
                Partials.User,
                Partials.GuildMember,
                Partials.Reaction
            ],
            ...options,
        });

        /* =========================
           📊 Collections & Cache
        ========================= */
        this.slashCommands = new Collection();
        this.commands = new Collection();
        this.cooldowns = new Collection();
        this.config = require('./config/config');
        this.startTime = Date.now();
        this.stats = {
            commandsUsed: 0,
            messagesProcessed: 0,
            errorsCount: 0,
            uptimeStart: Date.now()
        };
        
        /* =========================
            Enhanced Visual System
        ========================= */
        this.spinner = new Spinner();
        this.recentLogs = [];
        
        /* =========================
            Simple Error Monitor
        ========================= */
        const SimpleErrorMonitor = require('./utils/SimpleErrorMonitor');
        this.errorMonitor = new SimpleErrorMonitor(this);

        /* =========================
           🔧 Performance Monitor
        ========================= */
        this.performance = {
            lastCommand: null,
            commandTimes: new Map(),
            slowCommands: []
        };
    }

    /* =========================
       📝 Enhanced Logger Pro
    ========================= */
    log(type, message, extra = {}) {
        const timestamp = new Date().toLocaleTimeString('pt-BR', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const icons = {
            INFO: 'ℹ️',
            LOAD: '📦',
            SUCCESS: '✅',
            WARN: '⚠️',
            ERROR: '✖️',
            DEBUG: '🔍',
            COMMAND: '⚡',
            EVENT: '📡'
        };
        
        const typeColors = {
            INFO: colors.cyan,
            LOAD: colors.magenta,
            SUCCESS: colors.green,
            WARN: colors.yellow,
            ERROR: colors.red,
            DEBUG: colors.blue,
            COMMAND: colors.white,
            EVENT: colors.magenta
        };
        
        const icon = icons[type] || '📝';
        const color = typeColors[type] || colors.white;
        const prefix = `${color}[${icon} ${type}]${colors.reset} [${timestamp}]`;
        const logMessage = `${prefix} ➜ ${message}`;
        
        console.log(logMessage);
        
        // Log extra information if provided
        if (Object.keys(extra).length > 0) {
            const formatted = JSON.stringify(extra, null, 2);
            const lines = formatted.split('\n');
            console.log(`${colors.gray}┌─ Extra Info:${colors.reset}`);
            lines.forEach((line, index) => {
                const prefix = index === 0 ? '│ ' : '│ ';
                console.log(`${colors.gray}${prefix}${line}${colors.reset}`);
            });
            console.log(`${colors.gray}└─${colors.reset}`);
        }

        // Store logs in memory for debugging (max 50)
        this.recentLogs.push({ type, message, timestamp, extra });
        if (this.recentLogs.length > 50) {
            this.recentLogs.shift();
        }
    }

    /* =========================
       📂 Enhanced Folder Loader Pro
    ========================= */
    async loadFolder(folderName, handler) {
        const folderPath = path.join(__dirname, folderName);

        if (!fs.existsSync(folderPath)) {
            this.log('WARN', `Pasta '${folderName}' não encontrada`);
            return { loaded: 0, errors: [`Pasta '${folderName}' não encontrada`] };
        }

        let loaded = 0;
        const errors = [];
        const startTime = performance.now();

        const walk = async (dir, depth = 0) => {
            if (depth > 10) {
                this.log('WARN', `Profundidade máxima excedida em ${dir}`);
                return;
            }

            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                
                try {
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory()) {
                        await walk(fullPath, depth + 1);
                        continue;
                    }

                    if (!item.endsWith('.js') || item.startsWith('_')) continue;

                    // Clear cache to allow hot reload
                    delete require.cache[require.resolve(fullPath)];
                    
                    const loadStart = performance.now();
                    await handler(fullPath, this);
                    const loadTime = (performance.now() - loadStart).toFixed(2);
                    
                    loaded++;
                    this.log('DEBUG', `${colors.green}✓${colors.reset} ${item} ${colors.gray}(${loadTime}ms)${colors.reset}`);
                    
                } catch (err) {
                    const relativePath = path.relative(__dirname, fullPath);
                    const errorMsg = `${relativePath}: ${err.message}`;
                    errors.push(errorMsg);
                    this.log('ERROR', `Falha ao carregar ${colors.red}${item}${colors.reset}: ${err.message}`);
                }
            }
        };

        await walk(folderPath);
        
        const totalTime = (performance.now() - startTime).toFixed(2);
        
        if (loaded > 0) {
            this.log('LOAD', `${colors.green}${loaded}${colors.reset} arquivo(s) de '${colors.cyan}${folderName}${colors.reset}' ${colors.gray}(${totalTime}ms)${colors.reset}`);
        }
        
        if (errors.length > 0) {
            this.log('WARN', `${colors.red}${errors.length}${colors.reset} erro(s) em '${colors.cyan}${folderName}${colors.reset}'`);
        }

        return { loaded, errors };
    }

    /* =========================
       ⚙️ Enhanced Command Loader Pro
    ========================= */
    async loadCommands() {
        const result = await this.loadFolder('commands', async (filePath, client) => {
            const command = require(filePath);
            const relativePath = path.relative(path.join(__dirname, 'commands'), filePath);
            const category = relativePath.split(path.sep)[0] || 'misc';

            if (command?.data && command?.execute) {
                command.category = category;
                command.type = 'slash';
                client.slashCommands.set(command.data.name, command);
                this.log('DEBUG', `Slash: ${colors.cyan}${command.data.name}${colors.reset} (${category})`);
            } 
            else if (command?.name && command?.execute) {
                command.category = category;
                command.type = 'legacy';
                client.commands.set(command.name, command);
                
                if (Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => client.commands.set(alias, command));
                }
                
                this.log('DEBUG', `Legacy: ${colors.cyan}${command.name}${colors.reset} (${category})`);
            }
        });

        await this.loadPlugins();
        return result;
    }

    /* =========================
       🔌 Enhanced Plugin Loader Pro
    ========================= */
    async loadPlugins() {
        const pluginsDir = path.join(__dirname, 'plugins');
        if (!fs.existsSync(pluginsDir)) return { loaded: 0, errors: [] };

        const pluginFolders = fs.readdirSync(pluginsDir)
            .filter(f => fs.statSync(path.join(pluginsDir, f)).isDirectory());

        let loaded = 0;
        const errors = [];

        for (const folder of pluginFolders) {
            try {
                const pluginJsonPath = path.join(pluginsDir, folder, 'plugin.json');
                if (!fs.existsSync(pluginJsonPath)) continue;
                
                const pluginConfig = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
                if (!pluginConfig.enabled) continue;
                
                const pluginMain = path.join(pluginsDir, folder, 'index.js');
                if (!fs.existsSync(pluginMain)) continue;
                
                const plugin = require(pluginMain);
                if (plugin.onLoad) plugin.onLoad(this);
                
                loaded++;
                this.log('SUCCESS', `[PLUGIN] ${colors.green}${pluginConfig.name || folder}${colors.reset} carregado!`);
            } catch (e) {
                const errorMsg = `[PLUGIN] ${folder}: ${e.message}`;
                errors.push(errorMsg);
                this.log('ERROR', errorMsg);
            }
        }

        return { loaded, errors };
    }

    /* =========================
       📡 Enhanced Event Loader Pro
    ========================= */
    async loadEvents() {
        return await this.loadFolder('events', async (filePath, client) => {
            const event = require(filePath);
            if (!event?.name || !event?.execute) return;

            const run = (...args) => {
                try {
                    event.execute(...args, client);
                } catch (error) {
                    client.log('ERROR', `Evento ${colors.red}${event.name}${colors.reset}: ${error.message}`);
                }
            };

            event.once ? client.once(event.name, run) : client.on(event.name, run);
            this.log('DEBUG', `Evento: ${colors.magenta}${event.name}${colors.reset}`);
        });
    }

    /* =========================
       🏗️ Structure Loaders
    ========================= */
    async loadStructures() {
        return await this.loadFolder('structures', async (filePath) => {
            require(filePath);
            this.log('DEBUG', `Estrutura: ${path.basename(filePath)}`);
        });
    }

    async loadServices() {
        return await this.loadFolder('services', async (filePath) => {
            require(filePath);
            this.log('DEBUG', `Serviço: ${path.basename(filePath)}`);
        });
    }

    async loadMiddlewares() {
        return await this.loadFolder('middlewares', async (filePath) => {
            require(filePath);
            this.log('DEBUG', `Middleware: ${path.basename(filePath)}`);
        });
    }

    /* =========================
       📊 Enhanced Statistics Pro
    ========================= */
    getStats() {
        const uptime = Date.now() - this.stats.uptimeStart;
        const memory = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            uptime: {
                milliseconds: uptime,
                seconds: Math.floor(uptime / 1000),
                formatted: this.formatUptime(uptime)
            },
            memory: {
                rss: `${(memory.rss / 1024 / 1024).toFixed(2)}MB`,
                heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
                heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                external: `${(memory.external / 1024 / 1024).toFixed(2)}MB`
            },
            cpu: {
                user: `${(cpuUsage.user / 1000000).toFixed(2)}s`,
                system: `${(cpuUsage.system / 1000000).toFixed(2)}s`
            },
            commands: {
                slash: this.slashCommands.size,
                legacy: this.commands.size,
                total: this.slashCommands.size + this.commands.size,
                used: this.stats.commandsUsed
            },
            guilds: this.guilds?.cache?.size || 0,
            users: this.users?.cache?.size || 0,
            channels: this.channels?.cache?.size || 0,
            errors: this.stats.errorsCount,
            recentLogs: this.recentLogs?.length || 0
        };
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    }

    /* =========================
       🚀 Enhanced Startup Pro
    ========================= */
    async start(token) {
        try {
            // Initialize JSON watcher
            const jsonWatcher = require('./utils/jsonWatcher');
            jsonWatcher.init();

            // Clear console and show enhanced banner
            console.clear();
            this.showBanner();

            // Start spinner for loading
            this.spinner.start('Carregando módulos do sistema...');

            // Load all modules with progress tracking
            const modules = [
                { name: 'Estruturas', loader: () => this.loadStructures() },
                { name: 'Middlewares', loader: () => this.loadMiddlewares() },
                { name: 'Serviços', loader: () => this.loadServices() },
                { name: 'Comandos', loader: () => this.loadCommands() },
                { name: 'Eventos', loader: () => this.loadEvents() }
            ];

            const loadResults = {};
            
            for (let i = 0; i < modules.length; i++) {
                const module = modules[i];
                this.spinner.stop();
                console.log(`${colors.cyan}🔄${colors.reset} Carregando ${module.name.toLowerCase()}... ${progressBar(i + 1, modules.length)}`);
                
                loadResults[module.name.toLowerCase()] = await module.loader();
            }

            this.spinner.stop('Todos os módulos carregados com sucesso!');

            // Show enhanced loading summary
            this.showLoadSummary(loadResults);

            // Connect to Discord with spinner
            this.spinner.start('Conectando ao Discord...');
            
            await this.login(token);
            
            this.spinner.stop('Conectado com sucesso!');

        } catch (error) {
            this.spinner.stop();
            this.log('ERROR', `Falha na inicialização: ${error.message}`);
            console.error(`${colors.red}Erro completo:${colors.reset}`, error);
            process.exit(1);
        }
    }

    showBanner() {
        const botName = '🤖 DISCORD RP DAYZ CONSOLE';
        const version = 'Versão 2.0 - Enhanced';
        const environment = this.env?.toUpperCase() || 'PRODUCTION';
        const nodeVersion = process.version;
        const platform = process.platform;
        const startTime = new Date().toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Main banner
        const mainBanner = createBox(
            '',
            [
                `${colors.bold}${colors.cyan}${botName}${colors.reset}`,
                '',
                `${colors.green}${version}${colors.reset}`
            ],
            65,
            colors.cyan
        );

        // System info
        const systemInfo = createBox(
            `${colors.yellow}🚀 SISTEMA INICIALIZANDO...${colors.reset}`,
            [
                `${colors.white}📊 Ambiente:${colors.reset} ${colors.cyan}${environment}${colors.reset}`,
                `${colors.white}🔧 Node.js:${colors.reset} ${colors.green}${nodeVersion}${colors.reset}`,
                `${colors.white}💻 Plataforma:${colors.reset} ${colors.blue}${platform}${colors.reset}`,
                `${colors.white}⏰ Início:${colors.reset} ${colors.magenta}${startTime}${colors.reset}`
            ],
            65,
            colors.yellow
        );

        console.log(mainBanner);
        console.log('\n');
        console.log(systemInfo);
        console.log('\n');
    }

    showLoadSummary(results) {
        const summaryBanner = createBox(
            `${colors.magenta}📊 RESUMO DE CARREGAMENTO${colors.reset}`,
            [],
            65,
            colors.magenta
        );
        
        console.log(summaryBanner);
        console.log('\n');

        let totalLoaded = 0;
        let totalErrors = 0;
        const moduleResults = [];

        // Process results
        Object.entries(results).forEach(([module, result]) => {
            const loaded = result.loaded || 0;
            const errors = result.errors?.length || 0;
            const status = errors > 0 ? 
                `${colors.yellow}⚠️${colors.reset}` : 
                `${colors.green}✅${colors.reset}`;
            
            totalLoaded += loaded;
            totalErrors += errors;
            
            moduleResults.push({
                module: module.charAt(0).toUpperCase() + module.slice(1),
                loaded,
                errors,
                status
            });
        });

        // Display module results
        moduleResults.forEach(({ module, loaded, errors, status }) => {
            const moduleText = `${colors.white}${module.padEnd(12)}${colors.reset}`;
            const loadedText = `${colors.green}${loaded}${colors.reset}`;
            const errorsText = errors > 0 ? `${colors.red}${errors}${colors.reset}` : '';
            const errorLabel = errors > 0 ? ` erros` : '';
            
            console.log(`${status} ${moduleText}: ${loadedText} carregados${errorLabel ? `, ${errorsText}${errorLabel}` : ''}`);
        });

        // Final statistics
        const executionTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const statsBanner = createBox(
            `${colors.cyan}📈 ESTATÍSTICAS FINAIS${colors.reset}`,
            [
                `${colors.green}✅${colors.reset} Total carregados: ${colors.bold}${totalLoaded}${colors.reset}`,
                `${totalErrors > 0 ? colors.red : colors.green}❌${colors.reset} Total de erros: ${colors.bold}${totalErrors}${colors.reset}`,
                `${colors.yellow}⚡${colors.reset} Performance: ${colors.bold}${executionTime}s${colors.reset}`
            ],
            65,
            colors.cyan
        );
        
        console.log('\n');
        console.log(statsBanner);
        console.log('\n');
    }

    /* =========================
       🔧 Enhanced Utility Methods Pro
    ========================= */
    async reloadCommands() {
        this.slashCommands.clear();
        this.commands.clear();
        return await this.loadCommands();
    }

    async reloadEvents() {
        this.removeAllListeners();
        return await this.loadEvents();
    }

    getCommand(name) {
        return this.slashCommands.get(name) || this.commands.get(name);
    }

    hasPermission(member, requiredPermission) {
        if (!member || !requiredPermission) return false;
        return member.permissions.has(requiredPermission);
    }

    /* =========================
       🎯 Advanced Methods
    ========================= */
    getCommandStats() {
        const categories = new Map();
        
        this.slashCommands.forEach(cmd => {
            const cat = cmd.category || 'misc';
            categories.set(cat, (categories.get(cat) || 0) + 1);
        });
        
        this.commands.forEach(cmd => {
            const cat = cmd.category || 'misc';
            categories.set(cat, (categories.get(cat) || 0) + 1);
        });

        return Object.fromEntries(categories);
    }

    getRecentErrors(limit = 10) {
        return this.recentLogs
            .filter(log => log.type === 'ERROR')
            .slice(-limit);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getHealthStatus() {
        const memory = process.memoryUsage();
        const memoryUsage = memory.heapUsed / memory.heapTotal;
        
        return {
            status: memoryUsage > 0.9 ? 'critical' : memoryUsage > 0.7 ? 'warning' : 'healthy',
            memory: `${(memoryUsage * 100).toFixed(1)}%`,
            uptime: this.formatUptime(Date.now() - this.stats.uptimeStart),
            commands: this.stats.commandsUsed,
            errors: this.stats.errorsCount
        };
    }
}

module.exports = BotClient;
