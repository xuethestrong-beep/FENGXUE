
module.exports = {
  config: {
    name: "antiout",
    version: "1.4-emoji-only",
    author: "Feng",
    role: 1,
    category: "group",
    guide: "{pn} on / off"
  },

  onStart: async function ({ api, event, args, threadsData }) {
    const threadID = event.threadID;
    if (!threadID) return;

    const data = await threadsData.get(threadID);
    if (!data.data) data.data = {};
    const mode = (args[0] || "").toLowerCase();

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

    // Kung walang on/off, check lang status - emoji lang din
    return api.sendMessage(data.data.antiout ? "✅" : "❌", threadID, event.messageID);
  },

  onEvent: async function ({ api, event, threadsData }) {
    if (event.logMessageType !== "log:unsubscribe") return;

    const threadID = event.threadID;
    const leftID = event.logMessageData.leftParticipantFbId;

    if (!leftID) return;
    if (leftID == api.getCurrentUserID()) return;

    const data = await threadsData.get(threadID);
    if (!data?.data?.antiout) return;

    // Silent re-add - no message
    try {
      await api.addUserToGroup(leftID, threadID);
    } catch (e) {}
  }
};
