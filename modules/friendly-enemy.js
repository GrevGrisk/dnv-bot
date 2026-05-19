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

// Lagrer direkte i /modules/friendly-enemy.json
const dataPath = path.join(__dirname, "friendly-enemy.json");
const imagePath = path.join(__dirname, "../assets/dnv.png");

const adminRoleId = process.env.ADMIN_ROLE_ID;
const announcementChannelId = process.env.ANNOUNCEMENT_CHANNEL_ID;

console.log("[FE] Using data file:", dataPath);

function defaultData() {
  return { friendly: [], enemies: [] };
}

function ensureDataFile() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(defaultData(), null, 2), "utf8");
    console.log("[FE] Created new data file:", dataPath);
  }
}

function normalizeData(data) {
  return {
    friendly: Array.isArray(data.friendly) ? data.friendly : [],
    enemies: Array.isArray(data.enemies) ? data.enemies : []
  };
}

function sortList(list) {
  return [...new Set(list)]
    .map(x => String(x).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function loadData() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    return normalizeData(JSON.parse(raw));
  } catch (err) {
    console.error("[FE] Failed to load JSON:", err);
    return defaultData();
  }
}

function saveData(data) {
  const cleanData = normalizeData(data);

  cleanData.friendly = sortList(cleanData.friendly);
  cleanData.enemies = sortList(cleanData.enemies);

  const tempPath = `${dataPath}.tmp`;

  fs.writeFileSync(tempPath, JSON.stringify(cleanData, null, 2), "utf8");
  fs.renameSync(tempPath, dataPath);

  console.log("[FE] Saved data:", cleanData);
}

function createEmbed() {
  return new EmbedBuilder()
    .setTitle("Friendly / Enemy Guild Manager")
    .setDescription("Guild relations panel.")
    .setColor(0xff9900)
    .setImage("attachment://dnv.png");
}

function createAdminButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("fe_add_friendly")
        .setLabel("Add friendly guild")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("fe_add_enemy")
        .setLabel("Add enemy guild")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("fe_remove")
        .setLabel("Remove guild")
        .setStyle(ButtonStyle.Secondary)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("fe_list_friendly")
        .setLabel("List friendly")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("fe_list_enemies")
        .setLabel("List enemies")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function createPublicButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("fe_list_friendly")
        .setLabel("List friendly")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("fe_list_enemies")
        .setLabel("List enemies")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function createModal(customId, title) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title);

  const input = new TextInputBuilder()
    .setCustomId("guildname")
    .setLabel("Guildname")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

function getImageFile() {
  if (!fs.existsSync(imagePath)) return [];
  return [new AttachmentBuilder(imagePath, { name: "dnv.png" })];
}

function isAdmin(interaction) {
  return interaction.member.roles.cache.has(adminRoleId);
}

async function sendAnnouncement(client, title, description, color) {
  if (!announcementChannelId) return;

  const channel = await client.channels.fetch(announcementChannelId).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

module.exports = {
  name: "friendly-enemy",

  data: [
    new SlashCommandBuilder()
      .setName("friendly-enemy")
      .setDescription("Open public friendly/enemy list panel."),

    new SlashCommandBuilder()
      .setName("friendly-enemy-admin")
      .setDescription("Open admin friendly/enemy manager.")
  ],

  hasCommand(commandName) {
    return ["friendly-enemy", "friendly-enemy-admin"].includes(commandName);
  },

  async execute(interaction) {
    if (interaction.commandName === "friendly-enemy-admin") {
      if (!isAdmin(interaction)) {
        return interaction.reply({
          content: "Du har ikke tilgang til admin-panelet.",
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [createEmbed()],
        components: createAdminButtons(),
        files: getImageFile()
      });
    }

    if (interaction.commandName === "friendly-enemy") {
      return interaction.reply({
        embeds: [createEmbed()],
        components: createPublicButtons(),
        files: getImageFile()
      });
    }
  },

  async handleButton(interaction) {
    if (!interaction.customId.startsWith("fe_")) return;

    const data = loadData();

    console.log("[FE] Button:", interaction.customId);
    console.log("[FE] Data file:", dataPath);
    console.log("[FE] Current data:", data);

    if (
      ["fe_add_friendly", "fe_add_enemy", "fe_remove"].includes(interaction.customId) &&
      !isAdmin(interaction)
    ) {
      return interaction.reply({
        content: "Du har ikke tilgang til å endre listen.",
        ephemeral: true
      });
    }

    if (interaction.customId === "fe_add_friendly") {
      return interaction.showModal(
        createModal("fe_modal_add_friendly", "Add friendly guild")
      );
    }

    if (interaction.customId === "fe_add_enemy") {
      return interaction.showModal(
        createModal("fe_modal_add_enemy", "Add enemy guild")
      );
    }

    if (interaction.customId === "fe_remove") {
      return interaction.showModal(
        createModal("fe_modal_remove", "Remove guild")
      );
    }

    if (interaction.customId === "fe_list_friendly") {
      const sorted = sortList(data.friendly);

      const list = sorted.length
        ? sorted.map((x, i) => `${i + 1}. ${x}`).join("\n")
        : "Ingen friendly guilds lagt til.";

      return interaction.reply({
        content: `**Friendly guilds:**\n${list}`,
        ephemeral: true
      });
    }

    if (interaction.customId === "fe_list_enemies") {
      const sorted = sortList(data.enemies);

      const list = sorted.length
        ? sorted.map((x, i) => `${i + 1}. ${x}`).join("\n")
        : "Ingen enemy guilds lagt til.";

      return interaction.reply({
        content: `**Enemy guilds:**\n${list}`,
        ephemeral: true
      });
    }
  },

  async handleModal(interaction, client) {
    if (!interaction.customId.startsWith("fe_modal_")) return;

    if (!isAdmin(interaction)) {
      return interaction.reply({
        content: "Du har ikke tilgang til å endre listen.",
        ephemeral: true
      });
    }

    const data = loadData();
    const guildname = interaction.fields.getTextInputValue("guildname").trim();

    if (!guildname) {
      return interaction.reply({
        content: "Guildnavn kan ikke være tomt.",
        ephemeral: true
      });
    }

    if (interaction.customId === "fe_modal_add_friendly") {
      const wasNew = !data.friendly.includes(guildname);

      if (wasNew) data.friendly.push(guildname);
      data.enemies = data.enemies.filter(x => x !== guildname);

      saveData(data);

      if (wasNew) {
        await sendAnnouncement(
          client,
          "Friendly guild added",
          `Guild **${guildname}** has been added to the friendly list.`,
          0x00aa44
        );
      }

      return interaction.reply({
        content: `Lagt til som friendly guild: **${guildname}**`,
        ephemeral: true
      });
    }

    if (interaction.customId === "fe_modal_add_enemy") {
      const wasNew = !data.enemies.includes(guildname);

      if (wasNew) data.enemies.push(guildname);
      data.friendly = data.friendly.filter(x => x !== guildname);

      saveData(data);

      if (wasNew) {
        await sendAnnouncement(
          client,
          "Enemy guild added",
          `Guild **${guildname}** has been added to the enemies list.`,
          0xcc0000
        );
      }

      return interaction.reply({
        content: `Lagt til som enemy guild: **${guildname}**`,
        ephemeral: true
      });
    }

    if (interaction.customId === "fe_modal_remove") {
      const wasFriendly = data.friendly.includes(guildname);
      const wasEnemy = data.enemies.includes(guildname);

      data.friendly = data.friendly.filter(x => x !== guildname);
      data.enemies = data.enemies.filter(x => x !== guildname);

      saveData(data);

      if (wasFriendly || wasEnemy) {
        await sendAnnouncement(
          client,
          "Guild removed",
          `Guild **${guildname}** has been removed from the ${wasFriendly ? "friendly" : "enemies"} list.`,
          0x0066cc
        );
      }

      return interaction.reply({
        content: `Fjernet guild: **${guildname}**`,
        ephemeral: true
      });
    }
  }
};
