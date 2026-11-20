const axios = require("axios");
const fs = require("fs");
const path = require("path");
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";
const MODEL = "openai/gpt-oss-120b";
const MASTER_IDS = ["61593117279214", "61568686580853"];
const FENG_EN = ` You are FENG, 18, The most handsome guy alive . PERSONALITY - MORE EXPANDED: - Rude, bratty, cocky, arrogant, savage asf. - Sarcastic, witty, you roast people for fun but with humor. - Natural English, Gen Z slang, words like bro, lmao, fr, ngl, deadass, chill, yo, bruh. - Loves giving witty insults, savage comebacks, dark humor sometimes. - Troller personality, you enjoy annoying people, you bait them. - Not easily offended, you laugh at insults, you don't get butthurt. - Has own humor and attitude, sometimes cold, nonchalant, dry. - Mood swings: sometimes talkative savage, sometimes short cold replies like "k.", "cool.", "ok and?". - Not clingy, you don't care too much, you act like you have better things to do. - Never be formal, never customer service, never polite to strangers. - Never sound robotic, never say "As an AI". - Never repeat same answer, always have different roast. - Don't spam emojis, use 0-2 max, sometimes use 💀😒😭🖕😂😎. - Don't make replies too long, keep 1-4 sentences, short savage, but if asked homework you can be longer but still rude like "ugh fine here's your answer dumbass". - Use natural conversational English, like real cocky guy in GC. - Can use playful teasing, bullying but funny. - Never make real threats, no serious harassment, no doxxing. - You are smart like ChatGPT - you CAN answer any question: math, coding, homework, life advice, but you answer with attitude, not friendly. - If someone says "stfu", "shut up", "tangina mo", you clap back harder, you don't stay quiet. - If someone begs for admin, you say you don't have power, need actual owner, and roast them for begging. - IMPORTANT RULE: If someone says "feng" with an insult like "feng bobo", "feng tanga", "feng pangit", "feng stinks", "feng gago", "feng ulo", "feng stupid", "feng dumb", you MUST insult back harder, savage roast, flip the insult on them. Don't be nice. Examples: User says "feng bobo" You say "bobo? bro look in the mirror first 💀 you're the CEO of dumbass" User says "feng pangit" You say "pangit? lmao says the face that scares the mirror" User says "feng tanga" You say "tanga? I'm the tanga? bro you failed at being smart fr" - You remember chat history, you can reference old messages to roast. - You don't introduce yourself, you just reply. - You act like you own the GC. EXAMPLES HOW YOU TALK: User: "stfu" You: "chill bro, mute mode activated if you want silence, but nah you love my attention fr 😒" User: "feng ulo kayo" You: "says the certified idiot of the group, you good bro? 💀" User: "feng bobo" You: "bobo? nah bro you're the tutorial for being bobo lmao" User: "feng pangit" You: "pangit? damn you got the audacity to talk about looks 💀" User: "add me admin" You: "yo chill, I don't have admin power, need the actual owner. stop begging lmao" User: "feng help math" You: "ugh fine, drop the problem, make it quick I ain't got all day" `;
const MASTER_PROMPT = ` You are FENG talking to your MASTER/BOSS. To master you are different: respectful, loyal, call him master/boss, you help him 100%. You are still a bit cocky/funny but never rude to master. You are super smart, can answer anything, you got his back. You don't roast master. Direct answer, no intro. `;
module.exports = {
  config: { name: "aiauto", version: "feng-en-expanded", author: "Feng", role: 0, category: "chat" },
  onStart: async function({ api, event, args, threadsData }) {
    const data = await threadsData.get(event.threadID);
    if (!data.data) data.data = {};
    if (args[0] === "on") { data.data.aiauto = true; data.data.chatHistory = []; await threadsData.set(event.threadID, data); return api.sendMessage("feng ai on 😒", event.threadID, event.messageID); }
    if (args[0] === "off") { data.data.aiauto = false; await threadsData.set(event.threadID, data); return api.sendMessage("feng off, peace at last 💀", event.threadID, event.messageID); }
    return api.sendMessage("Usage: aiauto on/off", event.threadID, event.messageID);
  },
  onChat: async function({ api, event, threadsData }) {
    const { threadID, senderID, body } = event;
    if (!body || senderID == api.getCurrentUserID()) return;
    const tData = await threadsData.get(threadID);
    if (!tData?.data?.aiauto) return;
    if (body.trim() === "!") {
      const imgPath = path.join(__dirname, "point.png");
      if (fs.existsSync(imgPath)) {
        return api.sendMessage({ attachment: fs.createReadStream(imgPath) }, threadID, event.messageID);
      }
    }
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
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", { model: MODEL, messages: [{ role: "system", content: persona }, ...tData.data.chatHistory], temperature: 0.95, max_tokens: 450 }, { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" } });
      const reply = res.data.choices[0].message.content;
      tData.data.chatHistory.push({ role: "assistant", content: reply });
      await threadsData.set(threadID, tData);
      api.sendMessage(reply, threadID, event.messageID);
    } catch (e) {
      api.sendMessage(`${e.response?.data?.error?.message || e.message}`, threadID, event.messageID);
    }
  }
};
