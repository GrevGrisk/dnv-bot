const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const TICKET_CATEGORY_ID = "1503011829280931840";
const STAFF_ROLE_ID = "1499380210703794287";
const TRANSCRIPT_CHANNEL_ID = "1503014308605333625";

const DNV_ROLE_ID = "1499355512922443828";
const CREW_ROLE_ID = "1499355062168715264";
const FIRST_MATE_ROLE_ID = "1499354585024692294";
const CAPTAIN_ROLE_ID = "1499353795925377055";
const DNV_FRIEND_ROLE_ID = "1499388464070660236";

const logoPath = path.join(__dirname, "../assets/dnv.png");

const ticketTypes = {
  guild: {
    label: "Request guild access",
    color: 0x2ecc71,
    channelPrefix: "guild",
    modalTitle: "Request guild access",
    fields: [
      ["ingame_name", "Ingame name", TextInputStyle.Short],
      ["about_yourself", "Tell us about yourself", TextInputStyle.Paragraph],
      ["where_from", "Where are you from?", TextInputStyle.Short],
      ["prior_guilds", "Any prior guilds?", TextInputStyle.Paragraph]
    ]
  },

  friend: {
    label: "Request friend access",
    color: 0x3498db,
    channelPrefix: "friend",
    modalTitle: "Request friend access",
    fields: [
      ["ingame_name", "Ingame name", TextInputStyle.Short],
      ["guild", "Guild", TextInputStyle.Short],
      ["faction", "Faction", TextInputStyle.Short],
      ["purpose", "Purpose of request", TextInputStyle.Paragraph]
    ]
  },

  question: {
    label: "General questions",
    color: 0xff9900,
    channelPrefix: "question",
    modalTitle: "General questions",
    fields: [
      ["ingame_name", "Ingame name", TextInputStyle.Short],
      ["guild", "Guild", TextInputStyle.Short],
      ["faction", "Faction", TextInputStyle.Short],
      ["question", "Describe your question", TextInputStyle.Paragraph]
    ]
  }
};

function cleanName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 20);
}

function createTicketPanel() {
  const embed = new EmbedBuilder()
    .setTitle("DNV Support Tickets")
    .setDescription(
      [
        "Use the buttons below to open a ticket.",
        "",
        "Request guild access",
        "Request friend access",
        "General questions"
      ].join("\n")
    )
    .setColor(0xff9900);

  const files = [];

  if (fs.existsSync(logoPath)) {
    embed.setImage("attachment://dnv.png");
    files.push(new AttachmentBuilder(logoPath, { name: "dnv.png" }));
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_open_guild")
      .setLabel("Request guild access")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("ticket_open_friend")
      .setLabel("Request friend access")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ticket_open_question")
      .setLabel("General questions")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row],
    files
  };
}

function createTicketModal(type) {
  const config = ticketTypes[type];

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(config.modalTitle);

  for (const [id, label, style] of config.fields) {
    const input = new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setStyle(style)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  return modal;
}

function createCloseButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Close ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

function createRoleButtons(type) {
  if (type === "guild") {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_role_crew")
        .setLabel("Crew")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("ticket_role_first_mate")
        .setLabel("1st Mate")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("ticket_role_captain")
        .setLabel("Captain")
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (type === "friend") {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_role_dnv_friend")
        .setLabel("Assign DNV Friend")
        .setStyle(ButtonStyle.Success)
    );
  }

  return null;
}

function getTicketUserId(channel) {
  if (!channel.topic) return null;

  const match = channel.topic.match(/user:(\d+)/);
  return match ? match[1] : null;
}

function getTicketType(channel) {
  if (!channel.topic) return null;

  const match = channel.topic.match(/type:([a-z]+)/);
  return match ? match[1] : null;
}

async function createTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp
  );

  return sorted.map(msg => {
    const time = new Date(msg.createdTimestamp).toLocaleString();
    const author = msg.author?.tag || "Unknown";
    const content = msg.content || "";

    const embeds = msg.embeds.length
      ? `\n[Embeds: ${msg.embeds.length}]`
      : "";

    const attachments = msg.attachments.size
      ? `\n[Attachments: ${msg.attachments.map(a => a.url).join(", ")}]`
      : "";

    return `[${time}] ${author}: ${content}${embeds}${attachments}`;
  }).join("\n");
}

async function handleRoleButton(interaction) {
  if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
    return interaction.reply({
      content: "You do not have permission to use this button.",
      ephemeral: true
    });
  }

  const targetUserId = getTicketUserId(interaction.channel);
  const ticketType = getTicketType(interaction.channel);

  if (!targetUserId) {
    return interaction.reply({
      content: "Could not find ticket owner.",
      ephemeral: true
    });
  }

  const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);

  if (!member) {
    return interaction.reply({
      content: "Could not find the member in this server.",
      ephemeral: true
    });
  }

  let rolesToAdd = [];
  let roleName = "";

  if (ticketType === "guild") {
    if (interaction.customId === "ticket_role_crew") {
      rolesToAdd = [DNV_ROLE_ID, CREW_ROLE_ID];
      roleName = "DNV + Crew";
    }

    if (interaction.customId === "ticket_role_first_mate") {
      rolesToAdd = [DNV_ROLE_ID, FIRST_MATE_ROLE_ID];
      roleName = "DNV + 1st Mate";
    }

    if (interaction.customId === "ticket_role_captain") {
      rolesToAdd = [DNV_ROLE_ID, CAPTAIN_ROLE_ID];
      roleName = "DNV + Captain";
    }
  }

  if (ticketType === "friend" && interaction.customId === "ticket_role_dnv_friend") {
    rolesToAdd = [DNV_FRIEND_ROLE_ID];
    roleName = "DNV Friend";
  }

  if (!rolesToAdd.length) {
    return interaction.reply({
      content: "This role button does not match this ticket type.",
      ephemeral: true
    });
  }

  await member.roles.add(rolesToAdd);

  return interaction.reply({
    content: `${roleName} assigned to <@${targetUserId}>.`,
    ephemeral: false
  });
}

module.exports = {
  name: "tickets",

  data: new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Open the ticket panel."),

  async execute(interaction) {
    await interaction.reply(createTicketPanel());
  },

  async handleButton(interaction) {
    if (interaction.customId.startsWith("ticket_open_")) {
      const type = interaction.customId.replace("ticket_open_", "");

      if (!ticketTypes[type]) return;

      return interaction.showModal(createTicketModal(type));
    }

    if (interaction.customId.startsWith("ticket_role_")) {
      return handleRoleButton(interaction);
    }

    if (interaction.customId === "ticket_close") {
      const channel = interaction.channel;

      await interaction.reply({
        content: "Creating transcript and closing ticket...",
        ephemeral: true
      });

      const transcriptText = await createTranscript(channel);
      const buffer = Buffer.from(transcriptText || "No messages found.", "utf8");

      const attachment = new AttachmentBuilder(buffer, {
        name: `${channel.name}-transcript.txt`
      });

      const logChannel = await interaction.client.channels
        .fetch(TRANSCRIPT_CHANNEL_ID)
        .catch(() => null);

      if (logChannel) {
        await logChannel.send({
          content: `Transcript for ${channel.name}`,
          files: [attachment]
        });
      }

      setTimeout(() => {
        channel.delete().catch(() => null);
      }, 3000);
    }
  },

  async handleModal(interaction) {
    if (!interaction.customId.startsWith("ticket_modal_")) return;

    await interaction.deferReply({ ephemeral: true });

    const type = interaction.customId.replace("ticket_modal_", "");
    const config = ticketTypes[type];

    if (!config) {
      return interaction.editReply({
        content: "Invalid ticket type."
      });
    }

    const username = cleanName(interaction.user.username);
    const channelName = `${config.channelPrefix}-${username}`;

    const existing = interaction.guild.channels.cache.find(
      c => c.name === channelName && c.parentId === TICKET_CATEGORY_ID
    );

    if (existing) {
      return interaction.editReply({
        content: `You already have an open ticket: ${existing}`
      });
    }

    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      topic: `ticket:true user:${interaction.user.id} type:${type}`,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages
          ]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        },
        {
          id: STAFF_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(config.label)
      .setColor(config.color)
      .addFields({
        name: "Opened by",
        value: `<@${interaction.user.id}>`,
        inline: true
      })
      .setTimestamp();

    for (const [id, label] of config.fields) {
      const value = interaction.fields.getTextInputValue(id);

      embed.addFields({
        name: label,
        value: value || "N/A"
      });
    }

    const components = [createCloseButton()];
    const roleButtons = createRoleButtons(type);

    if (roleButtons) {
      components.push(roleButtons);
    }

    await ticketChannel.send({
      content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>`,
      embeds: [embed],
      components
    });

    return interaction.editReply({
      content: `Ticket created: ${ticketChannel}`
    });
  }
};
