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
  {q:"What is the Dunning-Kruger effect?", o:["A. Incompetent overestimate skill","B. Fear of success","C. Memory distortion"], a:"a"},
  {q:"Cognitive dissonance is?", o:["A. Forgetting trauma","B. Mental discomfort from conflicting beliefs","C. Hearing voices"], a:"b"},
  {q:"Stockholm syndrome means victim?", o:["A. Bonds with captor","B. Becomes violent","C. Forgets identity"], a:"a"},
  {q:"What is gaslighting in psychology?", o:["A. Making someone doubt their memory/reality","B. Shining light therapy","C. Anger management"], a:"a"},
  {q:"Maslow's highest need is?", o:["A. Safety","B. Self-actualization","C. Belonging"], a:"b"},
  {q:"Bystander effect says?", o:["A. More people = less likely to help","B. People help more in crowds","C. Crowds cause aggression"], a:"a"},
  {q:"What is the placebo effect?", o:["A. Fake treatment works because belief","B. Side effect of drugs","C. Memory loss"], a:"a"},
  {q:"Dark Triad personality consists of Narcissism, Machiavellianism and?", o:["A. Empathy","B. Psychopathy","C. Introversion"], a:"b"},
  {q:"Learned helplessness was discovered by?", o:["A. Pavlov","B. Seligman","C. Skinner"], a:"b"},
  {q:"What does 'pareidolia' mean?", o:["A. Seeing faces/patterns where none exist","B. Fear of crowds","C. Deja vu"], a:"a"},
  {q:"Sunk cost fallacy is?", o:["A. Continuing because of past investment","B. Fear of spending","C. Saving too much"], a:"a"},
  {q:"Which brain part controls fear response?", o:["A. Hippocampus","B. Amygdala","C. Cerebellum"], a:"b"},
  {q:"Imposter syndrome is feeling like?", o:["A. You are a fraud despite success","B. You are superior","C. You are invisible"], a:"a"},
  {q:"What is confirmation bias?", o:["A. Seeking info that confirms beliefs","B. Confirming others' bias","C. Memory bias"], a:"a"},
  {q:"Pavlov's dogs showed?", o:["A. Classical conditioning","B. Operant conditioning","C. Social learning"], a:"a"},
  {q:"What is the 'Baader-Meinhof' phenomenon?", o:["A. Noticing something everywhere after learning it","B. Forgetting names","C. Mind reading"], a:"a"},
  {q:"Schizophrenia's main positive symptom is?", o:["A. Hallucinations","B. Lack of emotion","C. Laziness"], a:"a"},
  {q:"What is Oedipus complex?", o:["A. Child's unconscious desire for opposite-sex parent","B. Fear of father","C. Love for mother only"], a:"a"},
  {q:"Stanford Prison Experiment showed?", o:["A. People conform to social roles quickly","B. Prisons are safe","C. Students are aggressive"], a:"a"},
  {q:"What is alexithymia?", o:["A. Difficulty identifying/describing emotions","B. Fear of emotions","C. Excessive emotion"], a:"a"},
  {q:"What is anosognosia?", o:["A. Unawareness of own mental illness","B. Fear of darkness","C. Lack of sleep"], a:"a"},
  {q:"Milgram experiment proved?", o:["A. People obey authority even harming others","B. People are disobedient","C. Learning by punishment"], a:"a"},
  {q:"What is narcissistic supply?", o:["A. Attention/validation narcissist needs","B. Money supply","C. Drug supply"], a:"a"},
  {q:"Dissociative Identity Disorder was formerly called?", o:["A. Multiple Personality Disorder","B. Bipolar","C. Schizophrenia"], a:"a"},
  {q:"What is the spotlight effect?", o:["A. Overestimating how much others notice you","B. Stage fright","C. Light sensitivity"], a:"a"},
  {q:"Fight, flight, freeze is controlled by?", o:["A. Sympathetic nervous system","B. Digestive system","C. Parasympathetic only"], a:"a"},
  {q:"What is a trauma bond?", o:["A. Strong attachment from abuse cycle","B. Bond after accident","C. Family trauma"], a:"a"},
  {q:"Which neurotransmitter is 'feel-good' chemical?", o:["A. Dopamine","B. Insulin","C. Melatonin"], a:"a"},
  {q:"What is projective test example?", o:["A. Rorschach inkblot","B. IQ test","C. Math test"], a:"a"},
  {q:"Borderline Personality Disorder fear is mainly?", o:["A. Abandonment","B. Spiders","C. Success"], a:"a"},
  {q:"What is deindividuation?", o:["A. Losing self-awareness in groups","B. Becoming individual","C. Depression"], a:"a"},
  {q:"Cortisol is known as?", o:["A. Stress hormone","B. Happy hormone","C. Sleep hormone"], a:"a"},
  {q:"What is gaslighting's opposite - love bombing?", o:["A. Overwhelming affection to control","B. Hating someone","C. Ignoring"], a:"a"},
  {q:"Sigmund Freud's 3 parts of mind?", o:["A. Id, Ego, Superego","B. Brain, Heart, Soul","C. Past, Present, Future"], a:"a"},
  {q:"What is the halo effect?", o:["A. One good trait makes all seem good","B. Angel syndrome","C. Light effect"], a:"a"},
  {q:"OCD's compulsion is?", o:["A. Repetitive act to reduce anxiety","B. Obsessive thought only","C. Fear"], a:"a"},
  {q:"What is emotional intelligence (EQ)?", o:["A. Ability to understand/manage emotions","B. High IQ","C. No emotions"], a:"a"},
  {q:"False memory syndrome is?", o:["A. Believing fake memory as real","B. Forgetting everything","C. No memory"], a:"a"},
  {q:"What is the fundamental attribution error?", o:["A. Blaming person not situation","B. Blaming situation","C. No attribution"], a:"a"},
  {q:"PTSD is mainly caused by?", o:["A. Traumatic event","B. Genetics only","C. Laziness"], a:"a"},
  {q:"What is mirroring in narcissism?", o:["A. Copying you to create bond","B. Looking in mirror","C. Reflection"], a:"a"},
  {q:"Which is a defense mechanism?", o:["A. Denial","B. Eating","C. Sleeping"], a:"a"},
  {q:"What does introvert recharge by?", o:["A. Being alone","B. Partying","C. Talking"], a:"a"},
  {q:"What is catastrophizing?", o:["A. Imagining worst possible outcome","B. Real disaster","C. Good outcome"], a:"a"},
  {q:"What is self-sabotage?", o:["A. Unconsciously undermining own success","B. Sabotaging others","C. Accident"], a:"a"},
  {q:"What is serotonin linked to?", o:["A. Mood, happiness, sleep","B. Hunger only","C. Pain"], a:"a"},
  {q:"What is the 'foot-in-the-door' technique?", o:["A. Small request then big request","B. Kicking door","C. Sales only"], a:"a"},
  {q:"What is derealization?", o:["A. Feeling world is unreal","B. Realizing truth","C. Dreaming"], a:"a"},
  {q:"What is Machiavellianism trait?", o:["A. Manipulative, deceitful, strategic","B. Honest and loyal","C. Shy"], a:"a"},
  {q:"What is resilience in psychology?", o:["A. Bouncing back from adversity","B. Being hard","C. No stress"], a:"a"},
];

global.quizGame = global.quizGame || new Map();
global.quizStats = global.quizStats || new Map(); // leaderboard

module.exports = {
  config: { 
    name:"quiz", 
    version:"8.0-leaderboard", 
    author:"FENG", 
    category:"game", 
    role:0,
    guide: "{pn} - start quiz | {pn} top - leaderboard | {pn} stats - your stats"
  },

  onStart: async function({ api, event, args, usersData }) {
    // TOP LEADERBOARD
    if (args[0] && ["top","leaderboard","lb","rank"].includes(args[0].toLowerCase())) {
      if (global.quizStats.size === 0) return api.sendMessage("📊 No quiz stats yet! Be first to solve.", event.threadID);
      const sorted = [...global.quizStats.entries()].sort((a,b)=>b[1].wins - a[1].wins).slice(0,10);
      let msg = "🏆 QUIZ LEADERBOARD - TOP 10 GENIUSES 🧠\n\n";
      for (let i=0;i<sorted.length;i++) {
        const [id, data] = sorted[i];
        const name = await usersData.getName(id).catch(()=> data.name || "Unknown");
        const medal = i==0?"🥇":i==1?"🥈":i==2?"🥉":`${i+1}.`;
        msg += `${medal} ${name} - ${data.wins} wins 💰 ${data.totalCoins} coins\n`;
      }
      return api.sendMessage(msg, event.threadID);
    }

    if (args[0] && ["stats","me","my"].includes(args[0].toLowerCase())) {
      const stats = global.quizStats.get(event.senderID);
      if (!stats) return api.sendMessage("You haven't won any quiz yet! Type !quiz to start", event.threadID);
      return api.sendMessage(`📊 YOUR QUIZ STATS\nName: ${await usersData.getName(event.senderID)}\nWins: ${stats.wins}\nTotal Coins: ${stats.totalCoins}\nStreak: ${stats.streak||0}`, event.threadID);
    }

    if (global.quizGame.has(event.threadID)) {
      const existing = global.quizGame.get(event.threadID);
      const name = await usersData.getName(existing.authorID);
      return api.sendMessage(`⚠️ Quiz active! Only ${name} can answer. Wait 30s`, event.threadID, event.messageID);
    }

    const item = HARD[Math.floor(Math.random()*HARD.length)];
    const timer = setTimeout(()=> { 
      if (!global.quizGame.has(event.threadID)) return;
      api.sendMessage(`⏰ FAILED - Answer: ${item.a.toUpperCase()} - ${item.o.find(o=>o.toLowerCase().startsWith(item.a))}\n\n❓ was: ${item.q}`, event.threadID);
      global.quizGame.delete(event.threadID);
    }, 30000);

    global.quizGame.set(event.threadID, { answer:item.a, timer, reward:150, authorID:event.senderID });
    const authorName = await usersData.getName(event.senderID);
    api.sendMessage(`🧠 HARD MODE - 150 coins [${HARD.length} Qs]\n👤 Player: ${authorName} (only you can answer)\n⏱️ 30s\n\n❓ ${item.q}\n\n${item.o.join("\n")}\n\nReply A/B/C`, event.threadID, event.messageID);
  },

  onChat: async function({ api, event, usersData }) {
    const game = global.quizGame.get(event.threadID);
    if (!game) return;
    const ans = event.body?.trim().toLowerCase();
    if (!["a","b","c"].includes(ans)) return;

    if (String(event.senderID) !== String(game.authorID)) {
      if (!global.quizGame._lastWarn || Date.now() - global.quizGame._lastWarn > 5000) {
        global.quizGame._lastWarn = Date.now();
        const authorName = await usersData.getName(game.authorID);
        api.sendMessage(`🚫 This quiz is for ${authorName} only! Use !quiz to start your own.`, event.threadID, event.messageID);
      }
      return;
    }

    if (ans === game.answer) {
      clearTimeout(game.timer);
      global.quizGame.delete(event.threadID);
      
      // MONEY + STATS
      try { 
        const u = await usersData.get(event.senderID); 
        await usersData.set(event.senderID, { money:(u.money||0)+game.reward }); 
      } catch {}

      // LEADERBOARD UPDATE
      const current = global.quizStats.get(event.senderID) || { wins:0, totalCoins:0, name: await usersData.getName(event.senderID), streak:0 };
      current.wins += 1;
      current.totalCoins += game.reward;
      current.streak = (current.streak||0)+1;
      current.name = await usersData.getName(event.senderID);
      global.quizStats.set(event.senderID, current);

      const name = await usersData.getName(event.senderID);
      api.sendMessage(`✅ GENIUS! ${name} solved it!\n+${game.reward} coins! 💰\n🏆 Wins: ${current.wins} | Streak: ${current.streak}`, event.threadID, event.messageID);
    } else {
      api.sendMessage(`❌ Wrong! Think harder ${await usersData.getName(event.senderID)}...`, event.threadID, event.messageID);
    }
  }
};
