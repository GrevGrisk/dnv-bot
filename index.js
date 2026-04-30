require("dotenv").config();

const { Client, Collection, GatewayIntentBits } = require("discord.js");

const friendlyEnemy = require("./modules/friendly-enemy");
const reportIncident = require("./modules/report-incident");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.modules = new Collection();
client.modules.set(friendlyEnemy.name, friendlyEnemy);
client.modules.set(reportIncident.name, reportIncident);

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
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
      }

      if (interaction.isModalSubmit() && module.handleModal) {
        await module.handleModal(interaction, client);
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