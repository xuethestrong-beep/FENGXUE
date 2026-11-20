module.exports = {
  config: {
    name: "antiout",
    version: "3.0",
    author: "FENG",
    role: 1,
    category: "box",
    guide: "{pn} on/off"
  },

  onStart: async function ({ message, args, threadsData }) {
    const tid = message.threadID;
    const data = await threadsData.get(tid) || {};
    if (!data.settings) data.settings = {};
    const type = (args[0] || "").toLowerCase();

    if (type === "on") {
      data.settings.antiout = true;
      await threadsData.set(tid, data);
      return message.reply("✅ antiout on");
    }
    if (type === "off") {
      data.settings.antiout = false;
      await threadsData.set(tid, data);
      return message.reply("❌ antiout off");
    }
    const status = data.settings.antiout ? "ON" : "OFF";
    return message.reply(`antiout: ${status}\n${global.GoatBot.config.prefix}antiout on/off`);
  },

  onEvent: async function ({ event, threadsData, api, usersData }) {
    try {
      if (event.logMessageType !== "log:unsubscribe") return;
      const tid = event.threadID;
      const data = await threadsData.get(tid) || {};
      if (data.settings?.antiout === false) return;

      const leftID = event.logMessageData?.leftParticipantFbId;
      if (!leftID) return;

      const botID = api.getCurrentUserID();
      if (String(leftID) === String(botID)) return;
      if (String(event.author) === String(botID)) return;

      const botAdmins = global.GoatBot?.config?.adminBot || [];
      if (botAdmins.some(a => String(a) === String(event.author))) return;

      const name = await usersData.getName(leftID).catch(() => "User");

      setTimeout(async () => {
        try {
          await api.addUserToGroup(leftID, tid);
          api.sendMessage(`🚪 ${name} left - added back`, tid);
        } catch {
          api.sendMessage(`⚠️ Can't add ${name} back`, tid).catch(()=>{});
        }
      }, 1000);
    } catch {}
  }
};
