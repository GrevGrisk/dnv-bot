const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  AttachmentBuilder,
  ChannelType,
  SlashCommandBuilder,
} = require("discord.js");

const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const ADMIN_CHANNEL_ID = "1506223752969457664";
const REPORT_FORUM_ID = "1506223555388506204";
const ADMIN_ROLE_ID = "1499380210703794287";

const sessions = new Map();

const SHIPS = [
  { label: "Pickle - Rate VII", value: "Pickle - Rate VII" },
  { label: "Horizont - Rate VI", value: "Horizont - Rate VI" },
  { label: "Phoenix - Heavy Rate VI Brig", value: "Phoenix - Heavy Rate VI Brig" },
  { label: "Balloon - Imperial Rate VI Montgolfiere", value: "Balloon - Imperial Rate VI Montgolfiere" },
  { label: "Polacca - Siege Rate VI Polacca", value: "Polacca - Siege Rate VI Polacca" },
  { label: "Mercury - Transport Rate VI Galleon", value: "Mercury - Transport Rate VI Galleon" },
  { label: "La Salamandre - Rate V", value: "La Salamandre - Rate V" },
  { label: "San Martin - Heavy Rate V Galleon", value: "San Martin - Heavy Rate V Galleon" },
  { label: "Black Prince - Imperial Rate V Galleon", value: "Black Prince - Imperial Rate V Galleon" },
  { label: "Le Requin - Siege Rate V Xebec", value: "Le Requin - Siege Rate V Xebec" },
  { label: "Russia - Transport Rate V Frigate", value: "Russia - Transport Rate V Frigate" },
  { label: "Blackwind - Rate IV", value: "Blackwind - Rate IV" },
  { label: "Constitution - Heavy Rate IV Frigate", value: "Constitution - Heavy Rate IV Frigate" },
  { label: "Devourer - Imperial Rate IV Barque", value: "Devourer - Imperial Rate IV Barque" },
  { label: "Falmouth - Transport Rate IV Ship", value: "Falmouth - Transport Rate IV Ship" },
  { label: "Flying Cloud - Transport Rate IV Clipper", value: "Flying Cloud - Transport Rate IV Clipper" },
  { label: "Friedrich Wilhelm - Transport Rate IV Frigate", value: "Friedrich Wilhelm - Transport Rate IV Frigate" },
  { label: "Ancient - Rate III", value: "Ancient - Rate III" },
  { label: "Azov - Heavy Rate III Ship of the Line", value: "Azov - Heavy Rate III Ship of the Line" },
  { label: "Bellona - Heavy Rate III Ship of the Line", value: "Bellona - Heavy Rate III Ship of the Line" },
  { label: "Deadfish - Imperial Rate III Ship", value: "Deadfish - Imperial Rate III Ship" },
  { label: "Kobukson - Siege Rate III Phanokson", value: "Kobukson - Siege Rate III Phanokson" },
  { label: "Morduant - Transport Rate III Ship of the Line", value: "Morduant - Transport Rate III Ship of the Line" },
  { label: "Prins Willem - Transport Rate III Galleon", value: "Prins Willem - Transport Rate III Galleon" },
  { label: "Redoutable - Heavy Rate II Ship of the Line", value: "Redoutable - Heavy Rate II Ship of the Line" },
  { label: "St. Pavel - Heavy Rate II Ship of the Line", value: "St. Pavel - Heavy Rate II Ship of the Line" },
  { label: "Vasa - Heavy Rate II Ship of the Line", value: "Vasa - Heavy Rate II Ship of the Line" },
  { label: "Octopus - Imperial Rate II Ship", value: "Octopus - Imperial Rate II Ship" },
  { label: "Adventure - Siege Rate II Galley", value: "Adventure - Siege Rate II Galley" },
  { label: "La Sirene - Transport Rate II Ship", value: "La Sirene - Transport Rate II Ship" },
  { label: "Victory - Rate I", value: "Victory - Rate I" },
  { label: "12 Apostolov - Heavy Rate I Ship of the Line", value: "12 Apostolov - Heavy Rate I Ship of the Line" },
  { label: "Santisima Trinidad - Heavy Rate I Ship of the Line", value: "Santisima Trinidad - Heavy Rate I Ship of the Line" },
  { label: "Huracan - Imperial Rate I Ship of the Line", value: "Huracan - Imperial Rate I Ship of the Line" },
  { label: "La Royale - Siege Rate I Galley", value: "La Royale - Siege Rate I Galley" },
  { label: "La Couronne - Transport Rate I Galleon", value: "La Couronne - Transport Rate I Galleon" },
];

function isAdmin(member) {
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

async function makePieChart(enemy, dnv) {
  const canvas = new ChartJSNodeCanvas({ width: 700, height: 450 });

  const buffer = await canvas.renderToBuffer({
    type: "pie",
    data: {
      labels: ["Enemy casualties", "DNV casualties"],
      datasets: [{ data: [enemy, dnv] }],
    },
  });

  return new AttachmentBuilder(buffer, { name: "pvp-piechart.png" });
}

async function postAdminPanel(client) {
  const channel = await client.channels.fetch(ADMIN_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle("PvP Report Panel")
    .setDescription("Trykk på knappen for å lage en ny PvP-rapport.")
    .setColor(0xb30000);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pvp_start")
      .setLabel("Create PvP Report")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleInteraction(interaction) {
  if (!interaction.inGuild()) return;

  if (interaction.isButton() && interaction.customId === "pvp_start") {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "Du har ikke tilgang.", ephemeral: true });
    }

    sessions.set(interaction.user.id, { participants: [], ships: [] });

    const users = new UserSelectMenuBuilder()
      .setCustomId("pvp_participants")
      .setPlaceholder("Velg DNV-deltakere")
      .setMinValues(1)
      .setMaxValues(25);

    const ships1 = new StringSelectMenuBuilder()
      .setCustomId("pvp_ships_1")
      .setPlaceholder("Velg skip")
      .setMinValues(1)
      .setMaxValues(10)
      .addOptions(SHIPS.slice(0, 25));

    const ships2 = new StringSelectMenuBuilder()
      .setCustomId("pvp_ships_2")
      .setPlaceholder("Flere skip, valgfritt")
      .setMinValues(0)
      .setMaxValues(10)
      .addOptions(SHIPS.slice(25));

    const next = new ButtonBuilder()
      .setCustomId("pvp_open_modal")
      .setLabel("Neste")
      .setStyle(ButtonStyle.Success);

    return interaction.reply({
      content: "Velg deltakere og skip. Trykk deretter Neste.",
      components: [
        new ActionRowBuilder().addComponents(users),
        new ActionRowBuilder().addComponents(ships1),
        new ActionRowBuilder().addComponents(ships2),
        new ActionRowBuilder().addComponents(next),
      ],
      ephemeral: true,
    });
  }

  if (interaction.isUserSelectMenu() && interaction.customId === "pvp_participants") {
    const session = sessions.get(interaction.user.id) || {};
    session.participants = interaction.values;
    sessions.set(interaction.user.id, session);

    return interaction.reply({ content: "Deltakere lagret.", ephemeral: true });
  }

  if (
    interaction.isStringSelectMenu() &&
    ["pvp_ships_1", "pvp_ships_2"].includes(interaction.customId)
  ) {
    const session = sessions.get(interaction.user.id) || { ships: [] };
    session.ships = [...new Set([...(session.ships || []), ...interaction.values])];
    sessions.set(interaction.user.id, session);

    return interaction.reply({ content: "Skip lagret.", ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === "pvp_open_modal") {
    const modal = new ModalBuilder()
      .setCustomId("pvp_submit")
      .setTitle("PvP Report");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("date")
          .setLabel("Date of PvP event")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("enemy")
          .setLabel("Enemy casualties / sinks")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("dnv")
          .setLabel("DNV casualties / sinks")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("notes")
          .setLabel("Notes")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
      )
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "pvp_submit") {
    const session = sessions.get(interaction.user.id);

    if (!session) {
      return interaction.reply({ content: "Rapport-data mangler.", ephemeral: true });
    }

    const date = interaction.fields.getTextInputValue("date");
    const enemy = Number(interaction.fields.getTextInputValue("enemy"));
    const dnv = Number(interaction.fields.getTextInputValue("dnv"));
    const notes = interaction.fields.getTextInputValue("notes") || "None";

    if (Number.isNaN(enemy) || Number.isNaN(dnv)) {
      return interaction.reply({ content: "Casualties må være tall.", ephemeral: true });
    }

    const kd = dnv === 0 ? enemy.toFixed(2) : (enemy / dnv).toFixed(2);

    const participants = session.participants.length
      ? session.participants.map(id => `<@${id}>`).join(", ")
      : "None";

    const ships = session.ships.length ? session.ships.join("\n") : "None";

    const chart = await makePieChart(enemy, dnv);

    const embed = new EmbedBuilder()
      .setTitle("PvP Report")
      .setColor(0xb30000)
      .addFields(
        { name: "Date", value: date },
        { name: "Who participated", value: participants },
        { name: "What ships were used", value: ships },
        { name: "Enemy casualties", value: String(enemy), inline: true },
        { name: "DNV casualties", value: String(dnv), inline: true },
        { name: "K/D ratio", value: kd, inline: true },
        { name: "Notes", value: notes }
      )
      .setImage("attachment://pvp-piechart.png")
      .setFooter({ text: `Created by ${interaction.user.tag}` })
      .setTimestamp();

    const forum = await interaction.client.channels.fetch(REPORT_FORUM_ID);

    if (!forum || forum.type !== ChannelType.GuildForum) {
      return interaction.reply({ content: "Forumkanalen ble ikke funnet.", ephemeral: true });
    }

    await forum.threads.create({
      name: `PvP Report - ${date}`,
      message: {
        embeds: [embed],
        files: [chart],
      },
    });

    sessions.delete(interaction.user.id);

    return interaction.reply({ content: "PvP-rapport postet.", ephemeral: true });
  }
}

module.exports = {
  name: "pvppanel",

  data: new SlashCommandBuilder()
    .setName("pvppanel")
    .setDescription("Post PvP report panel"),

  hasCommand(commandName) {
    return commandName === "pvppanel";
  },

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "Du har ikke tilgang.",
        ephemeral: true,
      });
    }

    await postAdminPanel(client);

    return interaction.reply({
      content: "PvP panel postet.",
      ephemeral: true,
    });
  },

  postAdminPanel,
  handleInteraction,
};
