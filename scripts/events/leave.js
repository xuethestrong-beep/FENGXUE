const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "leave",
    version: "9.0-all-leave",
    author: "FENG",
    category: "events"
  },

  onStart: async function ({ threadsData, event, api }) {
    if (event.logMessageType !== "log:unsubscribe") return;
    
    const { threadID } = event;
    const leftID = event.logMessageData?.leftParticipantFbId;
    
    // Don't send if bot itself left/removed
    if (!leftID || String(leftID) === String(api.getCurrentUserID())) return;

    try {
      // Ignore group setting check so it works even if kicked
      // const threadData = await threadsData.get(threadID);
      // if (threadData.settings?.sendLeaveMessage === false) return;

      const file = path.join(__dirname, "cache", "leave.gif");
      const file2 = path.join(__dirname, "../cmds/cache/leave.gif");
      const file3 = path.join(__dirname, "cache", "leave_static.gif");
      
      let finalFile = null;
      if (await fs.pathExists(file)) finalFile = file;
      else if (await fs.pathExists(file2)) finalFile = file2;
      else if (await fs.pathExists(file3)) finalFile = file3;

      if (finalFile) {
        await api.sendMessage({
          attachment: fs.createReadStream(finalFile)
        }, threadID);
      }

    } catch (e) {
      console.log("[leave]", e.message);
    }
  }
};
