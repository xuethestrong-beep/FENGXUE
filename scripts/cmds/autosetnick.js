
module.exports = {
  config: {
    name: "autosetnick",
    aliases: ["autonick", "autosetname", "asn"],
    version: "4.0",
    author: "FENG",
    role: 1,
    countDown: 3,
    description: "Automatically gives every new member a fixed nickname",
    category: "box chat",
    guide:
      "{pn} set <nickname>\n" +
      "{pn} on\n" +
      "{pn} off\n" +
      "{pn} view"
  },

  onStart: async function ({ message, event, args, threadsData }) {
    const action = String(args[0] || "").toLowerCase();
    const threadID = event.threadID;

    if (action === "set") {
      const nickname = args.slice(1).join(" ").trim();

      if (!nickname) {
        return message.reply(
          "❌ Enter the nickname you want every new member to receive."
        );
      }

      if (nickname.length > 50) {
        return message.reply("❌ Nickname is too long. Maximum 50 characters.");
      }

      await threadsData.set(
        threadID,
        nickname,
        "data.autoSetName"
      );

      return message.reply(
        `✅ NEW MEMBER NICKNAME SAVED\n\n` +
        `👤 Nickname: ${nickname}\n` +
        `📌 Every new member will receive this nickname.`
      );
    }

    if (action === "on") {
      const nickname = await threadsData.get(
        threadID,
        "data.autoSetName"
      );

      if (!nickname) {
        return message.reply(
          "❌ Set a nickname first.\nExample: autosetnick set FENG SAMA 🚀"
        );
      }

      await threadsData.set(
        threadID,
        true,
        "settings.enableAutoSetName"
      );

      return message.reply(
        `✅ AUTONICK ENABLED\n\nNew members will receive: ${nickname}`
      );
    }

    if (action === "off") {
      await threadsData.set(
        threadID,
        false,
        "settings.enableAutoSetName"
      );

      return message.reply("🔴 AUTONICK DISABLED.");
    }

    if (action === "view") {
      const nickname = await threadsData.get(
        threadID,
        "data.autoSetName"
      );

      const enabled = await threadsData.get(
        threadID,
        "settings.enableAutoSetName"
      );

      return message.reply(
        `⚙️ AUTONICK SETTINGS\n\n` +
        `Status: ${enabled ? "🟢 ON" : "🔴 OFF"}\n` +
        `Nickname: ${nickname || "Not configured"}`
      );
    }

    return message.reply(
      "📌 AUTOSETNICK COMMANDS\n\n" +
      "autosetnick set FENG SAMA 🚀\n" +
      "autosetnick on\n" +
      "autosetnick off\n" +
      "autosetnick view"
    );
  },

  onEvent: async function ({ event, api, threadsData }) {
    try {
      if (event.logMessageType !== "log:subscribe") return;

      const threadID = event.threadID;

      const enabled = await threadsData.get(
        threadID,
        "settings.enableAutoSetName"
      );

      if (!enabled) return;

      const nickname = await threadsData.get(
        threadID,
        "data.autoSetName"
      );

      if (!nickname) return;

      const participants =
        event.logMessageData?.addedParticipants || [];

      for (const user of participants) {
        const uid = user.userFbId;

        if (!uid) continue;

        try {
          await api.changeNickname(
            nickname,
            threadID,
            uid
          );

          console.log(
            `[AUTOSETNICK] Set ${uid} nickname to ${nickname}`
          );
        } catch (error) {
          console.error(
            `[AUTOSETNICK] Failed for ${uid}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("[AUTOSETNICK ERROR]", error);
    }
  }
};
        
