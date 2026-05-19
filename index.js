require("dotenv").config();

const { Client, Collection, GatewayIntentBits } = require("discord.js");

const friendlyEnemy = require("./modules/friendly-enemy");
const reportIncident = require("./modules/report-incident");
const tickets = require("./modules/tickets");
const steamNews = require("./modules/steam_news");
const pvpReport = require("./modules/pvpReport");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.modules = new Collection();

client.modules.set(friendlyEnemy.name, friendlyEnemy);
client.modules.set(reportIncident.name, reportIncident);
client.modules.set(tickets.name, tickets);
client.modules.set(steamNews.name, steamNews);
client.modules.set(pvpReport.name, pvpReport);

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
  steamNews.start(client);
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
