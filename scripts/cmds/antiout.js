
module.exports = {
  config: {
    name: "antiout",
    version: "1.5",
    author: "FENG",
    role: 1,
    category: "group",
    description: "Automatically re-add members who leave the group",
    guide: {
      en: "{pn} on / off"
    }
  },

  onStart: async function ({ api, event, args, threadsData }) {
    try {
      const threadID = event.threadID;
      if (!threadID) return;

      const mode = (args[0] || "").toLowerCase();
      const data = await threadsData.get(threadID);

      if (!data.data) data.data = {};

      if (mode === "on") {
        data.data.antiout = true;
        await threadsData.set(threadID, data);
        return api.sendMessage("✅", threadID, event.messageID);
      }

      if (mode === "off") {
        data.data.antiout = false;
        await threadsData.set(threadID, data);
        return api.sendMessage("❌", threadID, event.messageID);
      }

      if (mode) {
        return api.sendMessage("⚠️", threadID, event.messageID);
      }

      return api.sendMessage(
        data.data.antiout === true ? "✅" : "❌",
        threadID,
        event.messageID
      );

    } catch (error) {
      console.error("[ANTIOUT] Command error:", error);
    }
  },

  onEvent: async function ({ api, event, threadsData }) {
    try {
      if (event.logMessageType !== "log:unsubscribe") return;

      const threadID = event.threadID;
      const leftID = event.logMessageData?.leftParticipantFbId;

      if (!threadID || !leftID) return;

      // Ignore the bot leaving
      if (String(leftID) === String(api.getCurrentUserID())) return;

      const data = await threadsData.get(threadID);

      if (data?.data?.antiout !== true) return;

      // Silently attempt to re-add the member
      await api.addUserToGroup(leftID, threadID);

    } catch (error) {
      console.error("[ANTIOUT] Re-add failed:", error);
    }
  }
};
                               
