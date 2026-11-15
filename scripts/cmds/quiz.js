const HARD = [
 {q:"I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?", o:["A. Echo","B. Shadow","C. Ghost"], a:"a"},
 {q:"What gets wetter the more it dries?", o:["A. Water","B. Towel","C. Sponge"], a:"b"},
 {q:"If you have 3 apples and take 2, how many do you have?", o:["A. 1","B. 2","C. 3"], a:"b"},
 {q:"A man dies of old age on his 25th birthday. How?", o:["A. Feb 29 born","B. Time travel","C. Lie"], a:"a"},
 {q:"Which number comes next: 2,3,5,9,17,?", o:["A. 33","B. 30","C. 34"], a:"a"},
 {q:"If all Bloops are Razzies and some Razzies are Loppies, are some Bloops Loppies?", o:["A. Yes","B. No","C. Uncertain"], a:"c"},
 {q:"Light year is a unit of?", o:["A. Time","B. Distance","C. Light"], a:"b"},
 {q:"What element has symbol Au?", o:["A. Silver","B. Gold","C. Aluminum"], a:"b"},
 {q:"What is 0 divided by 0?", o:["A. 0","B. 1","C. Undefined"], a:"c"},
 {q:"Which is faster than light?", o:["A. Nothing","B. Tachyon (theory)","C. Sound"], a:"a"},
 {q:"Solve: 8 ÷ 2(2+2) = ?", o:["A. 1","B. 16","C. 8"], a:"b"},
 {q:"A clock shows 3:15, what's angle between hands?", o:["A. 0°","B. 7.5°","C. 15°"], a:"b"},
 {q:"If a plane crashes on border of US and Canada, where bury survivors?", o:["A. US","B. Canada","C. Don't bury survivors"], a:"c"},
 {q:"What has keys but no locks?", o:["A. Piano","B. Door","C. Map"], a:"a"},
 {q:"The more you take, the more you leave behind. What?", o:["A. Money","B. Footsteps","C. Memory"], a:"b"},
 {q:"Which planet rotates on its side?", o:["A. Venus","B. Uranus","C. Saturn"], a:"b"},
 {q:"E = mc², c is?", o:["A. Speed of light","B. Speed of sound","C. Constant"], a:"a"},
 {q:"What is absolute zero in Celsius?", o:["A. -273.15°C","B. 0°C","C. -100°C"], a:"a"},
 {q:"If you flip a fair coin 3 times, chance of 3 heads?", o:["A. 1/8","B. 1/3","C. 1/2"], a:"a"},
 {q:"I have cities but no houses, mountains but no trees, water but no fish. What am I?", o:["A. Map","B. Dream","C. Earth"], a:"a"},
];

global.quizGame = global.quizGame || new Map();

module.exports = {
 config: { name:"quiz", version:"5.0-hard-en", author:"FENG", category:"game", role:0 },
 onStart: async function({ api, event, usersData }) {
  if (global.quizGame.has(event.threadID)) return api.sendMessage("Finish current quiz first! 25s left", event.threadID);
  const item = HARD[Math.floor(Math.random()*HARD.length)];
  
  const timer = setTimeout(()=> {
   api.sendMessage(`⏰ HARD QUIZ FAILED\nAnswer: ${item.a.toUpperCase()} - ${item.o.find(o=>o.startsWith(item.a.toUpperCase()))}`, event.threadID);
   global.quizGame.delete(event.threadID);
  }, 30000);

  global.quizGame.set(event.threadID, { answer:item.a, timer, reward:150 });
  
  api.sendMessage(`🧠 HARD MODE - 150 coins\n⏱️ 30 seconds\n\n❓ ${item.q}\n\n${item.o.join("\n")}\n\nReply A/B/C`, event.threadID);
 },
 onChat: async function({ api, event, usersData }) {
  const game = global.quizGame.get(event.threadID);
  if (!game) return;
  const ans = event.body.trim().toLowerCase();
  if (!["a","b","c"].includes(ans)) return;
  if (ans === game.answer) {
   clearTimeout(game.timer);
   global.quizGame.delete(event.threadID);
   try {
    const u = await usersData.get(event.senderID);
    await usersData.set(event.senderID, { money:(u.money||0)+game.reward });
   } catch {}
   const name = await usersData.getName(event.senderID);
   api.sendMessage(`✅ GENIUS! ${name} solved it!\n+${game.reward} coins! 💰`, event.threadID);
  } else {
   api.sendMessage(`❌ Wrong! Think harder...`, event.threadID);
  }
 }
};
