
const fs = require("fs-extra");
const path = require("path");

const cacheDir = path.join(__dirname, "cache");
const filePath = path.join(cacheDir, "autoreact.json");

fs.ensureDirSync(cacheDir);

function loadData() {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeJsonSync(filePath, { targets: {} }, { spaces: 2 });
    }

    const raw = fs.readJsonSync(filePath);

    // Current global format
    if (raw && raw.targets && typeof raw.targets === "object") {
      return raw;
    }

    // Migrate old per-thread format
    const migrated = { targets: {} };

    if (raw && typeof raw === "object") {
      for (const key of Object.keys(raw)) {
        const value = raw[key];

        if (typeof value === "string") {
          migrated.targets[String(value)] = "🩷";
        } else if (value?.targetID) {
          migrated.targets[String(value.targetID)] =
            value.emoji || "🩷";
        }
      }
    }

    saveData(migrated);
    return migrated;
  } catch (error) {
    console.error("[AUTOREACT LOAD]", error);
    return { targets: {} };
  }
}

function saveData(data) {
  try {
    fs.writeJsonSync(filePath, data, { spaces: 2 });
    return true;
  } catch (error) {
    console.error("[AUTOREACT SAVE]", error);
    return false;
  }
}

function getTarget(event) {
  if (event.messageReply?.senderID) {
    return String(event.messageReply.senderID);
  }

  const mentions = Object.keys(event.mentions || {});
  return mentions.length ? String(mentions[0]) : null;
}

module.exports = {
  config: {
    name: "autoreact",
    aliases: ["ar"],
    version: "4.0",
    author: "FengSama",
    role: 1,
    countDown: 2,
    category: "fun",
    guide:
      "{pn} [emoji] - Set autoreact\n" +
      "{pn} on [emoji] - Enable autoreact\n" +
      "{pn} off - Disable for a person\n" +
      "{pn} off all - Disable everyone\n" +
      "{pn} list - Show all targets"
  },

  onStart: async function ({ api, event, args, message }) {
    const data = loadData();
    const action = String(args[0] || "").toLowerCase();

    // LIST TARGETS
    if (action === "list") {
      const ids = Object.keys(data.targets);

      if (!ids.length) {
        return message.reply(
          "📋 No autoreact targets yet.\n\n" +
          "Reply to someone and use autoreact 😂"
        );
      }

      let output =
        `📋 GLOBAL AUTOREACT (${ids.length})\n` +
        "━━━━━━━━━━━━━━\n";

      for (const id of ids) {
        let name = id;

        try {
          const info = await api.getUserInfo(id);
          name = info?.[id]?.name || id;
        } catch {}

        output += `• ${name} — ${data.targets[id]}\n`;
      }

      output += "\n🌐 Active in every group chat.";

      return message.reply(output);
    }

    // TURN OFF
    if (action === "off") {
      if (String(args[1] || "").toLowerCase() === "all") {
        data.targets = {};

        if (!saveData(data)) {
          return message.reply("❌ Failed to save autoreact settings.");
        }

        return message.reply(
          "✅ Autoreact disabled for everyone globally."
        );
      }

      const targetID = getTarget(event);

      if (!targetID) {
        return message.reply(
          "Reply to someone's message and use:\n" +
          "autoreact off\n\n" +
          "To disable everyone:\n" +
          "autoreact off all"
        );
      }

      if (!data.targets[targetID]) {
        return message.reply("ℹ️ That person doesn't have autoreact enabled.");
      }

      delete data.targets[targetID];

      if (!saveData(data)) {
        return message.reply("❌ Failed to save autoreact settings.");
      }

      return message.reply(
        "✅ Autoreact disabled for that person in all group chats."
      );
    }

    // ENABLE / CHANGE EMOJI
    let emoji = "🩷";

    if (action === "on") {
      emoji = args.slice(1).join(" ").trim() || "🩷";
    } else if (args.length) {
      emoji = args.join(" ").trim();
    }

    if (!emoji || emoji.length > 30) {
      return message.reply("❌ Please provide a valid emoji.");
    }

    const targetID = getTarget(event);

    // No target: allow changing emoji only when one target exists
    if (!targetID) {
      const ids = Object.keys(data.targets);

      if (ids.length === 1 && args.length && action !== "on") {
        data.targets[ids[0]] = emoji;

        if (!saveData(data)) {
          return message.reply("❌ Failed to save autoreact settings.");
        }

        return message.reply(
          `✅ Autoreact emoji changed to ${emoji} globally.`
        );
      }

      return message.reply(
        "Reply to someone's message and use:\n\n" +
        "autoreact\n" +
        "autoreact 😂\n" +
        "autoreact on ❤️\n\n" +
        "Use autoreact list to view targets."
      );
    }

    data.targets[targetID] = emoji;

    if (!saveData(data)) {
      return message.reply("❌ Failed to save autoreact settings.");
    }

    let name = targetID;

    try {
      const info = await api.getUserInfo(targetID);
      name = info?.[targetID]?.name || targetID;
    } catch {}

    return message.reply(
      `✅ AUTOREACT ENABLED\n\n` +
      `👤 Target: ${name}\n` +
      `💗 Reaction: ${emoji}\n` +
      `🌐 Scope: All group chats`
    );
  },

  onChat: async function ({ api, event }) {
    try {
      if (!event.messageID || !event.senderID) return;

      const data = loadData();
      const senderID = String(event.senderID);

      const emoji = data.targets[senderID];

      if (!emoji) return;

      await Promise.resolve(
        api.setMessageReaction(
          emoji,
          event.messageID,
          () => {},
          true
        )
      );
    } catch (error) {
      console.error("[AUTOREACT EVENT]", error);
    }
  }
};
        
