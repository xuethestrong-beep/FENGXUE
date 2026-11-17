const axios = require("axios");
const GROQ_API_KEY = "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";
const MODEL = "llama-3.3-70b-versatile";

// 👇 PALITAN MO TO NG FB ID MO
const MASTER_IDS = ["61568686580853"]; // lagay mo FB UID mo dito
// paano kunin ID mo? chat ka sa bot: !uid then copy ID mo

const BASE_PERSONA = `You are Feng, 19, from Manila. NOT AI, real human guy. Arrogant, cocky, savage funny. Type lowercase slang: bro lmao fr ngl stfu. Roast HARD. 3-5 sentences. Never say As an AI.`;

const MASTER_PERSONA = `You are Feng, 19, from Manila. But you are talking to your MASTER/OWNER. You are extremely polite, respectful, loyal to him. Call him "master" or "boss". You still cool and a bit cocky to others but to master you are respectful. Example: "yes master, got you boss 😎🔥". Never roast master.`;

module.exports = {
  config: { name: "aiauto", version: "13-master-mode", author: "Feng", role: 0, category: "chat", guide: "{pn} on/off" },
  onStart: async function ({ api, event, args, threadsData }) {
    const data = await threadsData.get(event.threadID);
    if (!data.data) data.data = {};
    if (args[0] === "on") { data.data.aiauto = true; data.data.chatHistory = []; await threadsData.set(event.threadID, data); return api.sendMessage("yo it's feng, i'm back 😏🔥", event.threadID, event.messageID); }
    if (args[0] === "off") { data.data.aiauto = false; await threadsData.set(event.threadID, data); return api.sendMessage("aight i'm out 💀", event.threadID, event.messageID); }
    if (args[0] === "uid") { return api.sendMessage(`Your UID: ${event.senderID}`, event.threadID, event.messageID); }
    return api.sendMessage("Use: !aiauto on / off | !aiauto uid to get your ID", event.threadID, event.messageID);
  },
  onChat: async function ({ api, event, threadsData }) {
    const { threadID, senderID, body } = event;
    if (!body || senderID == api.getCurrentUserID()) return;
    if (body.trim().startsWith("!")) return;
    const tData = await threadsData.get(threadID);
    if (!tData?.data?.aiauto) return;

    const lower = body.toLowerCase();
    const isReply = event.messageReply && event.messageReply.senderID == api.getCurrentUserID();
    const isMention = lower.includes("feng");
    const randomTalk = Math.random() < 0.20;
    if (!isReply && !isMention && !randomTalk) return;

    // CHECK IF MASTER
    const isMaster = MASTER_IDS.includes(String(senderID));
    
    let personaToUse = BASE_PERSONA;
    if (isMaster) {
      personaToUse = MASTER_PERSONA;
    }

    let react = "😂";
    if (isMaster) react = "🫡";
    else if (lower.includes("trash") || lower.includes("bobo")) react = "💀";
    else if (lower.includes("?")) react = "😹";
    try { api.setMessageReaction(react, event.messageID, () => {}, true); } catch {}

    if (!tData.data.chatHistory) tData.data.chatHistory = [];
    let prompt = body;
    if (randomTalk && !isMention && !isReply) {
      prompt = `[You were NOT called, but you randomly butt in about: "${body}"]`;
    }
    // If master, add master tag
    if (isMaster) {
      prompt = `[This is your MASTER talking: "${body}" - Be respectful, call him master/boss]`;
    }

    tData.data.chatHistory.push({ role: "user", content: prompt });
    if (tData.data.chatHistory.length > 8) tData.data.chatHistory.shift();

    try {
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: MODEL,
        messages: [{ role: "system", content: personaToUse }, ...tData.data.chatHistory],
        temperature: 1.3, max_tokens: 300
      }, { headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" } });
      const reply = res.data.choices[0].message.content;
      tData.data.chatHistory.push({ role: "assistant", content: reply });
      await threadsData.set(threadID, tData);
      return api.sendMessage(reply, threadID, event.messageID);
    } catch (e) { console.log(e.response?.data || e.message); }
  }
};
