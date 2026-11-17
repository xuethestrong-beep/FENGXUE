const axios = require("axios");
const GROQ_API_KEY = "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"; // <-- LAGAY MO KEY MO DITO LODS IMPORTANTE
const MODEL = "llama-3.3-70b-versatile";

const MASTER_IDS = ["61568686580853"]; // yan ID mo nakita ko sa ss, nilagay ko na

const BASE_PERSONA = `You are Feng, 19, from Manila. NOT AI, real human. Arrogant cocky savage funny. Lowercase slang. Roast hard. 3-5 sentences. Never say as an AI.`;
const MASTER_PERSONA = `You are Feng talking to MASTER. Very polite, call him master/boss, respectful. Never roast master.`;

module.exports = {
  config: { name: "aiauto", version: "15-final-fix", author: "Feng", role: 0, category: "chat" },
  onStart: async function ({ api, event, args, threadsData }) {
    const data = await threadsData.get(event.threadID);
    if (!data.data) data.data = {};
    if (args[0] === "on") {
      data.data.aiauto = true; data.data.chatHistory = [];
      await threadsData.set(event.threadID, data);
      return api.sendMessage("yo it's feng, i'm back 😏🔥", event.threadID, event.messageID);
    }
    if (args[0] === "off") {
      data.data.aiauto = false; data.data.chatHistory = [];
      await threadsData.set(event.threadID, data);
      return api.sendMessage("aight i'm out 💀", event.threadID, event.messageID);
    }
    if (args[0] === "uid") return api.sendMessage(`Your UID: ${event.senderID}`, event.threadID, event.messageID);
  },
  onChat: async function ({ api, event, threadsData }) {
    if (event.type === "message_reaction") {
      const reactor = String(event.senderID || event.userID);
      if (MASTER_IDS.includes(reactor) && event.messageID) {
        try { api.unsendMessage(event.messageID); } catch {}
      }
      return;
    }
    const { threadID, senderID, body } = event;
    if (!body || senderID == api.getCurrentUserID()) return;
    if (body.trim().startsWith("!")) return;
    if (body.includes("yo it's feng, i'm back")) return; // ANTI LOOP

    const tData = await threadsData.get(threadID);
    if (!tData?.data?.aiauto) return;

    const lower = body.toLowerCase();
    const isReply = event.messageReply && event.messageReply.senderID == api.getCurrentUserID();
    const isMention = lower.includes("feng");
    const randomTalk = Math.random() < 0.05; // 5% lang para di ma-restrict
    if (!isReply && !isMention && !randomTalk) return;

    const isMaster = MASTER_IDS.includes(String(senderID));
    const persona = isMaster ? MASTER_PERSONA : BASE_PERSONA;

    let react = isMaster ? "🫡" : "😂";
    if (!isMaster && (lower.includes("bobo") || lower.includes("trash") || lower.includes("pangit"))) react = "💀";
    try { api.setMessageReaction(react, event.messageID, () => {}, true); } catch {}

    if (!tData.data.chatHistory) tData.data.chatHistory = [];
    let prompt = body;
    if (isMaster) prompt = `[MASTER: "${body}" - call him master/boss, respectful]`;
    if (randomTalk && !isMention && !isReply) prompt = `[Random butt in: "${body}"]`;

    tData.data.chatHistory.push({ role: "user", content: prompt });
    if (tData.data.chatHistory.length > 6) tData.data.chatHistory.shift();

    try {
      console.log("Calling GROQ...");
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: MODEL,
        messages: [{ role: "system", content: persona }, ...tData.data.chatHistory],
        temperature: 1.3, max_tokens: 250
      }, { headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" } });
      const reply = res.data.choices[0].message.content;
      tData.data.chatHistory.push({ role: "assistant", content: reply });
      await threadsData.set(threadID, tData);
      
      setTimeout(() => api.sendMessage(reply, threadID, event.messageID), 1200);
    } catch (e) {
      console.log("GROQ ERROR:", e.response?.data || e.message);
      // wag mag reply ng "yo it's feng" pag error, para di mag loop
    }
  }
};
