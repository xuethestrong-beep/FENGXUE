const fs = require("fs-extra");
const path = require("path");
const filePath = path.join(__dirname, "cache", "autoreact.json");
if (!fs.existsSync(path.join(__dirname, "cache"))) {
  fs.mkdirSync(path.join(__dirname, "cache"), { recursive: true });
}
if (!fs.existsSync(filePath)) {
  fs.writeJsonSync(filePath, { targets: {} });
}

module.exports = {
  config: {
    name: "autoreact",
    aliases: ["ar"],
    version: "3.0",
    author: "FengSama (fixed global)",
    role: 1,
    countDown: 2,
    category: "fun",
    guide: "{pn} [emoji]\n{pn} off\n{pn} list"
  },
  onStart: async function ({ api, event, args, message }) {
    let data = fs.readJsonSync(filePath);
    // ===== MIGRATE OLD per-thread format to global =====
    if (!data.targets) {
      data = { targets: {} };
      // old format: { threadID: {targetID, emoji} } -> convert to global
      const old = fs.readJsonSync(filePath);
      for (const k in old) {
        if (k === "targets") continue;
        const v = old[k];
        if (typeof v === "string") data.targets[v] = "🩷";
        else if (v?.targetID) data.targets[v.targetID] = v.emoji || "🩷";
      }
      fs.writeJsonSync(filePath, data);
    }
    if (!data.targets) data.targets = {};

    // ===== LIST =====
    if (args[0] === "list") {
      const ids = Object.keys(data.targets);
      if (ids.length === 0) return message.reply("📋 No autoreact targets.\nReply to someone → autoreact 😂");
      let msg = `📋 Autoreact GLOBAL (${ids.length})\n──────────────\n`;
      for (const id of ids) {
        try {
          const info = await api.getUserInfo(id);
          msg += `• ${info[id]?.name || id} - ${data.targets[id]}\n`;
        } catch { msg += `• ${id} - ${data.targets[id]}\n`; }
      }
      msg += `\n✅ Works in ANY GC`;
      return message.reply(msg);
    }

    // ===== OFF =====
    if (args[0] === "off") {
      // autoreact off (reply) = off for that person globally
      // autoreact off all = off all
      if (args[1] === "all") {
        data.targets = {};
        fs.writeJsonSync(filePath, data);
        return message.reply("✅ autoreact OFF for ALL (all GCs)");
      }
      let targetID = event.messageReply ? event.messageReply.senderID : Object.keys(event.mentions || {})[0];
      if (!targetID) {
        // if no reply, off last / all? Ask
        return message.reply("Reply to their message → autoreact off\nOr: autoreact off all");
      }
      delete data.targets[String(targetID)];
      fs.writeJsonSync(filePath, data);
      return message.reply("✅ autoreact OFF for them (all GCs)");
    }

    // ===== ON =====
    let emoji = args[0] || "🩷";
    if (args[0] === "on") emoji = args[1] || "🩷";
    // if user typed: autoreact on 😂
    if (args[0] === "on" && args[1]) emoji = args[1];

    let targetID = event.messageReply ? event.messageReply.senderID : Object.keys(event.mentions || {})[0];

    // If no target but already have targets, change emoji for all? No - change for first target if only 1
    if (!targetID) {
      const ids = Object.keys(data.targets);
      if (ids.length === 1 && args[0]) {
        data.targets[ids[0]] = args[0];
        fs.writeJsonSync(filePath, data);
        return message.reply(`✅ react changed to ${args[0]} (GLOBAL - all GCs)`);
      }
      if (ids.length > 1 && args[0]) {
        return message.reply("Reply to who? May multiple targets ka.\nReply to them → autoreact 😂");
      }
      return message.reply("Reply to a message → autoreact\nReply → autoreact 😂 to set custom\nReply → autoreact off to stop\n autoreact list to see all");
    }

    // ===== SAVE GLOBALLY - NOT PER THREAD =====
    data.targets[String(targetID)] = emoji;
    fs.writeJsonSync(filePath, data);

    let name = targetID;
    try {
      const info = await api.getUserInfo(targetID);
      name = info[targetID]?.name || targetID;
    } catch {}
    return message.reply(`✅ autoreact ON for ${name}\nReact: ${emoji}\n🌐 GLOBAL - works in ANY GC`);
  },
  onChat: async function ({ api, event }) {
    try {
      if (!event.messageID) return;
      const data = fs.readJsonSync(filePath);
      // Support both new global + old per-thread (for safety)
      let emoji = null;

      // 1. NEW GLOBAL - priority
      if (data.targets && data.targets[String(event.senderID)]) {
        emoji = data.targets[String(event.senderID)];
      }
      // 2. OLD per-thread fallback
      else if (data[event.threadID]) {
        const td = data[event.threadID];
        const tid = typeof td === "string" ? td : td.targetID;
        if (String(event.senderID) === String(tid)) emoji = typeof td === "string" ? "🩷" : (td.emoji || "🩷");
      }

      if (!emoji) return;
      api.setMessageReaction(emoji, event.messageID, () => {}, true);
    } catch {}
  }
};
