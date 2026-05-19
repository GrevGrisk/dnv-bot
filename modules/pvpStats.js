// modules/pvpStats.js

const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const REPORT_FORUM_ID = "1506223555388506204";
const STATS_CHANNEL_ID = "1506267342357921812";

const chartCanvas = new ChartJSNodeCanvas({
  width: 1000,
  height: 520,
  backgroundColour: "#111318"
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

async function createStatsChart(enemyDeaths, dnvDeaths) {
  const configuration = {
    type: "bar",
    data: {
      labels: ["Enemy Deaths", "DNV Deaths"],
      datasets: [
        {
          data: [enemyDeaths, dnvDeaths],
          backgroundColor: ["#63c832", "#3b3f46"],
          borderColor: ["#b8ff8f", "#9ca3af"],
          borderWidth: 3,
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
          left: 40,
          right: 40,
          bottom: 25
        }
      },
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: {
          ticks: {
            color: "#e5e7eb",
            font: {
              size: 20,
              weight: "bold"
            }
          },
          grid: {
            display: false
          },
          border: {
            color: "#e5e7eb"
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#e5e7eb",
            font: {
              size: 18
            }
          },
          grid: {
            color: "#2f333b"
          },
          border: {
            color: "#e5e7eb"
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
  let enemyDeaths = 0;
  let dnvDeaths = 0;

  const active = await forum.threads.fetchActive();

  for (const [, thread] of active.threads) {
    try {
      const messages = await thread.messages.fetch({ limit: 1 });
      const msg = messages.last() || messages.first();

      if (!msg?.embeds?.length) continue;

      const embed = msg.embeds[0];

      enemyDeaths += getField(embed, [
        "dnv kills",
        "enemy casualties",
        "enemy deaths",
        "kills"
      ]);

      dnvDeaths += getField(embed, [
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
    dnvDeaths > 0
      ? (enemyDeaths / dnvDeaths).toFixed(2)
      : enemyDeaths.toFixed(2);

  const chartBuffer = await createStatsChart(enemyDeaths, dnvDeaths);

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
        `🟩 **Enemy Deaths:** \`${enemyDeaths}\``,
        `⬛ **DNV Deaths:** \`${dnvDeaths}\``,
        `💀 **Total K/D Ratio:** \`${kd}\``,
        `📁 **PvP Reports Counted:** \`${totalReports}\``,
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "🟩 **Enemy Deaths**     ⬛ **DNV Deaths**"
      ].join("\n")
    )
    .setImage("attachment://pvp-stats.png")
    .addFields(
      {
        name: "🟩 Enemy Deaths",
        value: `**${enemyDeaths}**`,
        inline: true
      },
      {
        name: "⬛ DNV Deaths",
        value: `**${dnvDeaths}**`,
        inline: true
      },
      {
        name: "💀 K/D Ratio",
        value: `**${kd}**`,
        inline: true
      },
      {
        name: "📁 PvP Reports",
        value: `**${totalReports}**`,
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
