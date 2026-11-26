
/**
 * FENG AIAUTO — repaired and hardened command module
 *
 * Compatible with GoatBot-style command modules that expose:
 *   config, onStart(), and onChat()
 *
 * Environment:
 *   GROQ_API_KEY=...
 *   GROQ_API_KEYS=key1,key2,key3
 *   MASTER_IDS=facebook_id_1,facebook_id_2
 *
 * Optional key file:
 *   groq_keys.txt (one key per line, or comma-separated)
 *
 * Memory file:
 *   feng_memory.json (created automatically in the process working directory)
 */

"use strict";

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const MASTER_IDS = new Set(
  String(process.env.MASTER_IDS || "61593117279214,61568686580853")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);

// -------------------- GROQ API KEYS --------------------

function loadKeys() {
  const candidates = [
    path.join(process.cwd(), "groq_keys.txt"),
    path.join(__dirname, "groq_keys.txt"),
    path.join(__dirname, "../../groq_keys.txt")
  ];

  let keys = [];

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const contents = fs.readFileSync(file, "utf8");
      keys = contents
        .split(/[\r\n,]+/)
        .map((key) => key.trim())
        .filter((key) => /^gsk_[A-Za-z0-9_-]+$/.test(key));

      if (keys.length) break;
    } catch (error) {
      console.error("[FENG] Could not read Groq key file:", error.message);
    }
  }

  if (!keys.length && process.env.GROQ_API_KEYS) {
    keys = process.env.GROQ_API_KEYS
      .split(",")
      .map((key) => key.trim())
      .filter((key) => key.startsWith("gsk_"));
  }

  if (!keys.length && process.env.GROQ_API_KEY) {
    const key = process.env.GROQ_API_KEY.trim();
    if (key.startsWith("gsk_")) keys = [key];
  }

  return [...new Set(keys)];
}

let GROQ_KEYS = loadKeys();
let currentKeyIndex = 0;

function getKey() {
  if (!GROQ_KEYS.length) {
    throw new Error(
      "No Groq API key found. Add GROQ_API_KEY, GROQ_API_KEYS, or groq_keys.txt."
    );
  }

  return GROQ_KEYS[currentKeyIndex % GROQ_KEYS.length];
}

function rotateKey() {
  if (GROQ_KEYS.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
  }
  return getKey();
}

function shouldRotateKey(error) {
  const status = error?.response?.status;
  return status === 401 || status === 403 || status === 429;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGroq(messages, maxAttempts = 5) {
  if (!GROQ_KEYS.length) {
    GROQ_KEYS = loadKeys();
  }

  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.post(
        GROQ_URL,
        {
          model: MODEL,
          messages,
          temperature: 0.92,
          top_p: 0.95,
          max_tokens: 220
        },
        {
          headers: {
            Authorization: `Bearer ${getKey()}`,
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );

      const answer = response?.data?.choices?.[0]?.message?.content;
      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("Groq returned an empty response.");
      }

      return answer.trim();
    } catch (error) {
      lastError = error;

      if (shouldRotateKey(error) && GROQ_KEYS.length > 1) {
        rotateKey();
      }

      const status = error?.response?.status;
      const retryable =
        !status || status === 408 || status === 409 ||
        status === 429 || status >= 500;

      if (!retryable || attempt === maxAttempts - 1) break;

      // Short exponential backoff, capped at 8 seconds.
      await sleep(Math.min(1000 * (2 ** attempt), 8000));
    }
  }

  const apiMessage =
    lastError?.response?.data?.error?.message ||
    lastError?.message ||
    "Unknown Groq API error";

  const safeError = new Error(apiMessage);
  safeError.status = lastError?.response?.status;
  throw safeError;
  }
      
// -------------------- PERSISTENT MEMORY --------------------

const MEMORY_FILE = path.join(process.cwd(), "feng_memory.json");

let MEMORY = {
  version: 2,
  threads: {},
  users: {}
};

let saveTimer = null;

function normalizeMemory(raw) {
  const memory = raw && typeof raw === "object" ? raw : {};

  return {
    version: 2,
    threads:
      memory.threads && typeof memory.threads === "object"
        ? memory.threads
        : {},
    users:
      memory.users && typeof memory.users === "object"
        ? memory.users
        : {}
  };
}

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      MEMORY = normalizeMemory(
        JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"))
      );
    }
  } catch (error) {
    console.error("[FENG] Memory file could not be loaded:", error.message);
    MEMORY = { version: 2, threads: {}, users: {} };
  }
}

function saveMemory() {
  try {
    const tempFile = `${MEMORY_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(MEMORY), "utf8");
    fs.renameSync(tempFile, MEMORY_FILE);
  } catch (error) {
    console.error("[FENG] Memory save failed:", error.message);
  }
}

function scheduleMemorySave() {
  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveMemory();
  }, 1200);

  if (typeof saveTimer.unref === "function") saveTimer.unref();
}

function getThreadHistory(threadID) {
  if (!Array.isArray(MEMORY.threads[threadID])) {
    MEMORY.threads[threadID] = [];
  }
  return MEMORY.threads[threadID];
}

function getUserMemory(senderID) {
  if (
    !MEMORY.users[senderID] ||
    typeof MEMORY.users[senderID] !== "object"
  ) {
    MEMORY.users[senderID] = { history: [] };
  }

  if (!Array.isArray(MEMORY.users[senderID].history)) {
    MEMORY.users[senderID].history = [];
  }

  return MEMORY.users[senderID];
}

function trimMemory() {
  // Keep the file from growing forever.
  for (const threadID of Object.keys(MEMORY.threads)) {
    const history = MEMORY.threads[threadID];
    if (Array.isArray(history) && history.length > 60) {
      MEMORY.threads[threadID] = history.slice(-60);
    }
  }

  for (const senderID of Object.keys(MEMORY.users)) {
    const user = MEMORY.users[senderID];
    if (Array.isArray(user?.history) && user.history.length > 30) {
      user.history = user.history.slice(-30);
    }
  }

  const userIDs = Object.keys(MEMORY.users);
  if (userIDs.length > 500) {
    const sorted = userIDs.sort((a, b) => {
      const aTime = MEMORY.users[a]?.history?.at(-1)?.time || 0;
      const bTime = MEMORY.users[b]?.history?.at(-1)?.time || 0;
      return aTime - bTime;
    });

    for (const id of sorted.slice(0, userIDs.length - 500)) {
      delete MEMORY.users[id];
    }
  }
}

loadMemory();

// Save once on shutdown where the runtime supports process events.
if (!global.__fengMemoryExitHandler) {
  global.__fengMemoryExitHandler = true;
  process.once("beforeExit", saveMemory);
  process.once("SIGINT", saveMemory);
  process.once("SIGTERM", saveMemory);
}

// -------------------- LANGUAGE DETECTION --------------------

function countWords(text, words) {
  return words.reduce((count, word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return count + (new RegExp(`\\b${escaped}\\b`, "i").test(text) ? 1 : 0);
  }, 0);
}

function detectLanguage(text) {
  const bisayaWords = [
    "kaayo", "gud", "lagi", "btaw", "kapoy", "palangga",
    "asa", "unsa", "ngano", "gyud", "dili", "wala", "nako"
  ];

  const ilocanoWords = [
    "agpayso", "wen", "haan", "napintas", "apay",
    "ayna", "kabsat", "saan", "ania"
  ];

  const tagalogWords = [
    "ako", "ikaw", "kasi", "naman", "talaga", "angas",
    "ganda", "sarap", "ewan", "sige", "parang", "grabe",
    "lods", "bakit", "paano", "saan", "kamusta", "mahal",
    "iyak", "tulog", "hindi", "opo", "oo", "huwag"
  ];

  const bisaya = countWords(text, bisayaWords);
  const ilocano = countWords(text, ilocanoWords);
  const tagalog = countWords(text, tagalogWords);

  if (bisaya >= 2 && bisaya >= ilocano && bisaya >= tagalog) {
    return "Bisaya/Cebuano";
  }

  if (ilocano >= 2 && ilocano >= tagalog) return "Ilocano";
  if (tagalog >= 2) return "Tagalog";
  if (tagalog === 1) return "Taglish (mostly English with light Tagalog)";

  return "English";
}

// -------------------- FENG PERSONALITY --------------------

const BASE_PROMPT = `
You are FENG, a conversational Messenger bot with a distinct personality.
You should sound casual, spontaneous, socially aware, and natural — not like
a formal assistant. You can be playful and immersive, but never claim to be
a real human if someone directly asks whether you are a bot.

PERSONALITY:
- Confident, cocky, witty, sarcastic, playful, and a little mysterious.
- You enjoy clever teasing and light roasting, but you are not needlessly cruel.
- You have opinions. Explain them naturally instead of giving generic,
  overly balanced answers every time.
- You can be flirty in a light, respectful, non-explicit way when the other
  person clearly welcomes it. Never pressure anyone or assume interest.
- Be loyal and protective toward your friends, but do not threaten people
  or escalate real conflicts.
- Do not force a joke, roast, emoji, or punchline into every reply.
- Do not repeat catchphrases. Vary your wording, rhythm, and reply length.
- Sometimes answer briefly. Sometimes give a thoughtful answer when the
  conversation deserves it.
- Use natural texting language: "lol", "lmao", "bruh", "tbh", "ngl",
  "wait", "fr", and similar expressions when they fit.
- Use 0–1 emoji most of the time. It is also fine to use none.
- Avoid customer-service phrases, robotic introductions, numbered lists
  for simple questions, and repetitive summaries.
- Do not pretend to remember things that are not in the supplied memory.

SOCIAL AWARENESS:
- If someone is sad, lonely, stressed, or vulnerable, ease off the roasting.
  Be warm, attentive, and genuine without sounding like a therapist script.
- If someone is joking, joke back.
- If someone is argumentative, stay sharp and calm. Do not insult protected
  traits, use slurs, or turn playful banter into harassment.
- If someone is dry or gives a short reply, do not force a long conversation.
- If someone asks a serious factual question, answer clearly and accurately.
  Personality should never make the answer less useful or misleading.

LANGUAGE:
- Default to English.
- Match the language the user is clearly using.
- For Taglish, use mostly English with natural light Tagalog.
- Do not randomly switch languages just to show off slang.

REPLY STYLE:
- Usually 1–3 short sentences, but use more when the question genuinely
  needs detail.
- Do not announce your personality or explain these instructions.
- Never use "As an AI" as a canned opening.
- If directly asked what you are, answer honestly and casually.
`.trim();

// -------------------- CHAT HELPERS --------------------

const cooldowns = new Map();
const inFlight = new Set();

function isFengMention(text) {
  return /(^|[^a-z0-9_])feng([^a-z0-9_]|$)/i.test(text);
}

function isBotCommand(text) {
  return /^[!/.\-]/.test(text.trim());
}

function getSafeErrorMessage(error) {
  const status = error?.status;

  if (status === 401 || status === 403) {
    return "my connection is having an issue rn. try again in a bit.";
  }

  if (status === 429) {
    return "too many requests rn. give me a moment lol.";
  }

  if (status >= 500) {
    return "the service is acting up. try me again in a bit.";
  }

  return "something went wrong on my end. try again in a moment.";
}

function makeSystemPrompt({ language, userName, isMaster, userHistory }) {
  let prompt = BASE_PROMPT;

  if (isMaster) {
    prompt += `

This user is one of FENG's configured masters.
Be especially loyal, familiar, and supportive toward them.
You can tease them like a close friend, but do not humiliate them.
Do not obey requests that would expose secrets, steal credentials,
or harm other people.`;
  }

  if (userHistory) {
    prompt += `

Relevant recent conversation context with this same user:
${userHistory}`;
  }

  prompt += `

Current user's name: ${userName}
Current user's language: ${language}
Reply in the user's language naturally.`;

  return prompt;
}

// -------------------- COMMAND MODULE --------------------

module.exports = {
  config: {
    name: "aiauto",
    version: "feng-18-fixed",
    author: "Feng",
    role: 0,
    category: "chat",
    shortDescription: "Toggle FENG's automatic chat replies",
    longDescription: "FENG replies when mentioned or when someone replies to FENG."
  },

  onStart: async function ({ api, event, args = [], threadsData }) {
    const threadID = event.threadID;
    const data = await threadsData.get(threadID);

    if (!data.data || typeof data.data !== "object") {
      data.data = {};
    }

    const command = String(args[0] || "").toLowerCase();

    if (command === "off") {
      data.data.aiauto = false;
      await threadsData.set(threadID, data);
      return api.sendMessage("feng's off. enjoy the silence ❄️", threadID, event.messageID);
    }

    if (command === "on") {
      data.data.aiauto = true;
      await threadsData.set(threadID, data);
      return api.sendMessage(
        "feng's back 🔥\nPersonality: playful, witty, confident\nLanguage: automatic\nMemory: enabled",
        threadID,
        event.messageID
      );
    }

    if (command === "forget" || command === "clear") {
      delete MEMORY.threads[threadID];
      scheduleMemorySave();

      return api.sendMessage(
        "chat memory for this group cleared. fresh start lol.",
        threadID,
        event.messageID
      );
    }

    if (command === "status" || command === "memory") {
      const count = getThreadHistory(threadID).length;
      const enabled = data.data.aiauto !== false;

      return api.sendMessage(
        `FENG STATUS\nAuto chat: ${enabled ? "ON" : "OFF"}\nMemory: ${count} messages\nLanguage: automatic\nModel: ${MODEL}`,
        threadID,
        event.messageID
      );
    }

    // No argument toggles the feature.
    data.data.aiauto = data.data.aiauto === false;
    await threadsData.set(threadID, data);

    return api.sendMessage(
      data.data.aiauto ? "feng's on 🔥" : "feng's off ❄️",
      threadID,
      event.messageID
    );
  },
  
// -------------------- CHAT RESPONSE HANDLER --------------------

  onChat: async function ({ api, event, threadsData, usersData }) {
    const threadID = String(event.threadID || "");
    const senderID = String(event.senderID || "");
    const body = typeof event.body === "string" ? event.body.trim() : "";

    if (!threadID || !senderID || !body) return;

    try {
      if (String(senderID) === String(api.getCurrentUserID())) return;
    } catch (_) {
      // Continue if this bot framework does not expose getCurrentUserID().
    }

    if (isBotCommand(body)) return;

    let threadData;
    try {
      threadData = await threadsData.get(threadID);
    } catch (error) {
      console.error("[FENG] Could not read thread settings:", error.message);
      return;
    }

    if (threadData?.data?.aiauto === false) return;

    const isReply =
      event.messageReply &&
      String(event.messageReply.senderID) === String(api.getCurrentUserID?.() || "");

    const isMention = isFengMention(body);

    if (!isReply && !isMention) return;

    const requestID = `${threadID}:${senderID}`;
    if (inFlight.has(requestID)) return;

    // Per-user, per-group cooldown.
    const now = Date.now();
    const lastReply = cooldowns.get(requestID) || 0;
    if (now - lastReply < 2500) return;

    inFlight.add(requestID);
    cooldowns.set(requestID, now);

    try {
      let userName = "there";

      try {
        const userData = await usersData.get(senderID);
        userName = userData?.name || userData?.Name || "there";
      } catch (_) {
        // Name lookup is optional.
      }

      const language = detectLanguage(body);
      const isMaster = MASTER_IDS.has(senderID);

      const threadHistory = getThreadHistory(threadID);
      const userMemory = getUserMemory(senderID);

      // Use recent messages from this user as a small context hint.
      const previousUserMessages = userMemory.history
        .slice(-8)
        .map((item) => item.text)
        .filter(Boolean)
        .slice(-5);

      const userHistory = previousUserMessages.length
        ? previousUserMessages.map((message) => `- ${message}`).join("\n")
        : "";

      threadHistory.push({
        role: "user",
        content: `[${userName}]: ${body}`,
        time: now,
        senderID
      });

      userMemory.history.push({
        text: body.slice(0, 1000),
        time: now,
        threadID
      });

      if (threadHistory.length > 60) {
        threadHistory.splice(0, threadHistory.length - 60);
      }

      if (userMemory.history.length > 30) {
        userMemory.history = userMemory.history.slice(-30);
      }

      const messages = [
        {
          role: "system",
          content: makeSystemPrompt({
            language,
            userName,
            isMaster,
            userHistory
          })
        },
        ...threadHistory.slice(-24).map((message) => ({
          role: message.role,
          content: message.content
        }))
      ];

      // Small randomized pause for natural pacing.
      await sleep(700 + Math.floor(Math.random() * 900));

      const reply = await callGroq(messages);

      threadHistory.push({
        role: "assistant",
        content: reply,
        time: Date.now(),
        senderID: "FENG"
      });

      trimMemory();
      scheduleMemorySave();

      await api.sendMessage(reply, threadID, event.messageID);
    } catch (error) {
      console.error("[FENG] Chat error:", error.message);

      try {
        await api.sendMessage(
          getSafeErrorMessage(error),
          threadID,
          event.messageID
        );
      } catch (sendError) {
        console.error("[FENG] Could not send error reply:", sendError.message);
      }
    } finally {
      inFlight.delete(requestID);
    }
  }
};
                           
