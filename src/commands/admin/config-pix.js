const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { saveGuildConfig } = require("../../utils/guildConfigManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config-pix")
    .setDescription("⚙️ Configura as informações de PIX do servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Apenas administradores podem usar
    .addSubcommand(subcommand =>
      subcommand
        .setName("definir")
        .setDescription("Define as informações de PIX")
        .addStringOption(option =>
          option
            .setName("chave")
            .setDescription("Chave PIX (CPF, telefone, email ou aleatória)")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("imagem")
            .setDescription("URL da imagem do QR Code PIX")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("remover")
        .setDescription("Remove as informações de PIX")
        .addStringOption(option =>
          option
            .setName("tipo")
            .setDescription("O que remover")
            .setRequired(true)
            .addChoices(
              { name: "🔑 Chave PIX", value: "chave" },
              { name: "🖼️ Imagem QR Code", value: "imagem" },
              { name: "🗑️ Tudo", value: "tudo" }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("mostrar")
        .setDescription("Mostra as configurações atuais de PIX")
    ),

  async execute(interaction, client, guildConfig) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case "definir":
          const chave = interaction.options.getString("chave");
          const imagem = interaction.options.getString("imagem");

          if (!chave && !imagem) {
            return await interaction.reply({
              content: "❌ Você precisa fornecer pelo menos uma informação (chave ou imagem).",
              ephemeral: true
            });
          }

          // Validar URL da imagem se fornecida
          if (imagem && !isValidUrl(imagem)) {
            return await interaction.reply({
              content: "❌ A URL da imagem fornecida é inválida.",
              ephemeral: true
            });
          }

          // Atualizar configurações
          if (chave) {
            guildConfig.pixKey = chave;
          }
          if (imagem) {
            guildConfig.pixImage = imagem;
          }

          // Salvar configurações
          await saveGuildConfig(interaction.guildId, guildConfig);

          const embed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle("✅ Configurações de PIX Atualizadas")
            .setDescription("As informações de PIX foram atualizadas com sucesso!")
            .addFields(
              chave ? { name: "🔑 Chave PIX", value: `\`${chave}\``, inline: true } : null,
              imagem ? { name: "🖼️ Imagem QR Code", value: "✅ Configurada", inline: true } : null
            )
            .filter(field => field !== null)
            .setFooter({
              text: `${interaction.guild.name} • Configuração do Sistema`,
              iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
          break;

        case "remover":
          const tipo = interaction.options.getString("tipo");
          
          let removedFields = [];
          
          switch (tipo) {
            case "chave":
              if (guildConfig.pixKey) {
                guildConfig.pixKey = null;
                removedFields.push("🔑 Chave PIX");
              }
              break;
            case "imagem":
              if (guildConfig.pixImage) {
                guildConfig.pixImage = null;
                removedFields.push("🖼️ Imagem QR Code");
              }
              break;
            case "tudo":
              if (guildConfig.pixKey || guildConfig.pixImage) {
                guildConfig.pixKey = null;
                guildConfig.pixImage = null;
                removedFields.push("🔑 Chave PIX", "🖼️ Imagem QR Code");
              }
              break;
          }

          if (removedFields.length === 0) {
            return await interaction.reply({
              content: "⚠️ Nenhuma informação de PIX foi encontrada para remover.",
              ephemeral: true
            });
          }

          await saveGuildConfig(interaction.guildId, guildConfig);

          const removeEmbed = new EmbedBuilder()
            .setColor("#ff9900")
            .setTitle("🗑️ Informações de PIX Removidas")
            .setDescription("As seguintes informações foram removidas:")
            .addFields({
              name: "Removido",
              value: removedFields.join("\n"),
              inline: false
            })
            .setFooter({
              text: `${interaction.guild.name} • Configuração do Sistema`,
              iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

          await interaction.reply({ embeds: [removeEmbed] });
          break;

        case "mostrar":
          const hasChave = guildConfig.pixKey && guildConfig.pixKey.trim() !== "";
          const hasImagem = guildConfig.pixImage && guildConfig.pixImage.trim() !== "";

          if (!hasChave && !hasImagem) {
            return await interaction.reply({
              content: "⚠️ Nenhuma informação de PIX foi configurada neste servidor.\n\nUse `/config-pix definir` para configurar.",
              ephemeral: true
            });
          }

          const showEmbed = new EmbedBuilder()
            .setColor(guildConfig.embedColor || "#00bfff")
            .setTitle("💳 Configurações Atuais de PIX")
            .setDescription("Informações de pagamento configuradas para este servidor:")
            .addFields(
              {
                name: "🔑 Chave PIX",
                value: hasChave ? `\`${guildConfig.pixKey}\`` : "❌ Não configurada",
                inline: false
              },
              {
                name: "🖼️ Imagem QR Code",
                value: hasImagem ? "✅ Configurada" : "❌ Não configurada",
                inline: false
              }
            )
            .setFooter({
              text: `${interaction.guild.name} • Configuração do Sistema`,
              iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

          if (hasImagem) {
            showEmbed.setImage(guildConfig.pixImage);
          }

          await interaction.reply({ embeds: [showEmbed], ephemeral: true });
          break;

        default:
          await interaction.reply({
            content: "❌ Subcomando inválido.",
            ephemeral: true
          });
      }

    } catch (error) {
      console.error("Erro no comando /config-pix:", error);
      
      const errorMessage = "❌ Ocorreu um erro ao processar o comando. Tente novamente ou contate um administrador.";

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: errorMessage,
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: errorMessage,
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error("Erro ao enviar mensagem de erro:", replyError);
      }
    }
  }
};

// Função para validar URLs
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
