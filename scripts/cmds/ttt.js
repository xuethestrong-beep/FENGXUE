const fs = require("fs");
const path = require("path");

global.tictactoe = global.tictactoe || new Map();

module.exports = {
  config: {
    name: "ttt",
    aliases: ["tictactoe"],
    version: "2.0-bet",
    author: "FENG",
    role: 0,
    category: "game",
    shortDescription: "TicTacToe with bet"
  },

  onStart: async function ({ api, event, args, usersData, economy }) {
    const { threadID, senderID } = event;
    const mention = Object.keys(event.mentions)[0];
    const bet = parseInt(args[1]) || 0;

    if (!mention) return api.sendMessage("Usage: ttt @Juan [bet]\nEx: ttt @Juan 100", threadID);

    // Check money if bet
    if (bet > 0) {
      const userMoney = await usersData.get(senderID);
      const balance = userMoney.money || 0;
      if (balance < bet) return api.sendMessage(`You need ${bet} coins, you have ${balance}`, threadID);
    }

    const board = Array(9).fill(" ");
    
    global.tictactoe.set(threadID, {
      board,
      players: [senderID, mention],
      turn: 0,
      symbols: ["❌", "⭕"],
      bet,
      names: [await usersData.getName(senderID), await usersData.getName(mention)]
    });

    api.sendMessage(
`🎮 TTT - ${bet > 0 ? `${bet} coins bet` : "fun only"}

❌ ${global.tictactoe.get(threadID).names[0]}
vs
⭕ ${global.tictactoe.get(threadID).names[1]}

Board:
⬜⬜⬜ (1 2 3)
⬜⬜⬜ (4 5 6)
⬜⬜⬜ (7 8 9)

Turn: ❌
Reply 1-9`, threadID);
  },

  onChat: async function ({ api, event, usersData }) {
    const game = global.tictactoe.get(event.threadID);
    if (!game || !/^[1-9]$/.test(event.body?.trim())) return;

    const { senderID, threadID } = event;
    if (!game.players.includes(senderID)) return;
    if (senderID !== game.players[game.turn]) return;

    const pos = parseInt(event.body.trim()) - 1;
    if (game.board[pos] !== " ") return api.sendMessage("Taken! Choose another", threadID);

    game.board[pos] = game.symbols[game.turn];

    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const won = wins.some(a => game.board[a[0]] !== " " && game.board[a[0]] == game.board[a[1]] && game.board[a[1]] == game.board[a[2]]);

    // Build board visual
    const emojiBoard = game.board.map(c => c == " " ? "⬜" : c == "❌" ? "❌" : "⭕");
    let view = `${emojiBoard[0]}${emojiBoard[1]}${emojiBoard[2]}\n${emojiBoard[3]}${emojiBoard[4]}${emojiBoard[5]}\n${emojiBoard[6]}${emojiBoard[7]}${emojiBoard[8]}`;

    if (won) {
      const winnerID = game.players[game.turn];
      const loserID = game.players[game.turn === 0 ? 1 : 0];
      
      if (game.bet > 0) {
        await usersData.set(winnerID, { money: (await usersData.get(winnerID)).money + game.bet });
        await usersData.set(loserID, { money: (await usersData.get(loserID)).money - game.bet });
        api.sendMessage(`🏆 WINNER!\n\n${view}\n\n${game.names[game.turn]} wins ${game.bet} coins!`, threadID);
      } else {
        api.sendMessage(`🏆 WINNER!\n\n${view}\n\n${game.names[game.turn]} wins!`, threadID);
      }
      global.tictactoe.delete(threadID);
      return;
    }

    if (!game.board.includes(" ")) {
      api.sendMessage(`🤝 DRAW!\n\n${view}\nNo one wins`, threadID);
      global.tictactoe.delete(threadID);
      return;
    }

    game.turn = game.turn === 0 ? 1 : 0;
    api.sendMessage(`${view}\n\nTurn: ${game.symbols[game.turn]} ${game.names[game.turn]}`, threadID);
  }
};
