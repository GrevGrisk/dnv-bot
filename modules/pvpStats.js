// modules/pvpStats.js
const { EmbedBuilder } = require("discord.js");

const REPORT_FORUM_ID = "1506223555388506204";
const STATS_CHANNEL_ID = "1506267342357921812";

function getField(embed, names) {
  const field = embed.fields?.find(f =>
    names.some(name => f.name.toLowerCase().includes(name.toLowerCase()))
  );

  if (!field) return 0;

  const number = field.value.replace(/[^0-9]/g, "");
  return number ? Number(number) : 0;
}

function makeBar(label, value, max) {
  const size = max > 0 ? Math.round((value / max) * 20) : 0;
  return `${label} ${"█".repeat(size)}${"░".repeat(20 - size)} ${value}`;
}

async function rebuildPvpStats(client) {
  const forum = await client.channels.fetch(REPORT_FORUM_ID);
  const statsChannel = await client.channels.fetch(STATS_CHANNEL_ID);

  let totalReports = 0;
  let enemyCasualties = 0; // DNV kills
  let dnvCasualties = 0;   // DNV deaths

  const active = await forum.threads.fetchActive();

  for (const [, thread] of active.threads) {
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
  }

  const max = Math.max(enemyCasualties, dnvCasualties);
  const kd = dnvCasualties > 0
    ? (enemyCasualties / dnvCasualties).toFixed(2)
    : enemyCasualties.toFixed(2);

  const histogram = [
    makeBar("Enemy casualties", enemyCasualties, max),
    makeBar("DNV casualties  ", dnvCasualties, max)
  ].join("\n");

  const statsEmbed = new EmbedBuilder()
    .setTitle("PvP Statistics")
    .setColor(0xb30000)
    .setDescription(`\`\`\`${histogram}\`\`\``)
    .addFields(
      { name: "Total PvP reports", value: `${totalReports}`, inline: true },
      { name: "Enemy casualties", value: `${enemyCasualties}`, inline: true },
      { name: "DNV casualties", value: `${dnvCasualties}`, inline: true },
      { name: "Total K/D Ratio", value: `${kd}`, inline: true }
    )
    .setTimestamp();

  await statsChannel.send({ embeds: [statsEmbed] });
}

module.exports = {
  rebuildPvpStats
};
