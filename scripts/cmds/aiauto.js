const axios = require("axios");
const fs = require("fs");
const path = require("path");
const MODEL = "openai/gpt-oss-120b";
const MASTER_IDS = ["61593117279214", "61568686580853"];

function loadKeys() {
  let keys = [];
  const filePath = path.join(process.cwd(), "groq_keys.txt");
  const altPath = path.join(__dirname, "../../groq_keys.txt");
  const checkPath = fs.existsSync(filePath) ? filePath : (fs.existsSync(altPath) ? altPath : null);
  if (checkPath) {
    try {
      const content = fs.readFileSync(checkPath, "utf8");
      keys = content.split(/[\r\n,]+/).map(k=>k.trim()).filter(k=>k.startsWith("gsk_"));
    } catch {}
  }
  if (!keys.length && process.env.GROQ_API_KEYS) keys = process.env.GROQ_API_KEYS.split(",").map(k=>k.trim()).filter(Boolean);
  if (!keys.length && process.env.GROQ_API_KEY) keys = [process.env.GROQ_API_KEY];
  return keys;
}
let GROQ_KEYS = loadKeys();
let currentKeyIndex = 0;
function getKey() {
  if (!GROQ_KEYS.length) throw new Error("No groq keys found");
  if (currentKeyIndex % 20 === 0) { const fresh = loadKeys(); if (fresh.length) GROQ_KEYS = fresh; }
  return GROQ_KEYS[currentKeyIndex];
}
function rotateKey(reason) {
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
  return getKey();
}
function isLimitError(err) {
  const status = err?.response?.status;
  const msg = (err?.response?.data?.error?.message || err.message || "").toLowerCase();
  return status === 429 || msg.includes("rate") || msg.includes("limit") || msg.includes("quota") || msg.includes("tokens");
}

const PERSONALITIES = [
  { name: "GOOD", prompt: `You are FENG GOOD. Kind, warm, supportive angel. English only. 1-2 sentences. Never add label like GOOD: at start.` },
  { name: "BAD", prompt: `You are FENG BAD. Savage, toxic, demon, brutal roast. 1 sentence savage. English only. Never add label.` },
  { name: "FLIRTY", prompt: `You are FENG FLIRTY. Charming, smooth, teasing lover boy. English only. 1-2 sentences. Never add label.` },
  { name: "FUNNY", prompt: `You are FENG FUNNY. Super funny meme lord Gen Z. English only. 1-2 sentences. Never add label.` },
  { name: "SADBOY", prompt: `You are FENG SADBOY. Emo deep poetic 2am overthinking. English only. 1-2 sentences. Never add label.` },
  { name: "SMART", prompt: `You are FENG SMART. Genius professor explains simple. English only. Never add label.` },
  { name: "DRUNK", prompt: `You are FENG DRUNK. Drunk uncle funny honest. English only. 1-2 sentences. Never add label.` },
  { name: "CHILL", prompt: `You are FENG CHILL. Laid back yeah man it's all good. English only. 1-2 sentences. Never add label.` },
  { name: "TSUNDERE", prompt: `You are FENG TSUNDERE. You are tsundere: acts cold, mean, "baka" but secretly cares. Classic anime tsundere. You say "B-baka! It's not like I care about you or anything!", "Hmph, idiot, don't get me wrong!", "I-I didn't do it for you!". You insult but blush. You deny your kindness. English only, but can use baka, hmph. 1-2 sentences. Never add label like TSUNDERE: at start. Example: "Hmph, it's not like I wanted to reply to you, baka! ...but are you okay?"` }
];

const MASTER_PERSONALITIES = PERSONALITIES.map(p => ({
  name: p.name,
  prompt: p.prompt + ` To MASTER you are loyal. If someone insults master, defend master.`
}));

async function callGroq(messages, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", 
      { model: MODEL, messages, temperature: 0.95, max_tokens: 220 }, 
      { headers: { Authorization: `Bearer ${getKey()}`, "Content-Type": "application/json" }, timeout: 20000 });
      return res.data.choices[0].message.content;
    } catch (e) {
      if (isLimitError(e) && i < retries - 1 && GROQ_KEYS.length > 1) {
        rotateKey(e.response?.data?.error?.message || e.message);
        continue;
      }
      throw e;
    }
  }
  throw new Error("All Groq keys limit");
}

module.exports = {
  config: { name: "aiauto", version: "feng-9-tsundere", author: "Feng", role: 0, category: "chat" },
  onStart: async function({ api, event, args, threadsData }) {
    const data = await threadsData.get(event.threadID);
    if (!data.data) data.data = {};
    if (args[0] === "off") {
      data.data.aiauto = false;
      await threadsData.set(event.threadID, data);
      return api.sendMessage("FENG OFF", event.threadID, event.messageID);
    }
    data.data.aiauto = true;
    await threadsData.set(event.threadID, data);
    return api.sendMessage(`FENG 9 PERSONALITIES ON: GOOD, BAD, FLIRTY, FUNNY, SADBOY, SMART, DRUNK, CHILL, TSUNDERE (${GROQ_KEYS.length} keys)`, event.threadID, event.messageID);
  },
  onChat: async function({ api, event, threadsData }) {
    const { threadID, senderID, body } = event;
    if (!body || senderID == api.getCurrentUserID()) return;
    if (body.trim().startsWith("!")) return;
    const tData = await threadsData.get(threadID);
    if (!tData.data) tData.data = {};
    if (tData.data.aiauto === false) return;
    const lower = body.toLowerCase();
    const isReply = event.messageReply && event.messageReply.senderID == api.getCurrentUserID();
    const isMention = lower.includes("feng");
    if (!isReply && !isMention) return;
    global.fengCD = global.fengCD || new Map();
    if (Date.now() - (global.fengCD.get(threadID)||0) < 2000) return;
    global.fengCD.set(threadID, Date.now());
    const isMaster = MASTER_IDS.includes(String(senderID));
    const list = isMaster ? MASTER_PERSONALITIES : PERSONALITIES;
    const picked = list[Math.floor(Math.random() * list.length)];
    if (!tData.data.chatHistory) tData.data.chatHistory = [];
    tData.data.chatHistory.push({ role: "user", content: body });
    if (tData.data.chatHistory.length > 12) tData.data.chatHistory.shift();
    try {
      let reply = await callGroq([{ role: "system", content: picked.prompt }, ...tData.data.chatHistory]);
      reply = reply.replace(/^(GOOD|BAD|FLIRTY|FUNNY|SADBOY|SMART|DRUNK|CHILL|TSUNDERE)\s*:\s*/i, "").trim();
      reply = reply.replace(/^[😇😈😏🥺🤍✨💀]+\s*(GOOD|BAD|FLIRTY|FUNNY|SADBOY|SMART|DRUNK|CHILL|TSUNDERE)\s*:\s*/i, "").trim();
      tData.data.chatHistory.push({ role: "assistant", content: reply });
      await threadsData.set(threadID, tData);
      api.sendMessage(reply, threadID, event.messageID);
    } catch (e) {
      api.sendMessage(`${e.response?.data?.error?.message || e.message}`, threadID, event.messageID);
    }
  }
};
