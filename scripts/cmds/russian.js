module.exports = {
  config:{ 
    name:"russian", 
    aliases:["rusian","roulette","rr","russianroulette"],
    version:"2.0-no-limit", 
    author:"FENG", 
    category:"game", 
    role:0, 
    guide:"{pn} [bet]"
  },
  onStart: async function({ api, event, args, usersData }) {
    const bet = parseInt(args[0])||0;
    const { senderID, threadID } = event;
    const data = await usersData.get(senderID);
    if(bet>0 && (data.money||0)<bet) return api.sendMessage(`❌ Need ${bet} coins, you have ${data.money||0}`, threadID, event.messageID);

    global.russianCooldown = global.russianCooldown || new Map();
    const last = global.russianCooldown.get(senderID) || 0;
    if(Date.now()-last < 3000) return api.sendMessage(`⏳ Wait ${Math.ceil((3000-(Date.now()-last))/1000)}s`, threadID, event.messageID);
    global.russianCooldown.set(senderID, Date.now());

    // 3 BULLETS OUT OF 6 = 50% death - no more puro safe
    const chambers = [0,0,0,1,1,1];
    const pull = Math.floor(Math.random()*6);
    const isBullet = chambers[pull]===1;

    if(isBullet){
      if(bet>0) await usersData.set(senderID,{ money:(data.money||0)-bet });
      return api.sendMessage(`💥 BANG! 💀 DIED!\n🔫 Chamber ${pull+1}/6 had BULLET!\n${bet>0?`💸 Lost ${bet} coins!\nBalance: ${(data.money||0)-bet}`:"You died!"}`, threadID, event.messageID);
    } else {
      if(bet>0) await usersData.set(senderID,{ money:(data.money||0)+bet });
      return api.sendMessage(`😮‍💨 CLICK! Safe!\nChamber ${pull+1}/6 empty\n${bet>0?`💰 +${bet} coins!\nBalance: ${(data.money||0)+bet}`:"You survived!"}`, threadID, event.messageID);
    }
  }
};
