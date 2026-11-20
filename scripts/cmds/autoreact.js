const fs = require("fs-extra");
const path = require("path");

const filePath = path.join(__dirname, "cache", "autoreact.json");

if (!fs.existsSync(path.join(__dirname, "cache"))) {
  fs.mkdirSync(path.join(__dirname, "cache"), { recursive: true });
}
if (!fs.existsSync(filePath)) {
  fs.writeJsonSync(filePath, {});
}

module.exports = {
  config: {
    name: "autoreact",
    aliases: ["ar"],
    version: "2.1",
    author: "FengSama",
    role: 1,
    countDown: 2,
    category: "fun",
    guide: "{pn} [emoji]\n{pn} off"
  },

  onStart: async function ({ api, event, args, message }) {
    const data = fs.readJsonSync(filePath);

    if (args[0] === "off") {
      delete data[event.threadID];
      fs.writeJsonSync(filePath, data);
      return message.reply("✅ autoreact OFF");
    }

    // get emoji from args, default 🩷
    let emoji = args[0] || "🩷";
    if (args[0] === "on") emoji = "🩷";
    // if second arg is emoji when first is on, use second
    if (args[0] === "on" && args[1]) emoji = args[1];

    let targetID = event.messageReply ? event.messageReply.senderID : Object.keys(event.mentions)[0];

    // if already ON and user just wants to change emoji: !autoreact 😂
    if (!targetID && data[event.threadID]) {
      const old = data[event.threadID];
      const oldID = typeof old === "string" ? old : old.targetID;
      data[event.threadID] = { targetID: oldID, emoji: args[0] };
      fs.writeJsonSync(filePath, data);
      return message.reply(`✅ react changed to ${args[0]}`);
    }

    if (!targetID) {
      return message.reply("Reply to a message → !autoreact\n!autoreact 😂 to set custom\n!autoreact off to stop");
    }

    data[event.threadID] = { targetID, emoji };
    fs.writeJsonSync(filePath, data);

    const info = await api.getUserInfo(targetID);
    return message.reply(`✅ autoreact ON for ${info[targetID].name}\nReact: ${emoji}`);
  },

  onChat: async function ({ api, event }) {
    try {
      const data = fs.readJsonSync(filePath);
      const threadData = data[event.threadID];
      if (!threadData) return;

      let targetID, emoji;
      if (typeof threadData === "string") {
        targetID = threadData;
        emoji = "🩷";
      } else {
        targetID = threadData.targetID;
        emoji = threadData.emoji || "🩷";
      }

      if (String(event.senderID) !== String(targetID)) return;

      api.setMessageReaction(emoji, event.messageID, () => {}, true);
    } catch {}
  }
};
