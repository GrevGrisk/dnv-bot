const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const APP_ID = 2948190; // World of Sea Battle
const CHANNEL_ID = "1504182032924803192";
const CHECK_INTERVAL = 10 * 60 * 1000;

const DATA_FILE = path.join(__dirname, "steam_news_seen.json");

const STEAM_URL =
  `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${APP_ID}&count=5&maxlength=800&format=json`;

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { last_gid: null };
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { last_gid: null };
  }
}

function saveData(gid) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify({ last_gid: gid }, null, 4)
  );
}

function cleanText(text) {
  if (!text) return "";

  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\[\/?.*?\]/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
    .slice(0, 900);
}

async function sendNewsItem(channel, item) {
  const embed = new EmbedBuilder()
    .setColor(0x2b6cff)
    .setTitle(item.title || "Steam News")
    .setURL(item.url)
    .setDescription(
      cleanText(item.contents) ||
      "Ny Steam-oppdatering publisert."
    )
    .setFooter({ text: "World of Sea Battle - Steam News" })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function checkSteamNews(client) {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);

    if (!channel) {
      console.log("[Steam News] Fant ikke kanalen.");
      return;
    }

    const response = await fetch(STEAM_URL);

    if (!response.ok) {
      console.log(`[Steam News] Steam API error: ${response.status}`);
      return;
    }

    const data = await response.json();
    const news = data.appnews?.newsitems || [];

    if (!news.length) {
      console.log("[Steam News] Ingen nyheter funnet.");
      return;
    }

    const saved = loadData();
    const latestGid = news[0].gid;

    // Første oppstart: poster de 5 siste nyhetene fra eldst til nyest
    if (!saved.last_gid) {
      const firstPosts = [...news].reverse();

      for (const item of firstPosts) {
        await sendNewsItem(channel, item);
      }

      saveData(latestGid);
      console.log("[Steam News] Postet siste 5 nyheter.");
      return;
    }

    const newPosts = [];

    for (const item of news) {
      if (item.gid === saved.last_gid) break;
      newPosts.push(item);
    }

    if (!newPosts.length) {
      console.log("[Steam News] Ingen nye nyheter.");
      return;
    }

    for (const item of newPosts.reverse()) {
      await sendNewsItem(channel, item);
    }

    saveData(latestGid);
    console.log(`[Steam News] Postet ${newPosts.length} ny(e) Steam-nyhet(er).`);

  } catch (err) {
    console.error("[Steam News Error]", err);
  }
}

module.exports = {
  name: "steam_news",

  async start(client) {
    console.log("[Steam News] Modul startet.");

    await checkSteamNews(client);

    setInterval(() => {
      checkSteamNews(client);
    }, CHECK_INTERVAL);
  }
};const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const APP_ID = 2948190; // World of Sea Battle
const CHANNEL_ID = "1504182032924803192";
const CHECK_INTERVAL = 10 * 60 * 1000;

const DATA_FILE = path.join(__dirname, "steam_news_seen.json");

const STEAM_URL =
    `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${APP_ID}&count=5&maxlength=800&format=json`;

function loadData() {
    if (!fs.existsSync(DATA_FILE)) {
        return { last_gid: null };
    }

    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch {
        return { last_gid: null };
    }
}

function saveData(gid) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify({ last_gid: gid }, null, 4)
    );
}

function cleanText(text) {
    if (!text) return "";

    return text
        .replace(/<[^>]*>/g, "")
        .replace(/\[\/?.*?\]/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim()
        .slice(0, 900);
}

async function checkSteamNews(client) {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        if (!channel) {
            console.log("[Steam News] Fant ikke kanalen.");
            return;
        }

        const response = await fetch(STEAM_URL);
        if (!response.ok) {
            console.log(`[Steam News] Steam API error: ${response.status}`);
            return;
        }

        const data = await response.json();
        const news = data.appnews?.newsitems || [];

        if (!news.length) return;

        const saved = loadData();
        const latestGid = news[0].gid;

        // Første gang modulen kjører: lagrer nyeste post, men poster ikke gamle nyheter
        if (!saved.last_gid) {
            saveData(latestGid);
            console.log("[Steam News] Første oppstart. Lagret nyeste nyhet.");
            return;
        }

        const newPosts = [];

        for (const item of news) {
            if (item.gid === saved.last_gid) break;
            newPosts.push(item);
        }

        if (!newPosts.length) return;

        for (const item of newPosts.reverse()) {
            const embed = new EmbedBuilder()
                .setColor(0x2b6cff)
                .setTitle(item.title || "Steam News")
                .setURL(item.url)
                .setDescription(
                    cleanText(item.contents) ||
                    "Ny Steam-oppdatering publisert."
                )
                .setFooter({ text: "World of Sea Battle - Steam News" })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }

        saveData(latestGid);
        console.log(`[Steam News] Postet ${newPosts.length} ny(e) Steam-nyhet(er).`);

    } catch (err) {
        console.error("[Steam News Error]", err);
    }
}

module.exports = {
    name: "steam_news",

    async start(client) {
        console.log("[Steam News] Modul startet.");

        await checkSteamNews(client);

        setInterval(() => {
            checkSteamNews(client);
        }, CHECK_INTERVAL);
    }
};
