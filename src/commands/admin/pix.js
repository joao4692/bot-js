const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pixqr")
    .setDescription("💳 Gerencia e exibe informações de pagamento via PIX")
    .addSubcommand(subcommand =>
      subcommand
        .setName("mostrar")
        .setDescription("Mostra o QR Code do PIX para pagamento")
        .addBooleanOption(option =>
          option
            .setName("privado")
            .setDescription("Mostrar apenas para você (padrão: falso)")
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("info")
        .setDescription("Mostra apenas as informações do PIX sem QR Code")
        .addBooleanOption(option =>
          option
            .setName("privado")
            .setDescription("Mostrar apenas para você (padrão: falso)")
        )
    ),

  async execute(interaction, client, guildConfig) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      // Verificações básicas de configuração
      if (!guildConfig) {
        return await interaction.reply({
          content: "❌ Este servidor não possui configuração personalizada.",
          ephemeral: true
        });
      }

      const hasPixImage = guildConfig.pixImage && guildConfig.pixImage.trim() !== "";
      const hasPixKey = guildConfig.pixKey && guildConfig.pixKey.trim() !== "";

      if (!hasPixImage && !hasPixKey) {
        return await interaction.reply({
          content: "⚠️ Nenhuma informação de PIX foi configurada neste servidor.\n\n**Configure:**\n- `pixImage`: URL da imagem do QR Code\n- `pixKey`: Chave PIX",
          ephemeral: true
        });
      }

      const isPrivate = interaction.options.getBoolean("privado") || false;

      // Função para criar embed base
      const createBaseEmbed = () => {
        return new EmbedBuilder()
          .setColor(guildConfig.embedColor || "#00bfff")
          .setFooter({
            text: `${interaction.guild.name} • Sistema de Pagamento PIX`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
          })
          .setTimestamp();
      };

      switch (subcommand) {
        case "mostrar":
          if (!hasPixImage) {
            return await interaction.reply({
              content: "⚠️ A imagem do QR Code PIX não foi configurada.\nUse `/pixqr info` para ver as informações disponíveis.",
              ephemeral: true
            });
          }

          const embed = createBaseEmbed()
            .setTitle("💳 Pagamento via PIX")
            .setDescription(
              "Escaneie o QR Code abaixo para realizar o pagamento.\n\n" +
              "📋 **Instruções:**\n" +
              "1. Abra o app do seu banco\n" +
              "2. Escolha a opção 'Pagar com PIX'\n" +
              "3. Escaneie o QR Code ou copie a chave\n\n" +
              (hasPixKey ? `🔑 **Chave PIX:** \`${guildConfig.pixKey}\`` : "")
            )
            .setImage(guildConfig.pixImage)
            .addFields(
              {
                name: "⚡ Vantagens do PIX",
                value: "• Transferência instantânea\n• Disponível 24/7\n• Sem taxas adicionais",
                inline: false
              }
            );

          // Criar botões de ação
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("copy_pix_key")
              .setLabel("📋 Copiar Chave PIX")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(!hasPixKey),
            new ButtonBuilder()
              .setLabel("💬 Suporte")
              .setStyle(ButtonStyle.Link)
              .setURL("https://discord.com/channels/" + interaction.guild.id)
          );

          await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: isPrivate
          });

          // Coletor de interações para o botão de copiar
          const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId === "copy_pix_key" && i.user.id === interaction.user.id,
            time: 60000 // 1 minuto
          });

          collector.on("collect", async (i) => {
            try {
              await i.update({
                content: `📋 **Chave PIX copiada:** \`${guildConfig.pixKey}\`\n\n*Esta mensagem será excluída em 10 segundos...*`,
                components: [],
                embeds: []
              });

              setTimeout(() => {
                i.deleteReply().catch(() => {});
              }, 10000);
            } catch (error) {
              console.error("Erro ao processar clique no botão:", error);
            }
          });

          collector.on("end", () => {
            // Desativar botões após o tempo
            interaction.editReply({
              components: []
            }).catch(() => {});
          });

          break;

        case "info":
          const infoEmbed = createBaseEmbed()
            .setTitle("💳 Informações de Pagamento PIX")
            .setDescription("Dados para transferência via PIX:")
            .addFields(
              {
                name: "🔑 Chave PIX",
                value: hasPixKey ? `\`${guildConfig.pixKey}\`` : "Não configurada",
                inline: false
              },
              {
                name: "🖼️ QR Code",
                value: hasPixImage ? "✅ Disponível (use `/pixqr mostrar`)" : "❌ Não configurado",
                inline: false
              },
              {
                name: "⚠️ Importante",
                value: "• Confira os dados antes de enviar\n• Guarde o comprovante\n• Em caso de dúvidas, contate a administração",
                inline: false
              }
            );

          await interaction.reply({
            embeds: [infoEmbed],
            ephemeral: isPrivate
          });

          break;

        default:
          await interaction.reply({
            content: "❌ Subcomando inválido.",
            ephemeral: true
          });
      }

    } catch (error) {
      console.error("Erro no comando /pixqr:", error);
      
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