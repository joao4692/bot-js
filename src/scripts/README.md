# 📋 **Scripts de Utilidade**

## 🎯 **O que são estes scripts?**

Scripts de diagnóstico e manutenção para o bot Discord.

---

## 🔧 **Scripts Disponíveis**

### **📊 `check_commands.js`**
- **Função**: Verificar estrutura dos comandos
- **Uso**: `node src/scripts/check_commands.js`
- **O que verifica**:
  - ✅ module.exports
  - ✅ SlashCommandBuilder
  - ✅ função execute
  - ✅ permissões configuradas

### **🔒 `check_permissions_real.js`**
- **Função**: Analisar permissões dos comandos
- **Uso**: `node src/scripts/check_permissions_real.js`
- **O que verifica**:
  - 🔒 Comandos de administrador
  - 🔒 Verificações de permissão
  - 🔒 Riscos de segurança
  - 🔒 Comandos públicos vs restritos

---

## 🚀 **Como Usar**

### **Executar no Terminal:**
```bash
# Verificar estrutura dos comandos
node src/scripts/check_commands.js

# Verificar permissões dos comandos
node src/scripts/check_permissions_real.js
```

### **Quando usar:**
- 🔍 **Antes de fazer deploy** - Verificar se tudo está correto
- 🐛 **Ao debugar** - Identificar problemas estruturais
- 🔒 **Para auditoria** - Verificar segurança
- 🛠️ **Manutenção** - Revisar código periodicamente

---

## 📊 **Exemplos de Saída**

### **check_commands.js:**
```
=== ANÁLISE DE COMANDOS ===
Total de arquivos: 84
⚠️ PROBLEMA: comando-x - Sem função execute
✅ COMANDO FUNCIONAL: comando-y
```

### **check_permissions_real.js:**
```
=== COMANDOS DE ADMINISTRADOR ===
👑 ban - Categoria: moderation
👑 kick - Categoria: moderation
🔒 comando-publico - Categoria: misc
```

---

## 🎯 **Benefícios**

✅ **Detecta bugs** antes de afetarem usuários  
✅ **Audita segurança** do sistema  
✅ **Economiza tempo** no debugging  
✅ **Organiza manutenção** do código  
✅ **Documenta problemas** encontrados  

---

**📋 Scripts essenciais para manter seu bot saudável e seguro!**
