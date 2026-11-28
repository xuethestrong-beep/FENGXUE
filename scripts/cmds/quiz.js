
const fs = require("fs");
const path = require("path");
const axios = require("axios");

global.quizGame = global.quizGame || new Map();
global.quizStats = global.quizStats || new Map();

const GROQ_KEYS_FILE = path.join(process.cwd(), "qroq_keys.txt");
const HISTORY_FILE = path.join(process.cwd(), "quiz_history.json");
const GROQ_MODEL = "openai/gpt-oss-120b";
const QUIZ_REWARD = 150;
const QUIZ_TIME = 30000;

// -------------------- GROQ API KEYS --------------------

function getGroqKeys() {
  if (!fs.existsSync(GROQ_KEYS_FILE)) return [];

  const content = fs.readFileSync(GROQ_KEYS_FILE, "utf8").trim();
  if (!content) return [];

  // Supports one key per line, KEY=value, or a JSON array.
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter(Boolean);
    }
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed).map(String).filter(Boolean);
    }
  } catch {}

  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
    .map(line => line.replace(/^[A-Z0-9_]+\s*=\s*/, ""))
    .map(line => line.replace(/^["']|["']$/g, ""))
    .filter(key => key.startsWith("gsk_"));
}

// -------------------- SAVED QUESTION HISTORY --------------------

function loadQuizHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      fs.writeFileSync(HISTORY_FILE, "{}", "utf8");
    }

    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch (error) {
    console.error("[QUIZ] History read error:", error.message);
    return {};
  }
}

global.quizHistory = global.quizHistory || loadQuizHistory();

function saveQuizHistory() {
  try {
    fs.writeFileSync(
      HISTORY_FILE,
      JSON.stringify(global.quizHistory, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("[QUIZ] History save error:", error.message);
  }
}

function normalizeQuestion(question) {
  return String(question || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getThreadHistory(threadID) {
  const id = String(threadID);

  if (!global.quizHistory[id]) {
    global.quizHistory[id] = {
      seen: [],
      hardUsed: []
    };
  }

  const history = global.quizHistory[id];

  if (!Array.isArray(history.seen)) history.seen = [];
  if (!Array.isArray(history.hardUsed)) history.hardUsed = [];

  return history;
}

// -------------------- AI QUESTION GENERATOR --------------------

function extractJSON(content) {
  let cleaned = String(content || "").trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");

  if (first === -1 || last === -1) {
    throw new Error("AI did not return valid JSON");
  }

  return JSON.parse(cleaned.slice(first, last + 1));
}

function validateQuestion(data) {
  if (!data || typeof data !== "object") return false;
  if (typeof data.q !== "string" || data.q.trim().length < 8) return false;
  if (!Array.isArray(data.o) || data.o.length !== 3) return false;

  if (!data.o.every(option => typeof option === "string" && option.trim())) {
    return false;
  }

  const answer = String(data.a || "").toLowerCase().trim();

  if (!["a", "b", "c"].includes(answer)) return false;

  return true;
}

async function generateAIQuestion(threadID, difficulty = "hard") {
  const keys = getGroqKeys();

  if (!keys.length) {
    throw new Error("No valid Groq API keys found in qroq_keys.txt");
  }

  const history = getThreadHistory(threadID);
  const recentQuestions = history.seen.slice(-100);

  const prompt = `
Create ONE original multiple-choice quiz question.

Difficulty: ${difficulty.toUpperCase()}

Use a random category such as:
science, history, geography, mathematics, logic, technology,
psychology, literature, space, nature, or general knowledge.

Rules:
- Create a new question, not a copied common quiz question.
- Avoid questions in the excluded list.
- Exactly 3 answer choices.
- Only ONE correct answer.
- Make sure the correct answer is factually accurate.
- Avoid ambiguous wording.
- Do not include explanations.
- Return JSON only.

Excluded previously used questions:
${JSON.stringify(recentQuestions)}

Required JSON format:
{
  "q": "Question here?",
  "o": [
    "A. First choice",
    "B. Second choice",
    "C. Third choice"
  ],
  "a": "a"
}

The answer must be lowercase a, b, or c.
`;

  let lastError;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content: "You are a careful quiz creator. Return valid JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 1,
          max_tokens: 400
        },
        {
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          timeout: 25000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      const question = extractJSON(content);

      if (!validateQuestion(question)) {
        throw new Error("AI generated an invalid question");
      }

      const normalized = normalizeQuestion(question.q);

      if (history.seen.includes(normalized)) {
        throw new Error("AI generated a repeated question");
      }

      return {
        q: question.q.trim(),
        o: question.o.map(option => option.trim()),
        a: String(question.a).toLowerCase().trim(),
        source: "AI",
        normalized
      };
    } catch (error) {
      lastError = error;
      console.error(
        `[QUIZ] Groq key ${i + 1} failed:`,
        error.response?.data?.error?.message || error.message
      );
    }
  }

  throw lastError || new Error("All Groq keys failed");
}

// -------------------- FALLBACK QUESTION BANK --------------------

function getFallbackQuestion(threadID) {
  const history = getThreadHistory(threadID);

  let available = HARD
    .map((question, index) => ({ question, index }))
    .filter(item => !history.hardUsed.includes(item.index));

  // Only restart the fallback cycle after every HARD question was used.
  if (available.length === 0) {
    history.hardUsed = [];
    available = HARD.map((question, index) => ({
      question,
      index
    }));
  }

  const selected = available[
    Math.floor(Math.random() * available.length)
  ];

  history.hardUsed.push(selected.index);

  const normalized = normalizeQuestion(selected.question.q);

  return {
    ...selected.question,
    source: "HARD BANK",
    normalized
  };
}

// -------------------- GET A NEW QUESTION --------------------

async function getNewQuestion(threadID, difficulty) {
  const history = getThreadHistory(threadID);

  // Try several times to avoid duplicate AI questions.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const question = await generateAIQuestion(threadID, difficulty);

      if (history.seen.includes(question.normalized)) {
        continue;
      }

      history.seen.push(question.normalized);
      saveQuizHistory();

      return question;
    } catch (error) {
      console.error(`[QUIZ] AI attempt ${attempt + 1}:`, error.message);
    }
  }

  // If AI fails, use an unused question from HARD.
  const fallback = getFallbackQuestion(threadID);

  history.seen.push(fallback.normalized);
  saveQuizHistory();

  return fallback;
}

// -------------------- COMMAND --------------------

module.exports = {
  config: {
    name: "quiz",
    version: "10.0-AI",
    author: "FENG",
    category: "game",
    role: 0
  },

  onStart: async function({ api, event, args, usersData }) {
    const threadID = String(event.threadID);

    // Leaderboard
    if (args[0] && ["top", "leaderboard", "lb", "rank"].includes(args[0].toLowerCase())) {
      if (global.quizStats.size === 0) {
        return api.sendMessage("📊 No quiz stats yet!", event.threadID, event.messageID);
      }

      const sorted = [...global.quizStats.entries()]
        .sort((a, b) => b[1].wins - a[1].wins)
        .slice(0, 10);

      let message = "🏆 FENG QUIZ LEADERBOARD 🧠\n\n";

      for (let i = 0; i < sorted.length; i++) {
        const [id, data] = sorted[i];
        let name = data.name || id;

        try {
          name = await usersData.getName(id);
        } catch {}

        const rank = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
        message += `${rank} ${name} — ${data.wins} wins\n`;
      }

      return api.sendMessage(message, event.threadID, event.messageID);
    }

    // Stats
    if (args[0] && args[0].toLowerCase() === "stats") {
      const stats = global.quizStats.get(event.senderID);

      if (!stats) {
        return api.sendMessage("📊 You haven't won a quiz yet!", event.threadID, event.messageID);
      }

      return api.sendMessage(
        `📊 YOUR QUIZ STATS\n\n🏆 Wins: ${stats.wins}\n💰 Coins earned: ${stats.totalCoins}`,
        event.threadID,
        event.messageID
      );
    }

    // Cancel
    if (args[0] && args[0].toLowerCase() === "cancel") {
      const active = global.quizGame.get(threadID);

      if (!active) {
        return api.sendMessage("There is no active quiz.", event.threadID, event.messageID);
      }

      if (String(active.authorID) !== String(event.senderID)) {
        return api.sendMessage("Only the quiz starter can cancel this game.", event.threadID, event.messageID);
      }

      clearTimeout(active.timer);
      global.quizGame.delete(threadID);

      return api.sendMessage("❎ Quiz cancelled.", event.threadID, event.messageID);
    }

    if (global.quizGame.has(threadID)) {
      const existing = global.quizGame.get(threadID);
      const name = await usersData.getName(existing.authorID).catch(() => "someone");

      return api.sendMessage(
        `⚠️ ${existing.generating ? "A question is being generated" : `Active quiz for ${name}`}! Please wait.`,
        event.threadID,
        event.messageID
      );
    }

    const difficultyInput = (args[0] || "hard").toLowerCase();
    const allowedDifficulties = ["easy", "medium", "hard", "extreme"];
    const difficulty = allowedDifficulties.includes(difficultyInput)
      ? difficultyInput
      : "hard";

    // Lock this group while the AI generates a question.
    const pendingGame = {
      generating: true,
      authorID: event.senderID
    };

    global.quizGame.set(threadID, pendingGame);

    try {
      const item = await getNewQuestion(threadID, difficulty);

      // Make sure this pending game is still the current one.
      if (global.quizGame.get(threadID) !== pendingGame) return;

      const timer = setTimeout(() => {
        const current = global.quizGame.get(threadID);
        if (!current || current.item !== item) return;

        api.sendMessage(
          `⏰ TIME'S UP!\n\n✅ Correct answer: ${item.a.toUpperCase()}\n❓ ${item.q}`,
          event.threadID
        );

        global.quizGame.delete(threadID);
      }, QUIZ_TIME);

      global.quizGame.set(threadID, {
        answer: item.a,
        item,
        timer,
        reward: QUIZ_REWARD,
        authorID: event.senderID
      });

      return api.sendMessage(
        `🧠 FENG AI QUIZ — ${difficulty.toUpperCase()}\n` +
        `💰 Reward: ${QUIZ_REWARD} coins\n` +
        `👤 Only you can answer!\n` +
        `⏱️ 30 seconds\n` +
        `✨ Source: ${item.source}\n\n` +
        `❓ ${item.q}\n\n` +
        `${item.o.join("\n")}\n\n` +
        `Reply A, B, or C.`,
        event.threadID,
        event.messageID
      );
    } catch (error) {
      if (global.quizGame.get(threadID) === pendingGame) {
        global.quizGame.delete(threadID);
      }

      console.error("[QUIZ] Start error:", error);

      return api.sendMessage(
        "❌ Couldn't create a quiz question. Check qroq_keys.txt and your Groq API keys.",
        event.threadID,
        event.messageID
      );
    }
  },

  // -------------------- ANSWER HANDLER --------------------

  onChat: async function({ api, event, usersData }) {
    const threadID = String(event.threadID);
    const game = global.quizGame.get(threadID);

    if (!game || game.generating) return;
    if (String(event.senderID) !== String(game.authorID)) return;

    const answer = String(event.body || "")
      .trim()
      .toLowerCase()
      .replace(/^[!.,\s]+/, "");

    if (!["a", "b", "c"].includes(answer)) return;

    if (answer === game.answer) {
      clearTimeout(game.timer);
      global.quizGame.delete(threadID);

      try {
        const user = await usersData.get(event.senderID);
        const currentMoney = Number(user.money || 0);

        await usersData.set(event.senderID, {
          ...user,
          money: currentMoney + game.reward
        });
      } catch (error) {
        console.error("[QUIZ] Reward error:", error);
        return api.sendMessage(
          "✅ Correct answer! But I couldn't add your coins. Please contact an admin.",
          event.threadID,
          event.messageID
        );
      }

      const stats = global.quizStats.get(event.senderID) || {
        wins: 0,
        totalCoins: 0,
        name: await usersData.getName(event.senderID).catch(() => "Player")
      };

      stats.wins++;
      stats.totalCoins += game.reward;
      global.quizStats.set(event.senderID, stats);

      return api.sendMessage(
        `✅ CORRECT!\n\n🎉 You earned ${game.reward} coins!\n🏆 Total wins: ${stats.wins}`,
        event.threadID,
        event.messageID
      );
    }

    return api.sendMessage(
      "❌ Wrong answer! You still have time. Try again!",
      event.threadID,
      event.messageID
    );
  }
};
  
