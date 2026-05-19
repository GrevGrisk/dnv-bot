// index.js

require("dotenv").config();

const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");

const friendlyEnemy = require("./modules/friendly-enemy");
const reportIncident = require("./modules/report-incident");
const tickets = require("./modules/tickets");
const steamNews = require("./modules/steam_news");
const pvpReport = require("./modules/pvpReport");
const { rebuildPvpStats } = require("./modules/pvpStats");

const PVP_FORUM_ID = "1506223555388506204";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Channel,
    Partials.Message
  ]
});

client.modules = new Collection();

client.modules.set(friendlyEnemy.name, friendlyEnemy);
client.modules.set(reportIncident.name, reportIncident);
client.modules.set(tickets.name, tickets);
client.modules.set(steamNews.name, steamNews);
client.modules.set(pvpReport.name, pvpReport);

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  steamNews.start(client);
  await rebuildPvpStats(client);
});

client.on("threadCreate", async thread => {
  if (thread.parentId !== PVP_FORUM_ID) return;
  await rebuildPvpStats(client);
});

client.on("messageDelete", async message => {
  if (message.author?.bot) return;
  if (message.channel?.parentId !== PVP_FORUM_ID) return;
  await rebuildPvpStats(client);
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (newMessage.author?.bot) return;
  if (newMessage.channel?.parentId !== PVP_FORUM_ID) return;
  await rebuildPvpStats(client);
});

client.on("interactionCreate", async interaction => {
  try {
    for (const module of client.modules.values()) {
      if (
        interaction.isChatInputCommand() &&
        module.hasCommand &&
        module.hasCommand(interaction.commandName)
      ) {
        return await module.execute(interaction, client);
      }

      if (
        interaction.isChatInputCommand() &&
        module.name === interaction.commandName
      ) {
        return await module.execute(interaction, client);
      }

      if (interaction.isButton() && module.handleButton) {
        await module.handleButton(interaction, client);

        if (interaction.replied || interaction.deferred) {
          return;
        }
      }

      if (interaction.isModalSubmit() && module.handleModal) {
        await module.handleModal(interaction, client);

        if (interaction.replied || interaction.deferred) {
          return;
        }
      }

      if (module.handleInteraction) {
        await module.handleInteraction(interaction, client);

        if (interaction.replied || interaction.deferred) {
          return;
        }
      }
    }
  } catch (err) {
    console.error(err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Noe gikk galt.",
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);
