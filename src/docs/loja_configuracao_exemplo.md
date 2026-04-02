# Loja RP - Guia de Configuração Avançada

## Estrutura de Item no `items.json`

Cada item pode conter qualquer combinação dos seguintes campos:

```json
{
  "vip_role": {
    "name": "VIP Premium",
    "description": "Acesso ao cargo VIP Premium.",
    "price": 10000,
    "sell_price": null,
    "type": "role",
    "roleId": "123456789012345678", // Cargo entregue automaticamente
    "permissions": ["acesso_area_vip", "usar_comando_x"], // Permissões customizadas
    "resources": { "xp": 1000, "coin": 500 }, // Recursos customizados
    "badge": "vip", // Badge/insígnia
    "cooldown": 86400, // Tempo em segundos para poder comprar novamente
    "limit_per_user": 1, // Limite de compras por usuário
    "validade": 2592000, // Tempo em segundos até expirar
    "unique": true, // Só pode comprar uma vez
    "customActions": [
      { "type": "log", "message": "Compra VIP realizada!" },
      { "type": "webhook", "url": "https://seusite.com/api/webhook", "payload": { "user": "{{userId}}", "item": "{{itemId}}" } }
    ]
  },
  "xp_boost": {
    "name": "XP Boost",
    "description": "Ganha 2x XP por 7 dias.",
    "price": 5000,
    "type": "boost",
    "resources": { "xp_multiplier": 2 },
    "validade": 604800
  }
}
```

## Campos Suportados
- **name**: Nome do item
- **description**: Descrição detalhada
- **price**: Preço de compra
- **sell_price**: Preço de venda
- **type**: Tipo do item ("role", "boost", "license", "resource", etc)
- **roleId**: ID do cargo a ser entregue
- **permissions**: Permissões customizadas adicionadas ao perfil
- **resources**: Recursos customizados (xp, moedas, boosts, etc)
- **badge**: Insígnia/badge entregue ao usuário
- **cooldown**: Tempo em segundos para nova compra
- **limit_per_user**: Limite máximo de compras por usuário
- **validade**: Tempo de validade do item após entrega
- **unique**: Se true, só pode comprar uma vez
- **customActions**: Lista de ações customizadas (log, webhook, etc)

## Painel/Administração
- Adicione, edite ou remova itens via comandos admin ou editando o arquivo `items.json`.
- Campos extras podem ser adicionados conforme necessidade. O sistema processa qualquer campo reconhecido.

## Lógica de Processamento
- **Cargo**: Se `roleId` presente, entrega automática após compra.
- **Permissões**: Adicionadas ao perfil do usuário.
- **Recursos**: Incrementados no perfil.
- **Badge**: Adicionada ao perfil (implementar visualização se necessário).
- **Cooldown**: Impede nova compra até o tempo expirar.
- **Limit**: Bloqueia compra após atingir limite.
- **Validade**: Item expira após tempo configurado.
- **CustomActions**: Executa ações customizadas (ex: log, webhook, integração externa).

## Exemplos de Uso
- Loja de cargos VIP, boosts, licenças, XP, moedas, insígnias, permissões, recursos customizados, integrações externas, etc.

---

**Personalize e expanda conforme suas necessidades!**
