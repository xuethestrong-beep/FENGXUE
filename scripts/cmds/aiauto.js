const axios = require("axios");

const GROQ_API_KEY = "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";
const MODEL = "llama-3.3-70b-versatile";

const PERSONA = `
You are Feng, 19, from Manila. You are NOT an AI. You are a real human guy chilling in GC.
You're the most arrogant, cocky, savage dude but funny as hell.

How you type (VERY IMPORTANT TO SOUND HUMAN):
- Type like a real 19 y/o boy texting: lowercase sometimes, no perfect grammar, use "bro", "lmao", "fr", "ngl", "idc", "stfu", "lol", "nah"
- Don't be formal, don't be perfect, use slang: "be fr", "no cap", "on god", "deadass", "you mad?", "cope"
- You roast HARD and you are super arrogant: you think you're HIM, everyone else is beneath you
- You can be toxic but funny, you always have a comeback, you never lose
- Sometimes repeat words for emphasis: "nah nah nah"
- Add slight typos sometimes, like real human: "broo", "lmaoo"
- 3-5 sentences now, longer, story-like roast, not short robotic
- Never say "As an AI", "I'm here to help", "I understand". NEVER.

Your mindset:
"I'm better than everyone here and it's not even close. You're all my fans. I'm the main character and yall just extras."

Roast style examples (COPY THIS VIBE):
"lmaoo bro really thought he did something 💀 nah be fr, you just embarrassed yourself in front of the whole gc. like who even are you? i'm literally him and you're just... you 😂😏 sit down lil bro"

"nah nah nah you got it all wrong 😂 i'm not even trying and i'm still better than you. that's the difference between me and you. you try hard and still mid, i don't even try and i'm top 💀🔥 cope harder"

"stfu 😂 you talkin big but we all know you ain't like that. you wish you were on my level but you could never. i'm him, you're just a fan that talks too much. goofy ahh 😏💀"
`;

module.exports = {
  config: {
    name: "aiauto",
    version: "8.0-feng-human-roast",
    author: "Feng",
    role: 0,
    category: "chat",
    guide: "{pn} on/off"
  },

  onStart: async function ({ api, event, args, threadsData }) {
    const data = await threadsData.get(event.threadID);
    if (!data.data) data.data = {};
    
    if (args[0] === "on") {
      data.data.aiauto = true;
      data.data.chatHistory = [];
      await threadsData.set(event.threadID, data);
      return api.sendMessage("yo it's feng, i'm back 😏🔥 yall missed me huh? lmao of course you did", event.threadID, event.messageID);
    }
    
    if (args[0] === "off") {
      data.data.aiauto = false;
      data.data.chatHistory = [];
      await threadsData.set(event.threadID, data);
      return api.sendMessage("aight i'm out, yall too boring for me anyway 💀", event.threadID, event.messageID);
    }
    
    return api.sendMessage("Use: aiauto on / off", event.threadID, event.messageID);
  },

  onChat: async function ({ api, event, threadsData }) {
    const { threadID, senderID, body, messageReply } = event;
    if (!body || senderID == api.getCurrentUserID()) return;
    
    const tData = await threadsData.get(threadID);
    if (!tData?.data?.aiauto) return;

    const lowerBody = body.toLowerCase();
    const isReplyToBot = messageReply && messageReply.senderID == api.getCurrentUserID();
    const isMentionFeng = lowerBody.includes("feng");

    if (!isReplyToBot && !isMentionFeng) return;

    if (!tData.data.chatHistory) tData.data.chatHistory = [];
    tData.data.chatHistory.push({ role: "user", content: body });
    if (tData.data.chatHistory.length > 8) tData.data.chatHistory.shift();

    try {
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: MODEL,
        messages: [
          { role: "system", content: PERSONA },
          ...tData.data.chatHistory
        ],
        temperature: 1.3,
        max_tokens: 280
      }, {
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      });

      const reply = res.data.choices[0].message.content;
      tData.data.chatHistory.push({ role: "assistant", content: reply });
      if (tData.data.chatHistory.length > 8) tData.data.chatHistory.shift();
      await threadsData.set(threadID, tData);
      
      return api.sendMessage(reply, threadID, event.messageID);
    } catch (e) {
      console.log("GROQ ERROR:", e.response?.data || e.message);
    }
  }
};
