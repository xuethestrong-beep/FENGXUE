const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "leave",
    version: "7.0-leave.gift",
    author: "FENG",
    category: "events"
  },

  onStart: async function ({ threadsData, event, api }) {
    if (event.logMessageType !== "log:unsubscribe") return;
    const { threadID } = event;

    try {
      const threadData = await threadsData.get(threadID);
      if (threadData.settings?.sendLeaveMessage == false) return;

      const leftID = event.logMessageData?.leftParticipantFbId;
      if (!leftID || String(leftID) === String(api.getCurrentUserID())) return;

      const file = path.join(__dirname, "cache", "leave.gift");
      const file2 = path.join(__dirname, "../cmds/cache/leave.gift");
      const file3 = path.join(__dirname, "cache", "gift.mp4");
      const file4 = path.join(__dirname, "../cmds/cache/gift.mp4");

      let finalFile = null;
      if (await fs.pathExists(file)) finalFile = file;
      else if (await fs.pathExists(file2)) finalFile = file2;
      else if (await fs.pathExists(file3)) finalFile = file3;
      else if (await fs.pathExists(file4)) finalFile = file4;

      if (finalFile) {
        await api.sendMessage({
          attachment: fs.createReadStream(finalFile)
        }, threadID);
      }

    } catch (e) {
      console.log("[leave.gift]", e.message);
    }
  }
};
