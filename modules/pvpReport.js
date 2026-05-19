const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  ChannelType,
  SlashCommandBuilder,
} = require("discord.js");

const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const ADMIN_CHANNEL_ID = "1506223752969457664";
const REPORT_FORUM_ID = "1506223555388506204";
const ADMIN_ROLE_ID = "1499380210703794287";
const DNV_ROLE_ID = "1499355512922443828";

const sessions = new Map();

const SHIP_CATEGORIES = {
  rate7: {
    label: "Rate VII",
    ships: [
      "Pickle - Rate VII",
      "Friede - Transport Rate VII Flute",
    ],
  },
  rate6: {
    label: "Rate VI",
    ships: [
      "Horizont - Rate VI",
      "Phoenix - Heavy Rate VI Brig",
      "Balloon - Imperial Rate VI Montgolfiere",
      "Polacca - Siege Rate VI Polacca",
      "Mercury - Transport Rate VI Galleon",
    ],
  },
  rate5: {
    label: "Rate V",
    ships: [
      "La Salamandre - Rate V",
      "San Martin - Heavy Rate V Galleon",
      "Black Prince - Imperial Rate V Galleon",
      "Le Requin - Siege Rate V Xebec",
      "Russia - Transport Rate V Frigate",
    ],
  },
  rate4: {
    label: "Rate IV",
    ships: [
      "Blackwind - Rate IV",
      "Constitution - Heavy Rate IV Frigate",
      "Devourer - Imperial Rate IV Barque",
      "Falmouth - Transport Rate IV Ship",
      "Flying Cloud - Transport Rate IV Clipper",
      "Friedrich Wilhelm - Transport Rate IV Frigate",
    ],
  },
  rate3: {
    label: "Rate III",
    ships: [
      "Ancient - Rate III",
      "Azov - Heavy Rate III Ship of the Line",
      "Bellona - Heavy Rate III Ship of the Line",
      "Deadfish - Imperial Rate III Ship",
      "Kobukson - Siege Rate III Phanokson",
      "Morduant - Transport Rate III Ship of the Line",
      "Prins Willem - Transport Rate III Galleon",
    ],
  },
  rate2: {
    label: "Rate II",
    ships: [
      "Redoutable - Heavy Rate II Ship of the Line",
      "St. Pavel - Heavy Rate II Ship of the Line",
      "Vasa - Heavy Rate II Ship of the Line",
      "Octopus - Imperial Rate II Ship",
      "Adventure - Siege Rate II Galley",
      "La Sirene - Transport Rate II Ship",
    ],
  },
  rate1: {
    label: "Rate I",
    ships: [
      "Victory - Rate I",
      "12 Apostolov - Heavy Rate I Ship of the Line",
      "Santisima Trinidad - Heavy Rate I Ship of the Line",
      "Huracan - Imperial Rate I Ship of the Line",
      "La Royale - Siege Rate I Galley",
      "La Couronne - Transport Rate I Galleon",
    ],
  },
};

function isAdmin(member) {
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

function buildCategoryMenu() {
  return new StringSelectMenuBuilder()
    .setCustomId("pvp_ship_category")
    .setPlaceholder("Velg rate/kategori")
    .addOptions(
      Object.entries(SHIP_CATEGORIES).map(([value, category]) => ({
        label: category.label,
        value,
      }))
    );
}

function buildShipMenu(categoryKey) {
  const category = SHIP_CATEGORIES[categoryKey];

  return new StringSelectMenuBuilder()
    .setCustomId("pvp_ships")
    .setPlaceholder(`Velg skip fra ${category.label}`)
    .setMinValues(1)
    .setMaxValues(category.ships.length)
    .addOptions(
      category.ships.map(ship => ({
        label: ship,
        value: ship,
      }))
    );
}

async function buildDnvMemberMenu(guild) {
  await guild.members.fetch();

  const role = guild.roles.cache.get(DNV_ROLE_ID);
  const members = role.members
    .filter(member => !member.user.bot)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map(member => ({
      label: member.displayName.slice(0, 100),
      value: member.id,
    }))
    .slice(0, 25);

  return new StringSelectMenuBuilder()
    .setCustomId("pvp_participants")
    .setPlaceholder("Velg DNV-deltakere")
    .setMinValues(1)
    .setMaxValues(Math.max(1, members.length))
    .addOptions(members);
}

async function makePieChart(enemy, dnv) {
  const canvas = new ChartJSNodeCanvas({ width: 700, height: 450 });

  const buffer = await canvas.renderToBuffer({
    type: "pie",
    data: {
      labels: ["Enemy casualties", "DNV casualties"],
      datasets: [
        {
          data: [enemy, dnv],
          backgroundColor: ["#3498db", "#ff5c8a"],
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#ffffff",
          },
        },
        title: {
          display: true,
          text: "PvP casualties",
          color: "#ffffff",
        },
      },
    },
  });

  return new AttachmentBuilder(buffer, { name: "pvp-piechart.png" });
}

async function postAdminPanel(client) {
  const channel = await client.channels.fetch(ADMIN_CHANNEL_ID);
  const logo = new AttachmentBuilder("./assets/dnv.png", { name: "dnv.png" });

  const embed = new EmbedBuilder()
    .setTitle("PvP Report Panel")
    .setDescription("Trykk på knappen for å lage en ny PvP-rapport.")
    .setThumbnail("attachment://dnv.png")
    .setColor(0xb30000);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pvp_start")
      .setLabel("Create PvP Report")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    embeds: [embed],
    components: [row],
    files: [logo],
  });
}

async function handleInteraction(interaction) {
  if (!interaction.inGuild()) return;

  if (interaction.isButton() && interaction.customId === "pvp_start") {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "Du har ikke tilgang.", ephemeral: true });
    }

    sessions.set(interaction.user.id, {
      participants: [],
      ships: [],
      selectedCategory: null,
    });

    const participantsMenu = await buildDnvMemberMenu(interaction.guild);
    const categoryMenu = buildCategoryMenu();

    const next = new ButtonBuilder()
      .setCustomId("pvp_open_modal")
      .setLabel("Neste")
      .setStyle(ButtonStyle.Success);

    return interaction.reply({
      content: "Velg DNV-deltakere og rate/kategori for skip.",
      components: [
        new ActionRowBuilder().addComponents(participantsMenu),
        new ActionRowBuilder().addComponents(categoryMenu),
        new ActionRowBuilder().addComponents(next),
      ],
      ephemeral: true,
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "pvp_participants") {
    const session = sessions.get(interaction.user.id) || {};
    session.participants = interaction.values;
    sessions.set(interaction.user.id, session);

    return interaction.reply({ content: "Deltakere lagret.", ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "pvp_ship_category") {
    const session = sessions.get(interaction.user.id) || { participants: [], ships: [] };
    session.selectedCategory = interaction.values[0];
    sessions.set(interaction.user.id, session);

    const participantsMenu = await buildDnvMemberMenu(interaction.guild);
    const categoryMenu = buildCategoryMenu();
    const shipMenu = buildShipMenu(session.selectedCategory);

    const next = new ButtonBuilder()
      .setCustomId("pvp_open_modal")
      .setLabel("Neste")
      .setStyle(ButtonStyle.Success);

    return interaction.update({
      content: `Velg skip fra ${SHIP_CATEGORIES[session.selectedCategory].label}. Valgte skip lagres når du velger dem.`,
      components: [
        new ActionRowBuilder().addComponents(participantsMenu),
        new ActionRowBuilder().addComponents(categoryMenu),
        new ActionRowBuilder().addComponents(shipMenu),
        new ActionRowBuilder().addComponents(next),
      ],
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "pvp_ships") {
    const session = sessions.get(interaction.user.id) || { participants: [], ships: [] };
    session.ships = [...new Set([...(session.ships || []), ...interaction.values])];
    sessions.set(interaction.user.id, session);

    return interaction.reply({
      content: `Skip lagret:\n${session.ships.join("\n")}`,
      ephemeral: true,
    });
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
