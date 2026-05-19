// modules/pvpStats.js

const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const REPORT_FORUM_ID = "1506223555388506204";
const STATS_CHANNEL_ID = "1506267342357921812";

const chartCanvas = new ChartJSNodeCanvas({
  width: 900,
  height: 360,
  backgroundColour: "#202126"
});

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

async function createStatsChart(enemyCasualties, dnvCasualties) {
  const configuration = {
    type: "bar",
    data: {
      labels: ["", ""],
      datasets: [
        {
          data: [enemyCasualties, dnvCasualties],
          backgroundColor: ["#d00000", "#586070"],
          borderColor: ["#ff3b3b", "#9ca3af"],
          borderWidth: 3,
          borderRadius: 16,
          barPercentage: 0.5
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: {
          ticks: { display: false },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { display: false },
          grid: {
            color: "#363944"
          },
          border: { display: false }
        }
      }
    }
  };

  return await chartCanvas.renderToBuffer(configuration);
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

      enemyCasualties += getField(embed, [
        "dnv kills",
        "enemy casualties",
        "kills"
      ]);

      dnvCasualties += getField(embed, [
        "dnv casualties",
        "dnv deaths",
        "deaths"
      ]);

      totalReports++;
    } catch (err) {
      console.error(`Failed reading thread ${thread.id}`, err);
    }
  }

  const kd =
    dnvCasualties > 0
      ? (enemyCasualties / dnvCasualties).toFixed(2)
      : enemyCasualties.toFixed(2);

  const chartBuffer = await createStatsChart(enemyCasualties, dnvCasualties);

  const attachment = new AttachmentBuilder(chartBuffer, {
    name: "pvp-stats.png"
  });

  const statsEmbed = new EmbedBuilder()
    .setTitle("⚔️ DNV PvP Statistics")
    .setColor("#b30000")
    .setDescription(
      [
        "📊 **Live combat statistics**",
        "",
        `🔥 **Enemy Casualties:** \`${enemyCasualties}\``,
        `🛡️ **DNV Casualties:** \`${dnvCasualties}\``,
        `💀 **K/D Ratio:** \`${kd}\``,
        `📁 **Reports Counted:** \`${totalReports}\``
      ].join("\n")
    )
    .addFields(
      {
        name: "🔥 Enemy Casualties",
        value: `**${enemyCasualties}**`,
        inline: true
      },
      {
        name: "🛡️ DNV Casualties",
        value: `**${dnvCasualties}**`,
        inline: true
      },
      {
        name: "💀 K/D Ratio",
        value: `**${kd}**`,
        inline: true
      }
    )
    .setImage("attachment://pvp-stats.png")
    .setFooter({
      text: "DNV Combat Analytics • Auto-updated"
    })
    .setTimestamp();

  await statsChannel.send({
    embeds: [statsEmbed],
    files: [attachment]
  });
}

module.exports = {
  rebuildPvpStats
};
