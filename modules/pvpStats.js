// modules/pvpStats.js

const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const REPORT_FORUM_ID = "1506223555388506204";
const STATS_CHANNEL_ID = "1506267342357921812";

const chartCanvas = new ChartJSNodeCanvas({
  width: 900,
  height: 450,
  backgroundColour: "#202126",
  chartCallback: ChartJS => {
    ChartJS.defaults.font.family = "Arial";
    ChartJS.defaults.color = "#ffffff";
  }
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
      labels: ["Enemy Casualties", "DNV Casualties"],
      datasets: [
        {
          data: [enemyCasualties, dnvCasualties],
          backgroundColor: ["#c40000", "#586070"],
          borderColor: ["#ff3b3b", "#9ca3af"],
          borderWidth: 2,
          borderRadius: 14,
          barPercentage: 0.55
        }
      ]
    },
    options: {
      responsive: false,
      layout: {
        padding: {
          top: 20,
          left: 25,
          right: 25,
          bottom: 15
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: "DNV PvP Combat Overview",
          color: "#ffffff",
          font: {
            family: "Arial",
            size: 30,
            weight: "bold"
          },
          padding: {
            bottom: 30
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#ffffff",
            font: {
              family: "Arial",
              size: 18,
              weight: "bold"
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#d1d5db",
            font: {
              family: "Arial",
              size: 15
            }
          },
          grid: {
            color: "#383b44"
          }
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

  const chartBuffer = await createStatsChart(enemyCasualties, dnvCasualties);

  const attachment = new AttachmentBuilder(chartBuffer, {
    name: "pvp-stats.png"
  });

  const statsEmbed = new EmbedBuilder()
    .setTitle("⚔️ DNV PvP Statistics")
    .setColor("#b30000")
    .setDescription(
      [
        "📊 **Live combat statistics based on active PvP reports**",
        "",
        `🔥 **Enemy Casualties:** \`${enemyCasualties}\``,
        `🛡️ **DNV Casualties:** \`${dnvCasualties}\``,
        `💀 **Total K/D Ratio:** \`${kd}\``,
        `📁 **PvP Reports Counted:** \`${totalReports}\``
      ].join("\n")
    )
    .setImage("attachment://pvp-stats.png")
    .addFields(
      {
        name: "⚔️ Enemy Casualties",
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
