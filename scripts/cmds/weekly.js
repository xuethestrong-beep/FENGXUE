
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(process.cwd(), "weekly_data.json");
const COOLDOWN = 7 * 24 * 60 * 60 * 1000;

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    console.error("Weekly data read error:", error);
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function formatTime(ms) {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  return `${days}d ${hours}h ${minutes}m`;
}

module.exports = {
  config: {
    name: "weekly",
    aliases: ["week"],
    version: "1.0.0",
    author: "FENGSAMA",
    countDown: 5,
    role: 0,
    description: "Claim your weekly economy reward",
    category: "economy",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ message, event, usersData }) {
    try {
      const userID = event.senderID;
      const now = Date.now();

      const data = loadData();
      const lastClaim = Number(data[userID] || 0);
      const remaining = COOLDOWN - (now - lastClaim);

      if (remaining > 0) {
        return message.reply(
          `⏳ 𝐖𝐄𝐄𝐊𝐋𝐘 𝐑𝐄𝐖𝐀𝐑𝐃\n\n` +
          `You have already claimed your weekly reward.\n\n` +
          `🕒 Come back in: ${formatTime(remaining)}`
        );
      }

      const userData = await usersData.get(userID);

      if (!userData) {
        return message.reply("❌ Your account data could not be found.");
      }

      const baseReward = 5000;
      const bonus = Math.floor(Math.random() * 2001);
      const reward = BigInt(baseReward + bonus);

      const wallet = BigInt(String(userData.money ?? 0));
      const newWallet = wallet + reward;

      await usersData.set(userID, {
        money: newWallet.toString()
      });

      // Save claim time after successful wallet update
      data[userID] = now;
      saveData(data);

      const name = await usersData.getName(userID);

      return message.reply(
        `🎁 𝐖𝐄𝐄𝐊𝐋𝐘 𝐑𝐄𝐖𝐀𝐑𝐃\n\n` +
        `👤 Player: ${name || "Unknown"}\n\n` +
        `💵 Base reward: $${baseReward.toLocaleString("en-US")}\n` +
        `✨ Random bonus: $${bonus.toLocaleString("en-US")}\n` +
        `━━━━━━━━━━━━━━\n` +
        `🏆 Total earned: $${Number(reward).toLocaleString("en-US")}\n` +
        `💰 New wallet: $${newWallet.toLocaleString("en-US")}\n\n` +
        `📅 Next reward available in 7 days!`
      );

    } catch (error) {
      console.error("Weekly command error:", error);
      return message.reply("❌ Something went wrong while claiming your weekly reward.");
    }
  }
};
