// modules/pvpStats.js

const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const REPORT_FORUM_ID = "1506223555388506204";
const STATS_CHANNEL_ID = "1506267342357921812";

const chartCanvas = new ChartJSNodeCanvas({
  width: 900,
  height: 450,
  backgroundColour: "#1f2026"
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
          label: "Casualties",
          data: [enemyCasualties, dnvCasualties],
          backgroundColor: ["#b30000", "#444b5a"],
          borderColor: ["#ff3333", "#7d8597"],
          borderWidth: 2,
          borderRadius: 12
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: "DNV PvP Combat Statistics",
          color: "#ffffff",
          font: {
            size: 28,
            weight: "bold"
          },
          padding: {
            top: 20,
            bottom: 25
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#ffffff",
            font: {
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
              size: 14
            }
          },
          grid: {
            color: "#343741"
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
    .setTitle("DNV PvP Statistics")
    .setColor("#b30000")
    .setImage("attachment://pvp-stats.png")
    .addFields(
      {
        name: "Enemy Casualties",
        value: `**${enemyCasualties}**`,
        inline: true
      },
      {
        name: "DNV Casualties",
        value: `**${dnvCasualties}**`,
        inline: true
      },
      {
        name: "K/D Ratio",
        value: `**${kd}**`,
        inline: true
      },
      {
        name: "PvP Reports",
        value: `**${totalReports}**`,
        inline: true
      }
    )
    .setFooter({
      text: "DNV Combat Analytics"
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
