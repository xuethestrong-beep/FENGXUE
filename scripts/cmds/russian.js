module.exports = {
  config:{ name:"russian", aliases:["roulette","rr"], version:"1.0", author:"FENG", category:"game", role:0, guide:"{pn} [bet]" },
  onStart: async function({ api, event, args, usersData }) {
    const bet=parseInt(args[0])||0; const { senderID, threadID } = event;
    const d=await usersData.get(senderID); if(bet>0&&(d.money||0)<bet) return api.sendMessage(`Need ${bet}`, threadID, event.messageID);
    const bullet=Math.floor(Math.random()*6); const pull=Math.floor(Math.random()*6);
    if(bullet===pull){ if(bet>0){ await usersData.set(senderID,{money:(d.money||0)-bet}); } return api.sendMessage(`💥 BANG! 💀 You died!\nChamber: ${pull+1}/6 had bullet\nLost ${bet>0?bet:""}`, threadID, event.messageID); }
    else { if(bet>0){ await usersData.set(senderID,{money:(d.money||0)+bet}); } return api.sendMessage(`😮‍💨 CLICK! Safe!\nChamber: ${pull+1}/6 was empty, bullet was ${bullet+1}\n${bet>0?`+${bet} coins!`:"You survived!"}`, threadID, event.messageID); }
  }
};
