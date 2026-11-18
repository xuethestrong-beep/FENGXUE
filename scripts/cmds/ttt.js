global.tictactoe = global.tictactoe || new Map();

module.exports = {
  config: { 
    name: "ttt", 
    aliases: ["tictactoe"], 
    version: "5.0-auto-tag", 
    author: "FENG", 
    role: 0, 
    category: "game",
    guide: "Reply to someone + {pn} [bet] or {pn} @mention [bet]"
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, senderID, messageReply } = event;
    let opponentID = messageReply ? messageReply.senderID : Object.keys(event.mentions)[0];
    const betArg = args.find(a => !isNaN(a) && !a.includes("@"));
    const bet = parseInt(betArg) || 0;

    if (global.tictactoe.has(threadID))
      return api.sendMessage("⚠️ Game active! Finish first.", threadID, event.messageID);

    if (!opponentID)
      return api.sendMessage("❌ Reply to someone's message + ttt [bet]\nEx: Reply to someone -> ttt 100", threadID, event.messageID);

    if (opponentID === senderID)
      return api.sendMessage("❌ Can't play vs yourself!", threadID, event.messageID);

    if (bet > 0) {
      const p1 = await usersData.get(senderID);
      const p2 = await usersData.get(opponentID);
      if ((p1.money||0) < bet) return api.sendMessage(`❌ You need ${bet} coins, you have ${p1.money||0}`, threadID, event.messageID);
      if ((p2.money||0) < bet) return api.sendMessage(`❌ ${await usersData.getName(opponentID)} only has ${p2.money||0}`, threadID, event.messageID);
    }

    const board = Array(9).fill(" ");
    const p1Name = await usersData.getName(senderID);
    const p2Name = await usersData.getName(opponentID);

    global.tictactoe.set(threadID, { 
      board, 
      players: [senderID, opponentID], 
      turn: 0, 
      symbols: ["❌", "⭕"], 
      bet, 
      names: [p1Name, p2Name]
    });

    setTimeout(()=>{ if(global.tictactoe.has(threadID)){ api.sendMessage("⏰ TTT timeout ended", threadID); global.tictactoe.delete(threadID); } }, 180000);

    // AUTO-TAG OPPONENT + STARTER
    return api.sendMessage({
      body: `🎮 TIC-TAC-TOE ${bet>0?`💰 ${bet} BET`:"(fun)"}\n\n❌ ${p1Name} vs ⭕ ${p2Name}\n\n⬜⬜⬜  (1 2 3)\n⬜⬜⬜  (4 5 6)\n⬜⬜⬜  (7 8 9)\n\nTurn: ❌ ${p1Name} - reply 1-9\n\n@${p2Name} your turn next!`,
      mentions: [{ tag: p1Name, id: senderID }, { tag: p2Name, id: opponentID }]
    }, threadID, event.messageID);
  },

  onChat: async function ({ api, event, usersData }) {
    const game = global.tictactoe.get(event.threadID);
    if (!game) return;
    const body = event.body?.trim();
    if (!/^[1-9]$/.test(body)) return;
    const { senderID, threadID } = event;
    if (!game.players.includes(senderID)) return;
    if (senderID !== game.players[game.turn]) {
      const nextName = game.names[game.turn];
      const nextID = game.players[game.turn];
      return api.sendMessage({
        body: `⏳ Not your turn! Wait for ${nextName} ${game.symbols[game.turn]}`,
        mentions: [{ tag: nextName, id: nextID }]
      }, threadID, event.messageID);
    }

    const pos = parseInt(body)-1;
    if (game.board[pos] !== " ") return api.sendMessage("❌ Taken! Choose other", threadID, event.messageID);

    game.board[pos] = game.symbols[game.turn];
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const won = wins.some(a => game.board[a[0]]!==" " && game.board[a[0]]==game.board[a[1]] && game.board[a[1]]==game.board[a[2]]);
    const emojiBoard = game.board.map(c=>c==" "?"⬜":c);
    let view = `${emojiBoard[0]}${emojiBoard[1]}${emojiBoard[2]}\n${emojiBoard[3]}${emojiBoard[4]}${emojiBoard[5]}\n${emojiBoard[6]}${emojiBoard[7]}${emojiBoard[8]}`;

    if (won) {
      const winnerID = game.players[game.turn];
      const loserID = game.players[game.turn===0?1:0];
      const winnerName = game.names[game.turn];
      const loserName = game.names[game.turn===0?1:0];
      
      if (game.bet>0) {
        const wD = await usersData.get(winnerID);
        const lD = await usersData.get(loserID);
        await usersData.set(winnerID, { money: (wD.money||0)+game.bet });
        await usersData.set(loserID, { money: (lD.money||0)-game.bet });
      }
      
      api.sendMessage({
        body: `🏆 WINNER!\n\n${view}\n\n🎉 ${winnerName} ${game.symbols[game.turn]} wins${game.bet>0?` ${game.bet} coins!`:"!"}\n${loserName} lost ${game.bet>0?`${game.bet} coins`:""}`,
        mentions: [{ tag: winnerName, id: winnerID }, { tag: loserName, id: loserID }]
      }, threadID, event.messageID);
      
      global.tictactoe.delete(threadID);
      return;
    }

    if (!game.board.includes(" ")) {
      api.sendMessage(`🤝 DRAW!\n\n${view}\nNo winner`, threadID, event.messageID);
      global.tictactoe.delete(threadID);
      return;
    }

    game.turn = game.turn===0?1:0;
    const nextID = game.players[game.turn];
    const nextName = game.names[game.turn];
    
    api.sendMessage({
      body: `${view}\n\nTurn: ${game.symbols[game.turn]} ${nextName} - reply 1-9`,
      mentions: [{ tag: nextName, id: nextID }]
    }, threadID, event.messageID);
  }
};
