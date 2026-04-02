const fs = require("fs");
const autorolePath = "./src/json/data/autorole.json";
const logPath = "./src/json/data/autorole_log.json";

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    // =====================
    // Lê o autorole
    // =====================
    if (!fs.existsSync(autorolePath)) return;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(autorolePath, "utf-8"));
    } catch (err) {
      console.error("Erro ao ler autorole.json", err);
      return;
    }

    const roleId = data[member.guild.id];
    if (!roleId) return;

    const role = member.guild.roles.cache.get(roleId);
    if (!role) return;

    // =====================
    // Aplica o cargo
    // =====================
    try {
      await member.roles.add(role);
      console.log(`✅ Cargo ${role.name} adicionado a ${member.user.tag}`);
    } catch (err) {
      console.error("Erro ao adicionar cargo: ", err);
      return;
    }

    // =====================
    // Registra no log
    // =====================
    let logData = {};
    if (fs.existsSync(logPath)) {
      try {
        logData = JSON.parse(fs.readFileSync(logPath, "utf-8"));
      } catch (err) {
        console.error("Erro ao ler autorole_log.json", err);
      }
    }

    // Cria estrutura para guild
    if (!logData[member.guild.id]) logData[member.guild.id] = [];

    // Adiciona registro
    logData[member.guild.id].push({
      memberId: member.id,
      memberTag: member.user.tag,
      roleId: role.id,
      roleName: role.name,
      timestamp: new Date().toISOString()
    });

    try {
      fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
      console.log(`📄 Registro salvo no log para ${member.user.tag}`);
    } catch (err) {
      console.error("Erro ao salvar autorole_log.json", err);
    }
  }
};
