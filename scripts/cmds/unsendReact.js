// 👇 PALITAN MO NG FB ID MO
const MASTER_IDS = ["61568686580853"];

module.exports = {
  config: {
    name: "unsendReact",
    version: "1.0",
    author: "Feng",
    role: 0,
    category: "system"
  },

  onStart: async function() {},

  onChat: async function({ api, event }) {
    // Handle reaction
    if (event.type !== "message_reaction") return;
    
    const reactorID = String(event.senderID || event.userID || event.reaction?.userID);
    const isMaster = MASTER_IDS.includes(reactorID);
    
    if (!isMaster) return; // only master can unsend

    const messageID = event.messageID;
    if (!messageID) return;

    // Unsend the message that was reacted to
    try {
      api.unsendMessage(messageID);
      console.log(`Master ${reactorID} reacted - unsent ${messageID}`);
    } catch (e) {
      console.log("Unsend failed:", e.message);
    }
  }
};
