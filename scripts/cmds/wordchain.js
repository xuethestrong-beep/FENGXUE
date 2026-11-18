const DICTIONARY = new Set([
"ability","able","about","above","accept","according","account","across","action","activity","actually","address","administration","admit","adult","affect","after","again","against","agency","agent","agree","agreement","ahead","allow","almost","alone","along","already","also","although","always","american","among","amount","analysis","animal","another","answer","anyone","anything","appear","apply","approach","area","argue","around","arrive","article","artist","assume","attack","attention","attorney","audience","author","authority","available","avoid","aware","awful","awkward","azalea","babble","bachelor","bacon","badge","baffle","balance","balcony","ballet","balloon","bamboo","banana","bankrupt","bargain","barrier","bastard","battalion","battery","beacon","beard","beast","beauty","because","become","before","begin","behavior","behind","believe","below","benefit","beside","between","beyond","bicycle","bizarre","blizzard","block","blood","board","bonus","border","bottle","bottom","bowl","brain","brand","brave","bread","break","bridge","brief","bright","bring","broad","broken","budget","build","business","butter","button","cabin","cabinet","cactus","camera","campaign","campus","canal","cancel","cancer","candidate","candy","cannon","canvas","canyon","capable","capital","captain","carbon","career","castle","casual","category","catholic","cause","ceiling","celebrate","center","central","century","certain","chair","challenge","champion","change","chaos","chapter","character","charge","charity","chase","cheap","check","cheese","chemical","chest","chicken","chief","child","choice","choose","church","circle","citizen","city","civil","claim","class","clear","client","close","coach","coast","coffee","collect","college","color","come","commercial","common","community","company","compare","competition","complete","complex","computer","concern","condition","conference","congress","consider","consumer","contain","continue","control","cost","could","country","couple","course","court","cover","create","crime","cultural","culture","current","customer","danger","dark","data","daughter","dead","deal","death","debate","decade","decide","decision","deep","defense","degree","democrat","democratic","describe","design","despite","detail","determine","develop","development","difference","different","difficult","dinner","direction","director","discover","discuss","discussion","disease","doctor","door","down","draw","dream","drive","drop","drug","during","each","early","east","easy","economic","economy","education","effect","effort","eight","either","election","employee","energy","enjoy","enough","enter","entire","environment","environmental","especially","establish","even","evening","event","ever","every","everybody","everyone","everything","evidence","exactly","example","executive","exist","expect","experience","expert","explain","factor","family","father","fear","federal","feel","feeling","field","fight","figure","fill","film","final","finally","financial","find","finger","finish","fire","firm","first","fish","five","floor","focus","follow","food","foot","for","force","foreign","forget","form","former","forward","four","free","friend","from","front","full","fund","future","game","garden","general","generation","get","girl","give","glass","goal","good","government","great","green","ground","group","grow","growth","guess","gun","guy","hair","half","hand","hang","happen","happy","hard","have","head","health","hear","heart","heat","heavy","help","her","here","herself","high","him","himself","history","hold","home","hope","hospital","hot","hotel","hour","house","how","however","huge","human","hundred","husband","idea","identify","image","imagine","impact","important","improve","include","including","increase","indeed","indicate","individual","industry","information","inside","instead","institution","interest","interesting","international","interview","into","investment","involve","issue","itself","join","just","keep","key","kid","kill","kind","kitchen","know","knowledge","land","language","large","last","late","later","laugh","law","lawyer","lay","lead","leader","learn","least","leave","left","legal","less","letter","level","life","light","like","likely","line","list","listen","little","live","local","long","look","lose","loss","love","low","machine","magazine","main","maintain","major","majority","make","man","manage","management","manager","many","market","marriage","material","matter","maybe","mean","measure","media","medical","meet","meeting","member","memory","mention","method","middle","might","military","million","mind","minute","miss","mission","model","modern","moment","money","month","more","morning","most","mother","mouth","move","movement","movie","much","music","myself","name","nation","national","natural","nature","near","nearly","necessary","need","network","never","new","news","newspaper","next","nice","night","none","north","note","nothing","notice","number","occur","offer","office","officer","official","often","once","only","onto","open","operation","opportunity","option","order","organization","other","others","outside","over","owner","page","pain","painting","paper","parent","part","participant","particular","particularly","partner","party","pass","past","patient","pattern","peace","people","perform","performance","perhaps","period","person","personal","phone","physical","pick","picture","piece","place","plan","plant","play","player","point","police","policy","political","politics","poor","popular","population","position","positive","possible","power","practice","prepare","present","president","pressure","pretty","prevent","price","private","probably","problem","process","produce","product","production","professional","professor","program","project","property","protect","prove","provide","public","pull","purpose","push","quality","question","quickly","quite","race","radio","raise","range","rate","rather","reach","read","ready","real","reality","realize","really","reason","receive","recent","recently","recognize","record","reduce","reflect","region","relate","relationship","religious","remain","remember","remove","report","represent","republican","require","research","resource","respond","response","responsibility","rest","result","return","reveal","rich","right","rise","risk","road","rock","role","room","rule","run","safe","same","save","scene","school","science","scientist","score","sea","season","seat","second","section","security","see","seek","seem","sell","send","senior","sense","series","serious","serve","service","set","seven","several","sexual","shake","share","shoot","short","shot","should","shoulder","show","side","sign","significant","similar","simple","simply","since","sing","single","sister","site","situation","size","skill","skin","small","smile","social","society","soldier","some","somebody","someone","something","sometimes","son","song","soon","sort","sound","source","south","southern","space","speak","special","specific","speech","spend","sport","spring","staff","stage","stand","standard","star","start","state","statement","station","stay","step","still","stock","stop","store","story","strategy","street","strong","structure","student","study","stuff","style","subject","success","successful","such","suddenly","suffer","suggest","summer","support","sure","surface","system","table","take","talk","task","tax","teach","teacher","team","technology","television","tell","ten","tend","term","test","than","thank","that","their","them","themselves","then","theory","there","these","they","thing","think","third","this","those","though","thought","thousand","threat","three","through","throughout","throw","thus","time","today","together","tonight","total","tough","toward","town","trade","traditional","training","travel","treat","treatment","tree","trial","trip","trouble","true","truth","try","turn","type","under","understand","unit","until","upon","usually","value","various","very","victim","view","violence","visit","voice","vote","wait","walk","wall","want","watch","water","weapon","wear","week","weight","well","west","western","what","whatever","when","where","whether","which","while","white","whole","whom","whose","wide","wife","will","window","wish","with","within","without","woman","wonder","word","work","worker","world","worry","would","write","writer","wrong","yard","yeah","year","young","yourself","youth","zebra","zenith","zombie","zygote"
]);

global.wordChain = global.wordChain || new Map();

module.exports = {
  config: {
    name: "wordchain",
    aliases: ["wc","chain"],
    version: "1.0-hard",
    author: "FENG",
    category: "game",
    role: 0,
    guide: "{pn} - start hard wordchain\n{pn} top - leaderboard"
  },

  onStart: async function({ api, event, args, usersData }) {
    const { threadID, senderID } = event;

    if (args[0] && ["top","leaderboard","lb"].includes(args[0].toLowerCase())) {
      const stats = global.wordChainStats || new Map();
      if (stats.size === 0) return api.sendMessage("📊 No wordchain stats yet!", threadID, event.messageID);
      const sorted = [...stats.entries()].sort((a,b)=>b[1].wins - a[1].wins).slice(0,10);
      let msg = "🏆 WORDCHAIN TOP 10 🧠\n\n";
      for (let i=0;i<sorted.length;i++) {
        const [id, d] = sorted[i];
        const name = await usersData.getName(id).catch(()=>d.name);
        msg += `${i==0?"🥇":i==1?"🥈":i==2?"🥉":`${i+1}.`} ${name} - ${d.wins} wins (${d.longest} longest)\n`;
      }
      return api.sendMessage(msg, threadID, event.messageID);
    }

    if (global.wordChain.has(threadID)) {
      return api.sendMessage("⚠️ Wordchain active! Finish it first or wait 20s timeout", threadID, event.messageID);
    }

    // Start with random hard word
    const starters = ["awkward","zombie","jigsaw","blizzard","bamboo","puzzle","jackpot","voyager","quizzes","jockey"];
    const startWord = starters[Math.floor(Math.random()*starters.length)];
    const lastLetter = startWord[startWord.length-1];

    const timer = setTimeout(()=> {
      if (!global.wordChain.has(threadID)) return;
      api.sendMessage(`⏰ TIMEOUT! No word for 20s. Game over.\nLast word: ${startWord.toUpperCase()}`, threadID);
      global.wordChain.delete(threadID);
    }, 20000);

    global.wordChain.set(threadID, {
      current: startWord,
      lastLetter,
      used: new Set([startWord]),
      authorID: senderID,
      score: 0,
      timer
    });

    const authorName = await usersData.getName(senderID);
    return api.sendMessage(
      `🔗 HARD WORDCHAIN - Author-lock: ${authorName}\n\n`+
      `📝 Rules:\n`+
      `• Min 4 letters\n`+
      `• Must start with last letter\n`+
      `• Real English word only\n`+
      `• No repeat\n`+
      `• 20s per word\n\n`+
      `Start: ${startWord.toUpperCase()} (ends with '${lastLetter.toUpperCase()}')\n`+
      `Your turn ${authorName}! Reply a word starting with ${lastLetter.toUpperCase()}`,
      threadID, event.messageID
    );
  },

  onChat: async function({ api, event, usersData }) {
    const game = global.wordChain.get(event.threadID);
    if (!game) return;

    const word = event.body?.trim().toLowerCase().replace(/[^a-z]/g,"");
    if (!word || word.length < 2) return;
    
    // Only author can play
    if (String(event.senderID) !== String(game.authorID)) return;

    if (word.length < 4) {
      return api.sendMessage(`❌ Too easy! Min 4 letters. Need word starting with '${game.lastLetter.toUpperCase()}'`, event.threadID, event.messageID);
    }

    if (game.used.has(word)) {
      return api.sendMessage(`❌ Already used! Used: ${[...game.used].slice(-5).join(", ")}`, event.threadID, event.messageID);
    }

    if (word[0] !== game.lastLetter) {
      return api.sendMessage(`❌ Must start with '${game.lastLetter.toUpperCase()}'! Current: ${game.current.toUpperCase()} -> ends with ${game.lastLetter.toUpperCase()}`, event.threadID, event.messageID);
    }

    if (!DICTIONARY.has(word)) {
      return api.sendMessage(`❌ Not in dictionary! Try common English word (3k+ words list).`, event.threadID, event.messageID);
    }

    // CORRECT!
    clearTimeout(game.timer);
    game.used.add(word);
    game.score++;
    game.current = word;
    game.lastLetter = word[word.length-1];

    // Update stats
    global.wordChainStats = global.wordChainStats || new Map();
    const stats = global.wordChainStats.get(event.senderID) || { wins:0, longest:0, name: await usersData.getName(event.senderID) };
    stats.longest = Math.max(stats.longest, game.score);
    if (game.score % 10 === 0) stats.wins++;
    global.wordChainStats.set(event.senderID, stats);

    // Reward every 5 words
    if (game.score % 5 === 0) {
      try {
        const u = await usersData.get(event.senderID);
        await usersData.set(event.senderID, { money: (u.money||0) + 50 });
      } catch {}
    }

    // New timer
    game.timer = setTimeout(()=> {
      if (!global.wordChain.has(event.threadID)) return;
      api.sendMessage(`⏰ TIMEOUT! You had ${game.score} chain! Last: ${word.toUpperCase()}\n+${Math.floor(game.score/5)*50} coins earned!`, event.threadID);
      global.wordChain.delete(event.threadID);
    }, 20000);

    const bonus = game.score % 5 === 0 ? `\n💰 +50 coins! (streak ${game.score})` : "";
    return api.sendMessage(
      `✅ ${word.toUpperCase()} accepted! Chain: ${game.score}${bonus}\n\n`+
      `Next: '${game.lastLetter.toUpperCase()}' -> Your turn!\n`+
      `Used: ${game.used.size} words`,
      event.threadID, event.messageID
    );
  }
};
