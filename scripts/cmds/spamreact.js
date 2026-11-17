const OWNER_IDS = ["61593117279214", "61568686580853"]; // your master IDs

module.exports = {
  config: {
    name: "spamreact",
    version: "2.0-reply",
    author: "Feng",
    role: 0,
    category: "fun",
    guide: "Reply to someone's message and use: {pn} [emoji] [amount]"
  },

  onStart: async function({ api, event, args }) {
    const senderID = String(event.senderID);

    // ONLY OWNER / ADMIN CAN USE
    if (!OWNER_IDS.includes(senderID)) {
      return api.sendMessage("This command is for owner/admin only ", event.threadID, event.messageID);
    }

    // MUST REPLY TO TARGET
    if (!event.messageReply) {
      return api.sendMessage("You need to reply to someone's message.\nExample: Reply to John + type !spamreact 😂 20", event.threadID, event.messageID);
    }

    const targetID = event.messageReply.senderID;

    if (String(targetID) === String(api.getCurrentUserID())) {
      return api.sendMessage("Can't spam react the bot itself 💀", event.threadID, event.messageID);
    }

    const emoji = args[0] || "😂";
    let amount = parseInt(args[1]) || 10;
    if (amount > 30) amount = 30;
    if (amount < 1) amount = 5;

    api.sendMessage(`Okay master, spamming ${emoji} x${amount} on that user 🔥`, event.threadID, event.messageID);

    try {
      const history = await api.getThreadHistory(event.threadID, 100, undefined);
      let count = 0;

      for (const msg of history) {
        if (count >= amount) break;
        if (String(msg.senderID) === String(targetID)) {
          await new Promise(r => setTimeout(r, 700)); // 0.7s delay to avoid FB block
          api.setMessageReaction(emoji, msg.messageID, () => {}, true);
          count++;
        }
      }

      api.sendMessage(`Done boss! Reacted ${count} messages with ${emoji} 💀`, event.threadID);
    } catch (e) {
      console.log(e);
      api.sendMessage(`Error: ${e.message}`, event.threadID);
    }
  }
};
