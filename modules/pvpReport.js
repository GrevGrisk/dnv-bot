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
    label: "VII rate",
    ships: [
      "Pickle - VII rate - Fast line",
      "Horizon - VII rate - Combat line",
      "Friede - VII rate - Cargo line",
    ],
  },
  rate6: {
    label: "VI rate",
    ships: [
      "Le Cerf - VI rate - Fast line",
      "La Salamandre - VI rate - Combat line",
      "Mercury - VI rate - Cargo line",
      "Phoenix - VI rate - Heavy line",
      "Polacca - VI rate - Siege line",
      "Ballon - VI rate - Imperial line",
      "Savannah - VI rate - Premium fast line",
      "Golden Apostle - VI rate - Premium siege line",
      "Shunsen - VI rate - Premium combat line",
    ],
  },
  rate5: {
    label: "V rate",
    ships: [
      "Le Creole - V rate - Fast line",
      "Black Wind - V rate - Combat line",
      "Russia - V rate - Cargo line",
      "San Martin - V rate - Heavy line",
      "Le Requin - V rate - Siege line",
      "Black Prince - V rate - Imperial line",
      "Eagle - V rate - Premium siege line",
      "Axel Thorsen - V rate - Premium fast line",
      "Kwee Song - V rate - Premium combat line",
      "Southampton - V rate - Premium cargo line",
    ],
  },
  rate4: {
    label: "IV rate",
    ships: [
      "Surprise - IV rate - Fast line",
      "Essex - IV rate - Combat line",
      "Falmouth - IV rate - Cargo line",
      "Constitution - IV rate - Heavy line",
      "Devourer - IV rate - Imperial line",
      "Red Arrow - IV rate - Premium combat line",
      "Sparrow - IV rate - Premium siege line",
      "Friedrich Wilhelm - IV rate - Premium cargo line",
      "Flying Cloud - IV rate - Premium cargo line",
      "Three Hierarchs - IV rate - Premium heavy line",
    ],
  },
  rate3: {
    label: "III rate",
    ships: [
      "Poltava - III rate - Fast line",
      "Anson - III rate - Combat line",
      "Mordaunt - III rate - Cargo line",
      "Bellona - III rate - Heavy line",
      "Kobukson - III rate - Siege line",
      "Deadfish - III rate - Imperial line",
      "Prins Willem - III rate - Premium cargo line",
      "Le Saint Louis - III rate - Premium combat line",
      "Azov - III rate - Premium heavy line",
      "Shen - III rate - Premium siege line",
      "Iberia - III rate - Premium fast line",
    ],
  },
  rate2: {
    label: "II rate",
    ships: [
      "Ingermanland - II rate - Fast line",
      "Sans Pareil - II rate - Combat line",
      "La Sirene - II rate - Cargo line",
      "Redoutable - II rate - Heavy line",
      "Adventure - II rate - Siege line",
      "Octopus - II rate - Imperial line",
      "Firestorm - II rate - Premium fast line",
      "Neptuno - II rate - Premium combat line",
      "Vasa - II rate - Premium heavy line",
      "St. Pavel - II rate - Premium heavy line",
      "Montanes - II rate - Premium combat line",
    ],
  },
  rate1: {
    label: "I rate",
    ships: [
      "Victory - I rate - Combat line",
      "La Couronne - I rate - Cargo line",
      "12 Apostolov - I rate - Heavy line",
      "La Royale - I rate - Siege line",
      "Huracan - I rate - Imperial line",
      "Santisima Trinidad - I rate - Premium heavy line",
      "De Zeven Provincien - I rate - Premium combat line",
      "Sovereign - I rate - Premium combat line",
    ],
  },
};

function isAdmin(member) {
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

async function getDnvMembers(guild) {
  await guild.members.fetch();

  const role = guild.roles.cache.get(DNV_ROLE_ID);
  if (!role) return [];

  return role.members
    .filter(member => !member.user.bot)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map(member => ({
      label: member.displayName.slice(0, 100),
      value: member.id,
    }))
    .slice(0, 25);
}

function getSession(interaction) {
  return sessions.get(interaction.user.id);
}

function buildMemberMenu(session) {
  return new StringSelectMenuBuilder()
    .setCustomId("pvp_member")
    .setPlaceholder("Velg DNV-medlem")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(session.memberOptions);
}

function buildCategoryMenu() {
  return new StringSelectMenuBuilder()
    .setCustomId("pvp_ship_category")
    .setPlaceholder("Velg rate")
    .setMinValues(1)
    .setMaxValues(1)
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
    .setPlaceholder(`Velg ett eller flere skip fra ${category.label}`)
    .setMinValues(1)
    .setMaxValues(category.ships.length)
    .addOptions(
      category.ships.map(ship => ({
        label: ship.slice(0, 100),
        value: ship,
      }))
    );
}

function buildSessionContent(session) {
  const selectedMember = session.currentMemberLabel || "Ingen valgt";

  const selectedShips = session.currentShips.length
    ? session.currentShips.map(ship => `- ${ship}`).join("\n")
    : "Ingen valgt";

  const added = session.entries.length
    ? session.entries
        .map(entry => {
          const ships = entry.ships.map(ship => `- ${ship}`).join("\n");
          return `**${entry.memberLabel}**\n${ships}`;
        })
        .join("\n\n")
    : "Ingen lagt til enda.";

  return [
    "**Lag PvP-rapport**",
    "",
    `Valgt medlem: **${selectedMember}**`,
    "",
    "**Valgte skip:**",
    selectedShips,
    "",
    "**Lagt til i rapporten:**",
    added,
    "",
    "Velg medlem, rate og ett eller flere skip. Trykk deretter **Legg til / oppdater deltaker**.",
  ].join("\n");
}

function buildSessionComponents(session) {
  const components = [
    new ActionRowBuilder().addComponents(buildMemberMenu(session)),
    new ActionRowBuilder().addComponents(buildCategoryMenu()),
  ];

  if (session.selectedCategory) {
    components.push(
      new ActionRowBuilder().addComponents(buildShipMenu(session.selectedCategory))
    );
  }

  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("pvp_add_entry")
        .setLabel("Legg til / oppdater deltaker")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("pvp_clear_current")
        .setLabel("Nullstill valg")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("pvp_clear_entries")
        .setLabel("Tøm rapport")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("pvp_open_modal")
        .setLabel("Neste")
        .setStyle(ButtonStyle.Success)
    )
  );

  return components;
}

async function updateSessionMessage(interaction, session) {
  await interaction.deferUpdate();

  return interaction.editReply({
    content: buildSessionContent(session),
    components: buildSessionComponents(session),
  });
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

    await interaction.deferReply({ ephemeral: true });

    const memberOptions = await getDnvMembers(interaction.guild);

    if (!memberOptions.length) {
      return interaction.editReply({
        content: "Fant ingen medlemmer med DNV-rollen.",
      });
    }

    const session = {
      memberOptions,
      entries: [],
      currentMemberId: null,
      currentMemberLabel: null,
      selectedCategory: null,
      currentShips: [],
    };

    sessions.set(interaction.user.id, session);

    return interaction.editReply({
      content: buildSessionContent(session),
      components: buildSessionComponents(session),
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "pvp_member") {
    const session = getSession(interaction);

    if (!session) {
      return interaction.reply({ content: "Session mangler. Start på nytt.", ephemeral: true });
    }

    session.currentMemberId = interaction.values[0];
    session.currentMemberLabel =
      session.memberOptions.find(member => member.value === session.currentMemberId)?.label || "Unknown";

    sessions.set(interaction.user.id, session);

    return updateSessionMessage(interaction, session);
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "pvp_ship_category") {
    const session = getSession(interaction);

    if (!session) {
      return interaction.reply({ content: "Session mangler. Start på nytt.", ephemeral: true });
    }

    session.selectedCategory = interaction.values[0];
    session.currentShips = [];

    sessions.set(interaction.user.id, session);

    return updateSessionMessage(interaction, session);
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "pvp_ships") {
    const session = getSession(interaction);

    if (!session) {
      return interaction.reply({ content: "Session mangler. Start på nytt.", ephemeral: true });
    }

    session.currentShips = interaction.values;

    sessions.set(interaction.user.id, session);

    return updateSessionMessage(interaction, session);
  }

  if (interaction.isButton() && interaction.customId === "pvp_add_entry") {
    const session = getSession(interaction);

    if (!session) {
      return interaction.reply({ content: "Session mangler. Start på nytt.", ephemeral: true });
    }

    if (!session.currentMemberId || !session.currentShips.length) {
      return interaction.reply({
        content: "Velg både medlem og minst ett skip først.",
        ephemeral: true,
      });
    }

    const existingIndex = session.entries.findIndex(
      entry => entry.memberId === session.currentMemberId
    );

    const entry = {
      memberId: session.currentMemberId,
      memberLabel: session.currentMemberLabel,
      ships: session.currentShips,
    };

    if (existingIndex >= 0) {
      session.entries[existingIndex].ships = [
        ...new Set([
          ...session.entries[existingIndex].ships,
          ...session.currentShips,
        ]),
      ];
    } else {
      session.entries.push(entry);
    }

    session.currentMemberId = null;
    session.currentMemberLabel = null;
    session.selectedCategory = null;
    session.currentShips = [];

    sessions.set(interaction.user.id, session);

    return updateSessionMessage(interaction, session);
  }

  if (interaction.isButton() && interaction.customId === "pvp_clear_current") {
    const session = getSession(interaction);

    if (!session) {
      return interaction.reply({ content: "Session mangler. Start på nytt.", ephemeral: true });
    }

    session.currentMemberId = null;
    session.currentMemberLabel = null;
    session.selectedCategory = null;
    session.currentShips = [];

    sessions.set(interaction.user.id, session);

    return updateSessionMessage(interaction, session);
  }

  if (interaction.isButton() && interaction.customId === "pvp_clear_entries") {
    const session = getSession(interaction);

    if (!session) {
      return interaction.reply({ content: "Session mangler. Start på nytt.", ephemeral: true });
    }

    session.entries = [];
    session.currentMemberId = null;
    session.currentMemberLabel = null;
    session.selectedCategory = null;
    session.currentShips = [];

    sessions.set(interaction.user.id, session);

    return updateSessionMessage(interaction, session);
  }

  if (interaction.isButton() && interaction.customId === "pvp_open_modal") {
    const session = getSession(interaction);

    if (!session || !session.entries.length) {
      return interaction.reply({
        content: "Du må legge til minst én deltaker først.",
        ephemeral: true,
      });
    }

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
    const session = getSession(interaction);

    if (!session) {
      return interaction.reply({ content: "Rapport-data mangler.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const date = interaction.fields.getTextInputValue("date");
    const enemy = Number(interaction.fields.getTextInputValue("enemy"));
    const dnv = Number(interaction.fields.getTextInputValue("dnv"));
    const notes = interaction.fields.getTextInputValue("notes") || "None";

    if (Number.isNaN(enemy) || Number.isNaN(dnv)) {
      return interaction.editReply({ content: "Casualties må være tall." });
    }

    const kd = dnv === 0 ? enemy.toFixed(2) : (enemy / dnv).toFixed(2);

    const participants = session.entries
      .map(entry => {
        const ships = entry.ships.map(ship => `- ${ship}`).join("\n");
        return `<@${entry.memberId}>\n${ships}`;
      })
      .join("\n\n");

    const chart = await makePieChart(enemy, dnv);

    const embed = new EmbedBuilder()
      .setTitle("PvP Report")
      .setColor(0xb30000)
      .addFields(
        { name: "Date", value: date },
        { name: "Who participated / Ships used", value: participants },
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
      return interaction.editReply({ content: "Forumkanalen ble ikke funnet." });
    }

    await forum.threads.create({
      name: `PvP Report - ${date}`,
      message: {
        embeds: [embed],
        files: [chart],
      },
    });

    sessions.delete(interaction.user.id);

    return interaction.editReply({
      content: "PvP-rapport postet.",
    });
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

    await interaction.deferReply({ ephemeral: true });

    await postAdminPanel(client);

    return interaction.editReply({
      content: "PvP panel postet.",
    });
  },

  postAdminPanel,
  handleInteraction,
};
