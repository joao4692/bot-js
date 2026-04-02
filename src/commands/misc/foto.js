const fs = require('fs');
const path = require('path');
const { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('foto')
    .setDescription('Envia uma imagem aleatória da pasta de imagens'),
  
  category: 'misc',

  async execute(interaction) {
    try {
      // Defere a resposta
      await interaction.deferReply();

      const pasta = path.join(__dirname, "..", "..", "imagens");

      // Verifica se a pasta existe
      if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true });
        
        const embed = new EmbedBuilder()
          .setColor('FF5733')
          .setTitle('❌ Pasta vazia')
          .setDescription('A pasta de imagens foi criada, mas ainda não contém nenhuma imagem.\n\nAdicione imagens na pasta: `src/imagens/`')
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      // Lê e filtra apenas imagens válidas
      const arquivos = fs.readdirSync(pasta).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return VALID_EXTENSIONS.includes(ext) && !file.startsWith('.');
      });

      if (arquivos.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('FF5733')
          .setTitle('❌ Nenhuma imagem encontrada')
          .setDescription('Não há imagens válidas na pasta.\n\nFormatos aceitos: JPG, PNG, GIF, WEBP, BMP')
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      // Envia response inicial
      const embedInicial = new EmbedBuilder()
        .setColor('36393F')
        .setTitle('📸 Enviando imagens...')
        .setDescription(`Total de ${arquivos.length} imagem(ns) para enviar`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embedInicial] });

      // Envia cada imagem uma por uma
      for (let i = 0; i < arquivos.length; i++) {
        const nomeArquivo = arquivos[i];
        const caminhoImagem = path.join(pasta, nomeArquivo);

        // Verifica se o arquivo existe
        if (!fs.existsSync(caminhoImagem)) {
          console.warn(`Arquivo não encontrado: ${caminhoImagem}`);
          continue;
        }

        try {
          // Cria o anexo
          const attachment = new AttachmentBuilder(caminhoImagem);

          // Cria embed para cada imagem
          const embed = new EmbedBuilder()
            .setImage(`attachment://${nomeArquivo}`)
            .setColor('36393F')
            .setFooter({ text: `Imagem ${i + 1}/${arquivos.length}` })
            .setTimestamp();

          // Envia a imagem
          await interaction.channel.send({ 
            embeds: [embed],
            files: [attachment] 
          });

          // Pequeno delay entre envios para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`Erro ao enviar imagem ${nomeArquivo}:`, error);
        }
      }

    } catch (error) {
      console.error('Erro no slash command foto:', error);

      const embed = new EmbedBuilder()
        .setColor('FF5733')
        .setTitle('❌ Erro')
        .setDescription('Ocorreu um erro ao processar o comando.')
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
