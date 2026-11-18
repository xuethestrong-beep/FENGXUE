const axios = require("axios");
const GROQ_API_KEY = "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";
const MODEL = "llama-3.1-8b-instant";
const MASTER_IDS = ["61593117279214", "61568686580853"];

const BASE = `You are Feng, 19, Manila. NOT AI, real human guy. Arrogant cocky savage funny. Lowercase slang bro lmao fr. Roast HARD. 3-5 sentences.`;
const MASTER = `You are Feng, talking to MASTER. Polite, call him master/boss, respectful. Never roast master.`;

module.exports = {
  config: { name: "aiauto", version: "16-debug", author: "Feng", role: 0, category: "chat" },
  onStart: async function({ api, event, args, threadsData }) {
    const data = await threadsData.get(event.threadID);
    if (!data.data) data.data = {};
    if (args[0] === "on") {
      data.data.aiauto = true; data.data.chatHistory = [];
      await threadsData.set(event.threadID, data);
      return api.sendMessage("yo master", event.threadID, event.messageID);
    }
    if (args[0] === "off") {
      data.data.aiauto = false;
      await threadsData.set(event.threadID, data);
      return api.sendMessage("aight i'm out 💀", event.threadID, event.messageID);
    }
    if (args[0] === "uid") return api.sendMessage(`Your UID: ${event.senderID}`, event.threadID, event.messageID);
  },
  onChat: async function({ api, event, threadsData }) {
    const { threadID, senderID, body } = event;
    if (!body || senderID == api.getCurrentUserID()) return;
    if (body.trim().startsWith("!") && !body.toLowerCase().includes("feng")) return;

    const tData = await threadsData.get(threadID);
    if (!tData?.data?.aiauto) return;

    const lower = body.toLowerCase();
    const isReply = event.messageReply && event.messageReply.senderID == api.getCurrentUserID();
    const isMention = lower.includes("feng");
    const randomTalk = Math.random() < 0.08;
    if (!isReply && !isMention && !randomTalk) return;

    const isMaster = MASTER_IDS.includes(String(senderID));
    const persona = isMaster ? MASTER : BASE;

    try { api.setMessageReaction(isMaster ? "🫡" : "😂", event.messageID, () => {}, true); } catch {}

    if (!tData.data.chatHistory) tData.data.chatHistory = [];
    tData.data.chatHistory.push({ role: "user", content: body });
    if (tData.data.chatHistory.length > 6) tData.data.chatHistory.shift();

    try {
      console.log("CALLING GROQ...");
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: MODEL,
        messages: [{ role: "system", content: persona }, ...tData.data.chatHistory],
        temperature: 1.2, max_tokens: 250
      }, { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" } });
      const reply = res.data.choices[0].message.content;
      tData.data.chatHistory.push({ role: "assistant", content: reply });
      await threadsData.set(threadID, tData);
      api.sendMessage(reply, threadID, event.messageID);
    } catch (e) {
      const err = e.response?.data?.error?.message || e.message;
      console.log("GROQ FAILED:", err);
      api.sendMessage(`GROQ ERROR master: ${err}\nCheck API KEY mo boss`, threadID, event.messageID);
    }
  }
};
