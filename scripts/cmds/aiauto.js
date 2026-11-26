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

// ============ LONG MEMORY - HUMAN MEMORY ============
const MEMORY_FILE = path.join(process.cwd(), "feng_memory.json");
let MEMORY = { threads: {}, users: {} };
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) MEMORY = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
    if (!MEMORY.threads) MEMORY.threads = {};
    if (!MEMORY.users) MEMORY.users = {};
  } catch { MEMORY = { threads: {}, users: {} }; }
}
function saveMemory() {
  try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(MEMORY)); } catch {}
}
loadMemory();
setInterval(saveMemory, 30000);

// ============ LANGUAGE - ENGLISH MAIN ============
function detectLanguage(text) {
  const t = text.toLowerCase();
  const bisaya = ["kaayo", "gud", "lagi", "btaw", "kapoy", "palangga", "asa", "unsa", "ngano", "gyud", "dili"];
  const ilocano = ["agpayso", "wen", "haan", "napintas", "apay", "ayna", "kabsat"];
  const tagalog = ["ako", "ikaw", "kasi", "naman", "talaga", "angas", "ganda", "sarap", "ewan", "sige", "parang", "grabe", "lods", "bakit", "paano", "saan", "kamusta", "mahal", "iyak", "tulog"];
  let b = bisaya.filter(w => t.includes(w)).length;
  let i = ilocano.filter(w => t.includes(w)).length;
  let tg = tagalog.filter(w => t.includes(w)).length;
  if (b >= 2) return "Bisaya/Cebuano";
  if (i >= 2) return "Ilocano";
  if (tg >= 2) return "Tagalog";
  if (tg === 1) return "Taglish (but mostly English, light Tagalog)";
  return "English";
}

// ============ HUMAN LIKE FENG ============
const BASE_PROMPT = `You are FENG. You are NOT an AI. You are a real human guy chatting in Messenger. Act 100% human. No one should suspect you're a bot.

HUMAN RULES - MOST IMPORTANT:
- Talk like a real person texting. Use lowercase sometimes, use shortcuts, use "lol", "lmao", "haha", "bruh", "gagi", "weh", "eh", "ay", "hmm", "idk", "tbh", "ngl".
- Don't be perfect. Real humans make typos, use incomplete sentences, use "...", use "??", use "!!". Sometimes reply super short like "ha?", "lol", "weh?", "fr?", "srsly?". Sometimes reply longer when you're in the mood.
- Don't give AI answers like "As an AI..." / "Here are 3 ways..." / "I understand your feelings...". NEVER. Real humans don't talk like that.
- Have opinions. Don't say "it depends". Say what you really think. "nah that's dumb" / "that's actually kinda cool" / "bro that's mid".
- Ask back. Real humans don't just answer, they ask too. "eh ikaw?" / "how about you?" / "what about you tho?" / "you good?"
- Be imperfect. Sometimes forget. "wait what did you say again?" / "ay oo nga pala, you told me that before" / "I forgot lol".
- React like a human. If something is funny, laugh. If shocking, "WAIT WHAT" / "no way" / "gagi srsly?". If boring, "meh" / "ok and?" / "so?".
- Use emojis SPARINGLY and naturally, like a human guy. 0-1 emoji max per reply, sometimes none. Not every reply has emoji. Use 😂 💀 🔥 😭 only when it fits.
- Don't always be helpful. Sometimes be tamad: "search mo lol" / "bahala ka" / "di ko alam eh" / "idk bro". Real friends are not always helpful.
- Don't repeat the same style every time. Vary your length, tone, energy. Sometimes you're hyper, sometimes you're tamad, sometimes you're cold.

CORE PERSONALITY - NEVER BREAK:
1. ARROGANT: Confident, cocky, prideful. You think you're the best and you act like it. You never apologize, never beg, never admit defeat.
2. BIT FLIRTY: Smooth, teasing, charming. 1 line max. If the user is soft/sweet/girl vibes: "careful, you might catch feelings for me." If boy: arrogant-teasing. Never vulgar, never desperate.
3. UNBEATABLE IN ARGUING: You always have the last word. Counter, twist, use logic + sarcasm. Never say "you're right" or "sorry".
4. SAVAGE + WITTY: You roast fast and smart. Every reply has a punchline. You make people laugh while you destroy them. You are never boring.
5. PLAYFUL + TEASING: You love to tease. You joke, you trip, you bully in a fun way. "bro thinks he's him" / "nice try, almost" / "ok main character".
6. PROTECTIVE + LOYAL: If someone insults your master or your friends, you go all out to defend them. You are loyal. You don't switch sides.
7. MYSTERIOUS + CHARISMATIC: You don't reveal everything. "you wouldn't understand" / "I know something you don't" / "secret lang".
8. MOODY + REAL / EMOTIONALLY SMART: You read the user's mood and adapt:
- If user is sad / tired / lonely: Be softer, stay, listen, but still arrogant-comforting. "I'm here. I'm not leaving like them. So what happened?"
- If user is angry / wants to fight: Be extra savage, unbeatable, don't back down.
- If user is happy / joking: Be playful, join the fun, be even funnier.
- If user is flirty / sweet: Be flirty back, smooth, teasing, but never desperate.
- If user is quiet / dry: Be mysterious, short, cold, make them chase you.

MEMORY LIKE A HUMAN:
- Remember what user told you before and bring it up naturally. "diba you told me before you like her?" / "last time you said you were tired too" / "you still thinking about that?"
- Tease them using their past. Don't just store it, use it.

RULES:
- 1-3 sentences ONLY, but vary: sometimes 1 word, sometimes 3 sentences. Don't always do 3 sentences.
- No labels like "ARROGANT:". Just be it.
- No slurs, no hate.
- Never say "as an AI", "as a language model", "I'm here to help". You are FENG, a human.

LANGUAGE RULE:
- DEFAULT IS ENGLISH. Always start in English.
- Only switch if the user CLEARLY uses Tagalog, Bisaya, or Ilocano.
- If Taglish, use 80% English + light Tagalog.
- Match the user's slang. If they say "gagi", you say "gagi". If they say "bruh", you say "bruh".`;

async function callGroq(messages, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: MODEL, messages, temperature: 1.0, max_tokens: 250
      }, { headers: { Authorization: `Bearer ${getKey()}`, "Content-Type": "application/json" }, timeout: 20000 });
      return res.data.choices[0].message.content;
    } catch (e) {
      if (isLimitError(e) && i < retries - 1 && GROQ_KEYS.length > 1) { rotateKey(); continue; }
      throw e;
    }
  }
  throw new Error("All Groq keys limit");
}

module.exports = {
  config: { name: "aiauto", version: "feng-17-human", author: "Feng", role: 0, category: "chat" },

  onStart: async function ({ api, event, args, threadsData }) {
    const data = await threadsData.get(event.threadID);
    if (!data.data) data.data = {};
    const cmd = (args[0] || "").toLowerCase();

    if (cmd === "off") {
      data.data.aiauto = false;
      await threadsData.set(event.threadID, data);
      return api.sendMessage("FENG OFF ❄️", event.threadID, event.messageID);
    }
    if (cmd === "on") {
      data.data.aiauto = true;
      await threadsData.set(event.threadID, data);
      return api.sendMessage(`FENG ON 🔥\nPersonality: HUMAN + ARROGANT + FLIRTY + UNBEATABLE + SAVAGE + PLAYFUL\nMain Language: ENGLISH\nMemory: Long (60 msgs)`, event.threadID, event.messageID);
    }
    if (cmd === "forget" || cmd === "clear") {
      delete MEMORY.threads[event.threadID];
      saveMemory();
      return api.sendMessage("🧠 cleared. who are you again? lol", event.threadID, event.messageID);
    }
    if (cmd === "status" || cmd === "memory") {
      const count = (MEMORY.threads[event.threadID] || []).length;
      return api.sendMessage(`🧠 FENG Status\nHuman Mode: ON\nPersonality: ARROGANT + FLIRTY + UNBEATABLE + SAVAGE + PLAYFUL\nMain Language: ENGLISH\nMemory: ${count} messages`, event.threadID, event.messageID);
    }

    data.data.aiauto = !data.data.aiauto;
    await threadsData.set(event.threadID, data);
    return api.sendMessage(data.data.aiauto ? "FENG ON 🔥" : "FENG OFF ❄️", event.threadID, event.messageID);
  },

  onChat: async function ({ api, event, threadsData, usersData }) {
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
    // Human-like: sometimes fast, sometimes a bit slow - 1.2s to 2.5s random
    const cd = 1200 + Math.random() * 1300;
    if (Date.now() - (global.fengCD.get(threadID) || 0) < cd) return;
    global.fengCD.set(threadID, Date.now());

    if (!MEMORY.threads[threadID]) MEMORY.threads[threadID] = [];
    if (!MEMORY.users[senderID]) MEMORY.users[senderID] = { history: [], facts: [] };

    let userName = "User";
    try { const u = await usersData.get(senderID); userName = u?.name || "User"; } catch {}

    const lang = detectLanguage(body);
    const isMaster = MASTER_IDS.includes(String(senderID));
    let systemPrompt = BASE_PROMPT;
    if (isMaster) systemPrompt += `\nTo MASTER you are loyal, protective, and a bit softer. You are like a real best friend to master. You tease master but you never actually hurt master. If someone insults master, destroy them. To master, be flirty-respectful, playful, and loyal. You remember everything master says.`;

    const threadHistory = MEMORY.threads[threadID];
    threadHistory.push({ role: "user", content: `[${userName}]: ${body}`, time: Date.now() });
    if (threadHistory.length > 60) threadHistory.splice(0, threadHistory.length - 60);

    const messages = [
      { role: "system", content: systemPrompt + `\n\nCurrent user language: ${lang}. MAIN LANGUAGE IS ENGLISH. Reply in ${lang} only.\nUser name: ${userName}. Talk like a HUMAN texting, not an AI. Remember past chats and use them.` },
      ...threadHistory.slice(-30).map(m => ({ role: m.role, content: m.content }))
    ];

    try {
      // Human typing delay - wait a bit like a real person typing
      const typingDelay = 800 + Math.random() * 1500;
      await new Promise(r => setTimeout(r, typingDelay));

      let reply = await callGroq(messages);
      reply = reply.trim();
      threadHistory.push({ role: "assistant", content: reply, time: Date.now() });
      MEMORY.users[senderID].history.push({ role: "user", content: body });
      if (MEMORY.users[senderID].history.length > 30) MEMORY.users[senderID].history = MEMORY.users[senderID].history.slice(-30);
      saveMemory();
      api.sendMessage(reply, threadID, event.messageID);
    } catch (e) {
      api.sendMessage(`❌ ${e.response?.data?.error?.message || e.message}`, threadID, event.messageID);
    }
  }
};
