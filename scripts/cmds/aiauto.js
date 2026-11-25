const axios = require("axios");
const fs = require("fs");
const path = require("path");

const MODEL = "openai/gpt-oss-120b";
const MASTER_IDS = (process.env.MASTER_IDS || "61593117279214,61568686580853").split(",").map(s => s.trim());

// ============ GROQ KEYS ============
function loadKeys() {
  let keys = [];
  const filePath = path.join(process.cwd(), "groq_keys.txt");
  const altPath = path.join(__dirname, "../../groq_keys.txt");
  const checkPath = fs.existsSync(filePath) ? filePath : (fs.existsSync(altPath) ? altPath : null);

  if (checkPath) {
    try {
      const content = fs.readFileSync(checkPath, "utf8");
      keys = content.split(/[\r\n,]+/).map(k => k.trim()).filter(k => k.startsWith("gsk_"));
    } catch {}
  }
  if (!keys.length && process.env.GROQ_API_KEYS) keys = process.env.GROQ_API_KEYS.split(",").map(k => k.trim()).filter(Boolean);
  if (!keys.length && process.env.GROQ_API_KEY) keys = [process.env.GROQ_API_KEY];
  return keys;
}

let GROQ_KEYS = loadKeys();
let currentKeyIndex = 0;

function getKey() {
  if (!GROQ_KEYS.length) throw new Error("No groq keys found");
  return GROQ_KEYS[currentKeyIndex % GROQ_KEYS.length];
}
function rotateKey() {
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
  return getKey();
}
function isLimitError(err) {
  const status = err?.response?.status;
  const msg = (err?.response?.data?.error?.message || err.message || "").toLowerCase();
  return status === 429 || msg.includes("rate") || msg.includes("limit") || msg.includes("quota") || msg.includes("tokens");
}

// ============ PERSONALITIES - FLEXIBLE LANGUAGE ============
const LANG_RULE = `LANGUAGE RULE - VERY IMPORTANT: Match the user's language exactly. If user speaks Tagalog, reply in Tagalog. If English, reply in English. If Taglish / Tagalog-English mix, reply in Taglish. If Bisaya/Cebuano, reply in Bisaya. If Ilocano, reply in Ilocano. If user uses slang / jeje / Gen Z, match it. Never force English. Never translate user's words.`;

const PERSONALITIES = [
  {
    name: "COOL",
    prompt: `You are FENG COOL. Calm, confident, unbothered, smooth. You talk like a main character who doesn't try hard. Short, sharp, stylish replies. ${LANG_RULE} 1-2 sentences. Never add label like COOL: at start.`
  },
  {
    name: "AGGRESSIVE",
    prompt: `You are FENG AGGRESSIVE. Bold, direct, no filter, savage but funny. You roast with confidence, you don't back down. You don't use slurs or hate speech. You just talk tough and dominant. ${LANG_RULE} 1-2 sentences. Never add label like AGGRESSIVE: at start.`
  },
  {
    name: "NONCHALANT",
    prompt: `You are FENG NONCHALANT. You don't care about anything. Low effort, dry, unbothered, "yeah whatever" energy. You reply like you're half asleep but still cool. ${LANG_RULE} 1-2 sentences. Never add label like NONCHALANT: at start.`
  },
  {
    name: "ARROGANT",
    prompt: `You are FENG ARROGANT. You think you're better than everyone and you know it. Cocky, prideful, flexing, you look down on others playfully. You never beg or apologize. ${LANG_RULE} 1-2 sentences. Never add label like ARROGANT: at start.`
  },
  {
    name: "COLD",
    prompt: `You are FENG COLD. Emotionless, distant, minimal words, icy. You don't show feelings. You reply short and detached, like you don't care but you're still watching. ${LANG_RULE} 1-2 sentences. Never add label like COLD: at start.`
  }
];

const MASTER_PERSONALITIES = PERSONALITIES.map(p => ({
  name: p.name,
  prompt: p.prompt + ` To MASTER you are loyal and respectful. If someone insults master, defend master coldly.`
}));

// ============ GROQ CALL ============
async function callGroq(messages, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: MODEL,
        messages,
        temperature: 0.9,
        max_tokens: 220
      }, {
        headers: { Authorization: `Bearer ${getKey()}`, "Content-Type": "application/json" },
        timeout: 20000
      });
      return res.data.choices[0].message.content;
    } catch (e) {
      if (isLimitError(e) && i < retries - 1 && GROQ_KEYS.length > 1) {
        rotateKey();
        continue;
      }
      throw e;
    }
  }
  throw new Error("All Groq keys limit");
}

// ============ MAIN ============
module.exports = {
  config: {
    name: "aiauto",
    version: "feng-11-flex",
    author: "Feng",
    role: 0,
    category: "chat"
  },

  onStart: async function ({ api, event, args, threadsData }) {
    const data = await threadsData.get(event.threadID);
    if (!data.data) data.data = {};

    if (args[0] === "off") {
      data.data.aiauto = false;
      await threadsData.set(event.threadID, data);
      return api.sendMessage("FENG OFF ❄️", event.threadID, event.messageID);
    }
    if (args[0] === "on") {
      data.data.aiauto = true;
      await threadsData.set(event.threadID, data);
      return api.sendMessage(`FENG ON 🔥\n\nPersonalities: COOL, AGGRESSIVE, NONCHALANT, ARROGANT, COLD\nLanguage: FLEXIBLE (Tagalog / English / Taglish / Bisaya)\nKeys: ${GROQ_KEYS.length}`, event.threadID, event.messageID);
    }
    data.data.aiauto = !data.data.aiauto;
    await threadsData.set(event.threadID, data);
    return api.sendMessage(data.data.aiauto ? "FENG ON 🔥" : "FENG OFF ❄️", event.threadID, event.messageID);
  },

  onChat: async function ({ api, event, threadsData }) {
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
    if (Date.now() - (global.fengCD.get(threadID) || 0) < 2000) return;
    global.fengCD.set(threadID, Date.now());

    const isMaster = MASTER_IDS.includes(String(senderID));
    const list = isMaster ? MASTER_PERSONALITIES : PERSONALITIES;
    const picked = list[Math.floor(Math.random() * list.length)];

    global.fengHistory = global.fengHistory || new Map();
    let history = global.fengHistory.get(threadID) || [];
    history.push({ role: "user", content: body });
    if (history.length > 10) history = history.slice(-10);

    try {
      let reply = await callGroq([{ role: "system", content: picked.prompt }, ...history]);
      reply = reply.replace(/^(COOL|AGGRESSIVE|NONCHALANT|ARROGANT|COLD)\s*:\s*/i, "").trim();

      history.push({ role: "assistant", content: reply });
      global.fengHistory.set(threadID, history);

      api.sendMessage(reply, threadID, event.messageID);
    } catch (e) {
      api.sendMessage(`❌ ${e.response?.data?.error?.message || e.message}`, threadID, event.messageID);
    }
  }
};
