const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const reportChannelId = process.env.REPORT_CHANNEL_ID;
const imagePath = path.join(__dirname, "../assets/dnv.png");

function createMainEmbed() {
  return new EmbedBuilder()
    .setTitle("Report Sinking / Incident")
    .setDescription("Use the buttons below to report an incident or sinking.")
    .setColor(0xff9900)
    .setImage("attachment://dnv.png");
}

function createButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("report_incident")
        .setLabel("Report incident")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("report_sinking")
        .setLabel("Report sinking")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function createReportModal(type) {
  const modal = new ModalBuilder()
    .setCustomId(`report_modal_${type}`)
    .setTitle(type === "sinking" ? "Report sinking" : "Report incident");

  const ingameName = new TextInputBuilder()
    .setCustomId("ingame_name")
    .setLabel("Your ingame name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const enemyName = new TextInputBuilder()
    .setCustomId("enemy_player_name")
    .setLabel("Enemy player name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const enemyGuild = new TextInputBuilder()
    .setCustomId("enemy_guild")
    .setLabel("Guild of attacking player")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const incidentDescription = new TextInputBuilder()
    .setCustomId("incident_description")
    .setLabel("Describe the incident")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const lossDescription = new TextInputBuilder()
    .setCustomId("loss_description")
    .setLabel("Describe your loss")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(ingameName),
    new ActionRowBuilder().addComponents(enemyName),
    new ActionRowBuilder().addComponents(enemyGuild),
    new ActionRowBuilder().addComponents(incidentDescription),
    new ActionRowBuilder().addComponents(lossDescription)
  );

  return modal;
}

module.exports = {
  name: "report-incident",

  data: new SlashCommandBuilder()
    .setName("report-incident")
    .setDescription("Open report sinking / incident panel."),

  async execute(interaction) {
    const files = [];

    if (fs.existsSync(imagePath)) {
      files.push(new AttachmentBuilder(imagePath, { name: "dnv.png" }));
    }

    await interaction.reply({
      embeds: [createMainEmbed()],
      components: createButtons(),
      files
    });
  },

  async handleButton(interaction) {
    if (interaction.customId === "report_incident") {
      return interaction.showModal(createReportModal("incident"));
    }

    if (interaction.customId === "report_sinking") {
      return interaction.showModal(createReportModal("sinking"));
    }
  },

  async handleModal(interaction, client) {
    if (!interaction.customId.startsWith("report_modal_")) return;

    const type = interaction.customId === "report_modal_sinking"
      ? "Sinking"
      : "Incident";

    const ingameName = interaction.fields.getTextInputValue("ingame_name");
    const enemyName = interaction.fields.getTextInputValue("enemy_player_name");
    const enemyGuild = interaction.fields.getTextInputValue("enemy_guild");
    const incidentDescription = interaction.fields.getTextInputValue("incident_description");
    const lossDescription = interaction.fields.getTextInputValue("loss_description");

    const reportChannel = await client.channels.fetch(reportChannelId).catch(() => null);

    if (!reportChannel) {
      return interaction.reply({
        content: "Report channel ble ikke funnet.",
        ephemeral: true
      });
    }

    const reportEmbed = new EmbedBuilder()
      .setTitle(`New ${type} Report`)
      .setColor(type === "Sinking" ? 0x990000 : 0xff9900)
      .addFields(
        { name: "Reported by", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Your ingame name", value: ingameName, inline: true },
        { name: "Enemy player name", value: enemyName, inline: true },
        { name: "Guild of attacking player", value: enemyGuild, inline: true },
        { name: "Describe the incident", value: incidentDescription },
        { name: "Describe your loss", value: lossDescription }
      )
      .setTimestamp();

    await reportChannel.send({
      embeds: [reportEmbed]
    });

    return interaction.reply({
      content: `${type} report sendt inn.`,
      ephemeral: true
    });
  }
};