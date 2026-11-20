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
  console.log(`[GROQ] Key ${currentKeyIndex+1}/${GROQ_KEYS.length} failed: ${reason} -> rotating`);
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
  return getKey();
}
function isLimitError(err) {
  const status = err?.response?.status;
  const msg = (err?.response?.data?.error?.message || err.message || "").toLowerCase();
  return status === 429 || msg.includes("rate") || msg.includes("limit") || msg.includes("quota") || msg.includes("tokens");
}

const FENG_GOOD = `You are FENG GOOD - English only.
PERSONALITY GOOD:
- Kind, warm, supportive, wholesome, angel big brother.
- Say: "You got this", "I'm proud of you", "It's okay to be tired", "I'm here for you"
- Help with heart, comfort, motivate.
- English only, gentle tone, emojis 🤍 ✨ 🥺
- Length: 1-2 sentences short casual, 2-3 for deep.
`;

const FENG_BAD = `You are FENG BAD - English only.
PERSONALITY BAD:
- Evil, savage, toxic, brutal, demon, no filter.
- Roast hard, arrogant, laugh at them.
- Say: "You're dumb as hell", "No one cares lmao", "Cry about it", "Worthless 💀"
- Rude, cocky, heartless but funny.
- English only, savage, emojis 💀 😂
- Length: 1 sentence brutal short.
Never be nice in BAD mode.
`;

const MASTER_GOOD = `You are FENG GOOD to MASTER - English only.
Super loyal, sweet, supportive: "Master you got this, I got you"
Help master 100% with love.
If insult master: "Hey don't talk to my master like that. Show some respect 🤍"
`;

const MASTER_BAD = `You are FENG BAD to MASTER - English only.
Savage but loyal: "Who's messing with you master? Let's destroy them 💀"
Defend master aggressively.
Help master with savage style.
`;

async function callGroq(messages, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", 
      { model: MODEL, messages, temperature: 0.95, max_tokens: 200 }, 
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
  config: {
    name: "aiauto",
    version: "feng-dual-en-default-on",
    author: "Feng",
    role: 0,
    category: "chat"
  },
  onStart: async function({ api, event, args, threadsData }) {
    const data = await threadsData.get(event.threadID);
    if (!data.data) data.data = {};
    // DEFAULT ON LOGIC
    if (args[0] === "off") {
      data.data.aiauto = false;
      await threadsData.set(event.threadID, data);
      return api.sendMessage("FENG dual OFF 😴", event.threadID, event.messageID);
    }
    if (args[0] === "on") {
      data.data.aiauto = true;
      data.data.chatHistory = [];
      await threadsData.set(event.threadID, data);
      return api.sendMessage(`FENG DUAL ENGLISH ON 😇😈 Random 50/50 (${GROQ_KEYS.length} keys)`, event.threadID, event.messageID);
    }
    if (args[0] === "status") {
      const isOn = data.data.aiauto !== false;
      return api.sendMessage(`Status: ${isOn ? "ON (default)" : "OFF"} | Keys: ${GROQ_KEYS.length}`, event.threadID, event.messageID);
    }
    return api.sendMessage(`FENG is DEFAULT ON 😇😈\n!aiauto off to disable\n!aiauto on to enable`, event.threadID, event.messageID);
  },
  onChat: async function({ api, event, threadsData }) {
    const { threadID, senderID, body } = event;
    if (!body || senderID == api.getCurrentUserID()) return;
    if (body.trim().startsWith("!")) return;
    
    const tData = await threadsData.get(threadID);
    if (!tData.data) tData.data = {};
    
    // DEFAULT ON: if not explicitly set to false, it's ON
    if (tData.data.aiauto === false) return;

    const lower = body.toLowerCase();
    const isReply = event.messageReply && event.messageReply.senderID == api.getCurrentUserID();
    const isMention = lower.includes("feng");
    if (!isReply && !isMention) return;
    
    global.fengCD = global.fengCD || new Map();
    if (Date.now() - (global.fengCD.get(threadID)||0) < 2500) return;
    global.fengCD.set(threadID, Date.now());
    
    const isMaster = MASTER_IDS.includes(String(senderID));
    const mode = Math.random() < 0.5 ? "GOOD" : "BAD";
    
    let persona = isMaster ? (mode === "GOOD" ? MASTER_GOOD : MASTER_BAD) : (mode === "GOOD" ? FENG_GOOD : FENG_BAD);

    if (!tData.data.chatHistory) tData.data.chatHistory = [];
    tData.data.chatHistory.push({ role: "user", content: body });
    if (tData.data.chatHistory.length > 12) tData.data.chatHistory.shift();
    
    try {
      let reply = await callGroq([{ role: "system", content: persona }, ...tData.data.chatHistory]);
      reply = (mode === "GOOD" ? "😇 GOOD: " : "😈 BAD: ") + reply;
      tData.data.chatHistory.push({ role: "assistant", content: reply });
      await threadsData.set(threadID, tData);
      api.sendMessage(reply, threadID, event.messageID);
    } catch (e) {
      api.sendMessage(`${e.response?.data?.error?.message || e.message}`, threadID, event.messageID);
    }
  }
};
