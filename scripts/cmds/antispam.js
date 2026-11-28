
module.exports = {
  config: {
    name: "antispam",
    version: "4.2",
    author: "Feng",
    role: 0,
    category: "box",
    description: "Automatically detects and blocks message spam",
    guide: "{pn}"
  },

  onStart: async function ({ message }) {
    return message.reply(
      "🛡️ ANTISPAM STATUS\n\n" +
      "✅ Always ON\n" +
      "📨 5 messages in 30 seconds\n" +
      "🔇 10-minute message block\n" +
      "⚡ Automatic expiration"
    );
  },

  onChat: async function ({ event, api, threadsData, usersData }) {
    try {
      const tid = String(event.threadID);
      const sid = String(event.senderID);
      const botID = String(api.getCurrentUserID());

      if (!tid || !sid || sid === botID) return;
      if (!event.messageID) return;

      // Ignore bot admins
      const admins = global.GoatBot?.config?.adminBot || [];
      if (admins.map(String).includes(sid)) return;

      // Load thread settings
      const threadData = await threadsData.get(tid);
      if (!threadData) return;

      if (!threadData.data) threadData.data = {};

      const settings = threadData.data;

      if (!settings.mutedUsers) {
        settings.mutedUsers = {};
      }

      const now = Date.now();

      // Check active mute
      const unmuteAt = Number(settings.mutedUsers[sid] || 0);

      if (unmuteAt && now < unmuteAt) {
        try {
          await api.unsendMessage(event.messageID);
        } catch (error) {
          // Message deletion may fail due to permissions
        }
        return;
      }

      // Expired mute
      if (unmuteAt && now >= unmuteAt) {
        delete settings.mutedUsers[sid];
        await threadsData.set(tid, threadData);

        let name = sid;
        try {
          name = await usersData.getName(sid) || sid;
        } catch {}

        try {
          await api.sendMessage(
            `🔊 ${name} is no longer blocked from sending messages.`,
            tid
          );
        } catch {}
      }

      // Initialize spam tracker
      if (!global.cmdSpam) global.cmdSpam = {};
      if (!global.cmdSpam[tid]) global.cmdSpam[tid] = {};
      if (!global.cmdSpam[tid][sid]) {
        global.cmdSpam[tid][sid] = [];
      }

      // Keep messages from the last 30 seconds
      let list = global.cmdSpam[tid][sid]
        .filter(time => now - time < 30000);

      list.push(now);
      global.cmdSpam[tid][sid] = list;

      // 5 messages in 30 seconds = 10-minute block
      if (list.length >= 5) {
        const muteDuration = 10 * 60 * 1000;
        const newUnmuteAt = now + muteDuration;

        settings.mutedUsers[sid] = newUnmuteAt;

        await threadsData.set(tid, threadData);

        // Reset spam counter
        global.cmdSpam[tid][sid] = [];

        // Delete the message that triggered the block
        try {
          await api.unsendMessage(event.messageID);
        } catch {}

        let name = sid;
        try {
          name = await usersData.getName(sid) || sid;
        } catch {}

        try {
          await api.sendMessage(
            `🔇 ${name} has been blocked for 10 minutes for spamming.`,
            tid
          );
        } catch {}

        // Auto-unblock announcement
        setTimeout(async () => {
          try {
            const latestData = await threadsData.get(tid);
            const latestSettings = latestData?.data;

            if (!latestSettings?.mutedUsers) return;

            const currentExpiry = Number(
              latestSettings.mutedUsers[sid] || 0
            );

            // Only expire the same mute, not a newer one
            if (currentExpiry === newUnmuteAt && Date.now() >= currentExpiry) {
              delete latestSettings.mutedUsers[sid];
              await threadsData.set(tid, latestData);

              await api.sendMessage(
                `🔊 ${name} has been unblocked. You can chat again.`,
                tid
              );
            }
          } catch (error) {
            console.error("[ANTISPAM AUTO-UNBLOCK]", error);
          }
        }, muteDuration);
      }
    } catch (error) {
      console.error("[ANTISPAM ERROR]", error);
    }
  }
};
          
