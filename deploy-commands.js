require("dotenv").config();

const { REST, Routes } = require("discord.js");

const friendlyEnemy = require("./modules/friendly-enemy");
const reportIncident = require("./modules/report-incident");
const tickets = require("./modules/tickets");

const commands = [
  ...friendlyEnemy.data.map(command => command.toJSON()),
  reportIncident.data.toJSON(),
  tickets.data.toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Commands deployed.");
  } catch (err) {
    console.error(err);
  }
})();
