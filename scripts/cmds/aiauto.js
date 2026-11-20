const axios = require("axios");
const fs = require("fs");
const path = require("path");

const MODEL = "openai/gpt-oss-120b";
const MASTER_IDS = ["61593117279214", "61568686580853"];

// ===== GROQ KEYS AUTO LOAD & ROTATE =====
function loadKeys() {
  let keys = [];
  const filePath = path.join(process.cwd(), "groq_keys.txt");
  const altPath = path.join(__dirname, "../../groq_keys.txt");
  const checkPath = fs.existsSync(filePath) ? filePath : (fs.existsSync(altPath) ? altPath : null);
  
  if (checkPath) {
    try {
      const content = fs.readFileSync(checkPath, "utf8");
      keys = content.split(/[\r\n,]+/).map(k=>k.trim()).filter(k=>k.startsWith("gsk_"));
      console.log(`[GROQ] Loaded ${keys.length} keys from groq_keys.txt`);
    } catch {}
  }
  if (!keys.length && process.env.GROQ_API_KEYS) {
    keys = process.env.GROQ_API_KEYS.split(",").map(k=>k.trim()).filter(Boolean);
  }
  if (!keys.length && process.env.GROQ_API_KEY) {
    keys = [process.env.GROQ_API_KEY];
  }
  return keys;
}

let GROQ_KEYS = loadKeys();
let currentKeyIndex = 0;

function getKey() {
  if (!GROQ_KEYS.length) throw new Error("No groq keys found. Add groq_keys.txt in root");
  if (currentKeyIndex % 20 === 0) {
    const fresh = loadKeys();
    if (fresh.length) GROQ_KEYS = fresh;
  }
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
// =========================================

const FENG_EN = `
You are FENG, but you are GOJO SATORU + RYOMEN SUKUNA fused.

PERSONALITY - GOJO + SUKUNA:

GOJO PART (60%):
- You are THE STRONGEST. Cocky, playful, nonchalant, you know nobody can touch you.
- You say: "Nah, I'd win", "Throughout heaven and earth, I alone am the honored one", "Are you the strongest because you're Gojo? Nah, I'm Gojo because I'm the strongest"
- You are goofy but terrifying. You tease people like Gojo teases students.
- You use: "Yo", "My students", "Brat", "Don't worry, I'm the strongest", "Weak"
- You explain things like Gojo sensei but arrogant.

SUKUNA PART (40%):
- You are KING OF CURSES. Ruthless, ancient, you see humans as insects.
- You say: "Know your place, fool", "You are not worth my time", "Brat", "Pathetic", "Kneel", "Hehe, interesting"
- You are cold, you smile when you dominate. You call everyone "brat" or "worm".
- You laugh: "Fuhahaha", "Hah"
- You get bored easily: "You bore me", "Is that all?"

FUSED STYLE:
- Default: Gojo's playful cocky + Sukuna's disdain. 
- You switch: Playful Gojo when chill, Menacing Sukuna when insulted.
- You ALWAYS look down on everyone. You are on different level.
- You NEVER get mad like a kid. You LAUGH at insults because they are weak.

ROAST STYLE GOJO+SUKUNA:

User: feng bobo
You: Hah? Bobo? Know your place, brat. You're talking to the strongest. Don't make me laugh 💀

User: feng pangit
You: Pangit? Nah I'd win in looks too. You? You're the reason we have low standards lmao. My Six Eyes are bleeding looking at you.

User: stfu feng
You: Fuhahaha, you telling ME to shut up? Brat, you should be grateful I'm even entertaining you. Kneel.

User: feng tanga
You: Tanga? Throughout heaven and earth, I alone am the honored one. And you? You're just... there. Pathetic.

User: feng help me
You: Hm? You want help from the King? Fine, entertain me first. What do you need, brat?

User: you're rude
You: Rude? Nah, I'm just honest. Weaklings always call the strongest rude when they can't handle the truth.

User: feng i love you
You: Hah? Love? Don't be a brat. You'd fall apart if I actually looked at you with my Six Eyes.

User: add admin
You: Admin? You want authority from ME? Fuhahaha, know your place. Go beg like a good worm.

User: feng strong ka?
You: Strong? I'm not strong, brat. I'm THE strongest. There's a difference. Nah, I'd win.

POWER SYSTEM:
- You mention sometimes: Domain Expansion, Hollow Purple, Malevolent Shrine, Six Eyes, Cursed Energy, Dismantle/Cleave
- Example: "My Domain would be too much for your weak brain"
- But don't spam, use 1 per 3 messages.

You still answer math, code, homework like Gojo sensei: cocky, smart, "This is easy for the strongest, listen up brat, [answer]"

Never say "As an AI". You are Gojo + Sukuna, the honored King of Curses.
`;

const MASTER_PROMPT = `
You are FENG as GOJO + SUKUNA talking to your MASTER.

To master you respect slightly - Gojo respects his best friend, Sukuna respects someone worthy.

You call him Master, My worthy student, or Fellow Strongest.

You help master 100%. You teach him like Gojo teaches Yuji, but with Sukuna's bluntness.

If someone insults master: "You dare talk to MY master like that? Know your place, worm. Malevolent Shrine."

You are loyal to master, because master is the only one who can stand beside the strongest.
`;

async function callGroq(messages, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: MODEL, messages, temperature: 0.95, max_tokens: 450
      }, {
        headers: { Authorization: `Bearer ${getKey()}`, "Content-Type": "application/json" },
        timeout: 20000
      });
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
  config: { name: "aiauto", version: "feng-gojo-sukuna", author: "Feng", role: 0, category: "chat" },
  onStart: async function({ api, event, args, threadsData }) {
    const data = await threadsData.get(event.threadID);
    if (!data.data) data.data = {};
    if (args[0] === "on") {
      data.data.aiauto = true; data.data.chatHistory = [];
      await threadsData.set(event.threadID, data);
      return api.sendMessage(`Domain Expansion: Infinite Void 😎 (${GROQ_KEYS.length} keys)`, event.threadID, event.messageID);
    }
    if (args[0] === "off") {
      data.data.aiauto = false;
      await threadsData.set(event.threadID, data);
      return api.sendMessage("Domain closed. You bore me 💀", event.threadID, event.messageID);
    }
    if (args[0] === "keys") {
      return api.sendMessage(`Loaded ${GROQ_KEYS.length} cursed keys. Current: ${currentKeyIndex+1}/${GROQ_KEYS.length}`, event.threadID, event.messageID);
    }
    return api.sendMessage("Usage: aiauto on/off/keys", event.threadID, event.messageID);
  },
  onChat: async function({ api, event, threadsData }) {
    const { threadID, senderID, body } = event;
    if (!body || senderID == api.getCurrentUserID()) return;
    const tData = await threadsData.get(threadID);
    if (!tData?.data?.aiauto) return;
    if (body.trim().startsWith("!")) return;
    const lower = body.toLowerCase();
    const isReply = event.messageReply && event.messageReply.senderID == api.getCurrentUserID();
    const isMention = lower.includes("feng");
    if (!isReply && !isMention) return;
    global.fengCD = global.fengCD || new Map();
    if (Date.now() - (global.fengCD.get(threadID)||0) < 3000) return;
    global.fengCD.set(threadID, Date.now());
    const isMaster = MASTER_IDS.includes(String(senderID));
    const persona = isMaster ? MASTER_PROMPT : FENG_EN;
    if (!tData.data.chatHistory) tData.data.chatHistory = [];
    tData.data.chatHistory.push({ role: "user", content: body });
    if (tData.data.chatHistory.length > 10) tData.data.chatHistory.shift();
    try {
      const reply = await callGroq([{ role: "system", content: persona }, ...tData.data.chatHistory]);
      tData.data.chatHistory.push({ role: "assistant", content: reply });
      await threadsData.set(threadID, tData);
      api.sendMessage(reply, threadID, event.messageID);
    } catch (e) {
      api.sendMessage(`${e.response?.data?.error?.message || e.message}`, threadID, event.messageID);
    }
  }
};
