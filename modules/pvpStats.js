// modules/pvpStats.js

const { EmbedBuilder } = require("discord.js");

const REPORT_FORUM_ID = "1506223555388506204";
const STATS_CHANNEL_ID = "1506267342357921812";

function getField(embed, names) {
  const field = embed.fields?.find(f =>
    names.some(name =>
      f.name.toLowerCase().includes(name.toLowerCase())
    )
  );

  if (!field) return 0;

  const number = field.value.replace(/[^0-9]/g, "");
  return number ? Number(number) : 0;
}

function progressBar(value, max) {
  const percentage = max > 0 ? value / max : 0;

  const filled = Math.round(percentage * 10);
  const empty = 10 - filled;

  return `🟥 ${"█".repeat(filled)}${"░".repeat(empty)} ${value}`;
}

async function rebuildPvpStats(client) {
  const forum = await client.channels.fetch(REPORT_FORUM_ID);
  const statsChannel = await client.channels.fetch(STATS_CHANNEL_ID);

  let totalReports = 0;
  let enemyCasualties = 0;
  let dnvCasualties = 0;

  const active = await forum.threads.fetchActive();

  for (const [, thread] of active.threads) {
    try {
      const messages = await thread.messages.fetch({ limit: 1 });

      const msg = messages.last() || messages.first();

      if (!msg?.embeds?.length) continue;

      const embed = msg.embeds[0];

      const dnvKills = getField(embed, [
        "dnv kills",
        "enemy casualties",
        "kills"
      ]);

      const dnvDeaths = getField(embed, [
        "dnv casualties",
        "dnv deaths",
        "deaths"
      ]);

      enemyCasualties += dnvKills;
      dnvCasualties += dnvDeaths;

      totalReports++;
    } catch (err) {
      console.error(`Failed reading thread ${thread.id}`, err);
    }
  }

  const kd =
    dnvCasualties > 0
      ? (enemyCasualties / dnvCasualties).toFixed(2)
      : enemyCasualties.toFixed(2);

  const max = Math.max(enemyCasualties, dnvCasualties);

  const statsEmbed = new EmbedBuilder()
    .setTitle("📊 DNV PvP Statistics")
    .setColor("#b30000")
    .addFields(
      {
        name: "Enemy Casualties",
        value: progressBar(enemyCasualties, max),
        inline: false
      },
      {
        name: "DNV Casualties",
        value: progressBar(dnvCasualties, max),
        inline: false
      },
      {
        name: "Total PvP Reports",
        value: `${totalReports}`,
        inline: true
      },
      {
        name: "Enemy Kills",
        value: `${enemyCasualties}`,
        inline: true
      },
      {
        name: "DNV Deaths",
        value: `${dnvCasualties}`,
        inline: true
      },
      {
        name: "Total K/D Ratio",
        value: `${kd}`,
        inline: true
      }
    )
    .setFooter({
      text: "DNV Combat Analytics"
    })
    .setTimestamp();

  await statsChannel.send({
    embeds: [statsEmbed]
  });
}

module.exports = {
  rebuildPvpStats
};
