
const fs = require("fs");
const path = require("path");

global.tictactoe = global.tictactoe || new Map();

const STATS_FILE = path.join(process.cwd(), "ttt_stats.json");

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function ensureStatsFile() {
  if (!fs.existsSync(STATS_FILE)) {
    fs.writeFileSync(STATS_FILE, JSON.stringify({}, null, 2));
  }
}

function readStats() {
  ensureStatsFile();

  try {
    const data = JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch (error) {
    console.error("TTT stats read error:", error);
    return {};
  }
}

function saveStats(stats) {
  const tempFile = STATS_FILE + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(stats, null, 2));
  fs.renameSync(tempFile, STATS_FILE);
}

function getPlayerStats(stats, id) {
  if (!stats[id]) {
    stats[id] = {
      wins: 0,
      losses: 0,
      draws: 0,
      games: 0,
      coinsWon: "0",
      currentStreak: 0,
      bestStreak: 0
    };
  }

  return stats[id];
}

function toBigInt(value) {
  try {
    const amount = BigInt(String(value ?? "0"));
    return amount >= 0n ? amount : 0n;
  } catch {
    return 0n;
  }
}

function money(value) {
  return value.toLocaleString("en-US");
}

function getBoard(board) {
  const cells = board.map((cell, i) =>
    cell === " " ? String(i + 1) : cell
  );

  return (
    `${cells[0]} │ ${cells[1]} │ ${cells[2]}\n` +
    `───┼───┼───\n` +
    `${cells[3]} │ ${cells[4]} │ ${cells[5]}\n` +
    `───┼───┼───\n` +
    `${cells[6]} │ ${cells[7]} │ ${cells[8]}`
  );
}

function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (
      board[a] !== " " &&
      board[a] === board[b] &&
      board[b] === board[c]
    ) {
      return board[a];
    }
  }

  return null;
}

function clearGame(thread, game) {
  if (game.timer) clearTimeout(game.timer);

  if (global.tictactoe.get(thread) === game) {
    global.tictactoe.delete(thread);
  }
}

async function refundPlayers(game, usersData) {
  if (!game.escrowed || game.bet <= 0n) return;

  for (const id of game.players) {
    const data = await usersData.get(id);
    const balance = toBigInt(data.money);

    await usersData.set(id, {
      money: (balance + game.bet).toString()
    });
  }

  game.escrowed = false;
}

function recordResult(winnerID, loserID, isDraw, coinsWon = 0n) {
  const stats = readStats();

  if (isDraw) {
    for (const id of [winnerID, loserID]) {
      const player = getPlayerStats(stats, id);
      player.games++;
      player.draws++;
    }
  } else {
    const winner = getPlayerStats(stats, winnerID);
    const loser = getPlayerStats(stats, loserID);

    winner.games++;
    winner.wins++;
    winner.currentStreak++;
    winner.bestStreak = Math.max(
      winner.bestStreak,
      winner.currentStreak
    );
    winner.coinsWon = (
      toBigInt(winner.coinsWon) + coinsWon
    ).toString();

    loser.games++;
    loser.losses++;
    loser.currentStreak = 0;
  }

  saveStats(stats);
}

function getRank(stats, id) {
  const sorted = Object.entries(stats)
    .sort((a, b) => b[1].wins - a[1].wins);

  return sorted.findIndex(([playerID]) => playerID === id) + 1;
}

module.exports = {
  config: {
    name: "ttt",
    aliases: ["tictactoe", "xo"],
    version: "7.0",
    author: "FENG",
    role: 0,
    countDown: 3,
    category: "game",
    description: "Multiplayer Tic-Tac-Toe with betting and leaderboard",
    guide: {
      en:
        "ttt @mention [bet]\n" +
        "Reply to someone + ttt [bet]\n" +
        "ttt top\n" +
        "ttt stats\n" +
        "ttt profile [@mention]\n" +
        "Reply 1-9 to play"
    }
  },

  onStart: async function ({ api, event, args, usersData }) {
    const threadID = event.threadID;
    const thread = String(threadID);
    const senderID = String(event.senderID);
    const action = (args[0] || "").toLowerCase();

    // LEADERBOARD
    if (action === "top" || action === "leaderboard") {
      const stats = readStats();

      const sorted = Object.entries(stats)
        .sort((a, b) => b[1].wins - a[1].wins)
        .slice(0, 10);

      if (!sorted.length) {
        return api.sendMessage(
          "🏆 TTT LEADERBOARD\n\nNo games have been recorded yet!",
          threadID,
          event.messageID
        );
      }

      let text = "🏆 TTT TOP 10 PLAYERS\n\n";

      for (let i = 0; i < sorted.length; i++) {
        const [id, data] = sorted[i];
        const name = await usersData.getName(id);
        const medals = ["🥇", "🥈", "🥉"];

        text +=
          `${medals[i] || `${i + 1}.`} ${name}\n` +
          `   🏆 ${data.wins} wins | 💀 ${data.losses} losses\n` +
          `   🤝 ${data.draws} draws | 🔥 ${data.bestStreak} best streak\n\n`;
      }

      return api.sendMessage(text, threadID, event.messageID);
    }

    // PERSONAL STATS / PROFILE
    if (["stats", "profile"].includes(action)) {
      const targetID = String(
        Object.keys(event.mentions || {})[0] ||
        (event.messageReply && event.messageReply.senderID) ||
        senderID
      );

      const stats = readStats();
      const data = getPlayerStats(stats, targetID);
      const name = await usersData.getName(targetID);
      const rank = getRank(stats, targetID) || "Unranked";

      return api.sendMessage(
        `🎮 TTT PLAYER PROFILE\n\n` +
        `👤 Player: ${name}\n` +
        `🏅 Rank: #${rank}\n\n` +
        `🏆 Wins: ${data.wins}\n` +
        `💀 Losses: ${data.losses}\n` +
        `🤝 Draws: ${data.draws}\n` +
        `🎮 Games: ${data.games}\n\n` +
        `🔥 Current streak: ${data.currentStreak}\n` +
        `⚡ Best streak: ${data.bestStreak}\n` +
        `💰 Coins won: ${money(toBigInt(data.coinsWon))}`,
        threadID,
        event.messageID
      );
    }

    // START GAME
    const opponentID = String(
      event.messageReply
        ? event.messageReply.senderID
        : Object.keys(event.mentions || {})[0] || ""
    );

    const betArg = args.find(a => /^\d+$/.test(String(a)));
    const bet = betArg ? BigInt(betArg) : 0n;

    if (global.tictactoe.has(thread)) {
      return api.sendMessage(
        "⚠️ A game is already active in this group!",
        threadID,
        event.messageID
      );
    }

    if (!opponentID) {
      return api.sendMessage(
        "❌ Mention someone or reply to their message!\n\n" +
        "Example: ttt @friend 100\n" +
        "Or reply to someone: ttt 100",
        threadID,
        event.messageID
      );
    }

    if (opponentID === senderID) {
      return api.sendMessage(
        "❌ You cannot play against yourself!",
        threadID,
        event.messageID
      );
    }

    if (bet > 1000000000000000000n) {
      return api.sendMessage(
        "❌ Maximum bet is 1,000,000,000,000,000,000 coins.",
        threadID,
        event.messageID
      );
    }

    const p1Name = await usersData.getName(senderID);
    const p2Name = await usersData.getName(opponentID);

    // RESERVE BETS
    if (bet > 0n) {
      const p1 = await usersData.get(senderID);
      const p2 = await usersData.get(opponentID);

      const p1Money = toBigInt(p1.money);
      const p2Money = toBigInt(p2.money);

      if (p1Money < bet) {
        return api.sendMessage(
          `❌ You need ${money(bet)} coins.\nYour balance: ${money(p1Money)}`,
          threadID,
          event.messageID
        );
      }

      if (p2Money < bet) {
        return api.sendMessage(
          `❌ ${p2Name} doesn't have enough coins.\nTheir balance: ${money(p2Money)}`,
          threadID,
          event.messageID
        );
      }

      try {
        await usersData.set(senderID, {
          money: (p1Money - bet).toString()
        });

        try {
          await usersData.set(opponentID, {
            money: (p2Money - bet).toString()
          });
        } catch (error) {
          await usersData.set(senderID, {
            money: p1Money.toString()
          });
          throw error;
        }
      } catch (error) {
        console.error("TTT bet error:", error);

        return api.sendMessage(
          "❌ Could not reserve the bets. Game cancelled.",
          threadID,
          event.messageID
        );
      }
    }

    const game = {
      board: Array(9).fill(" "),
      players: [senderID, opponentID],
      names: [p1Name, p2Name],
      symbols: ["❌", "⭕"],
      turn: 0,
      bet,
      escrowed: bet > 0n,
      timer: null,
      finished: false
    };

    global.tictactoe.set(thread, game);

    // TIMEOUT
    game.timer = setTimeout(async () => {
      if (global.tictactoe.get(thread) !== game) return;
      if (game.finished) return;

      game.finished = true;

      try {
        await refundPlayers(game, usersData);

        await api.sendMessage(
          `⏰ TTT TIMEOUT!\n\n` +
          `The game expired after 3 minutes.\n` +
          (bet > 0n
            ? `💰 Both players received ${money(bet)} coins back.`
            : "No coins were involved."),
          threadID
        );
      } catch (error) {
        console.error("TTT timeout refund error:", error);

        await api.sendMessage(
          "⚠️ Timeout refund failed. Please contact an admin.",
          threadID
        );
      } finally {
        clearGame(thread, game);
      }
    }, 180000);

    return api.sendMessage({
      body:
        `🎮 FENGSAMA TIC-TAC-TOE V7\n\n` +
        `❌ ${p1Name}\n` +
        `⭕ ${p2Name}\n\n` +
        `💰 Bet each: ${money(bet)} coins\n` +
        `🏆 Total prize: ${money(bet * 2n)} coins\n\n` +
        `${getBoard(game.board)}\n\n` +
        `👉 First turn: ❌ ${p1Name}\n` +
        `Reply with a number from 1 to 9.\n` +
        `⏰ Time limit: 3 minutes`,
      mentions: [
        { tag: p1Name, id: senderID },
        { tag: p2Name, id: opponentID }
      ]
    }, threadID, event.messageID);
  },

  onChat: async function ({ api, event, usersData }) {
    const thread = String(event.threadID);
    const senderID = String(event.senderID);
    const game = global.tictactoe.get(thread);

    if (!game || game.finished) return;

    const body = event.body?.trim();

    if (!/^[1-9]$/.test(body || "")) return;
    if (!game.players.includes(senderID)) return;

    const currentID = game.players[game.turn];
    const currentName = game.names[game.turn];

    if (senderID !== currentID) {
      return api.sendMessage({
        body: `⏳ It's ${currentName}'s turn! Please wait.`,
        mentions: [{ tag: currentName, id: currentID }]
      }, event.threadID, event.messageID);
    }

    const position = Number(body) - 1;

    if (game.board[position] !== " ") {
      return api.sendMessage(
        "❌ That position is already taken!",
        event.threadID,
        event.messageID
      );
    }

    game.board[position] = game.symbols[game.turn];

    const view = getBoard(game.board);
    const winner = checkWinner(game.board);

    // WIN
    if (winner) {
      if (game.finished) return;
      game.finished = true;

      const winnerIndex = game.symbols.indexOf(winner);
      const loserIndex = winnerIndex === 0 ? 1 : 0;

      const winnerID = game.players[winnerIndex];
      const loserID = game.players[loserIndex];

      const winnerName = game.names[winnerIndex];
      const loserName = game.names[loserIndex];

      try {
        if (game.bet > 0n && game.escrowed) {
          const winnerData = await usersData.get(winnerID);
          const winnerMoney = toBigInt(winnerData.money);

          await usersData.set(winnerID, {
            money: (winnerMoney + game.bet * 2n).toString()
          });

          game.escrowed = false;
        }

        recordResult(
          winnerID,
          loserID,
          false,
          game.bet * 2n
        );

        clearGame(thread, game);

        return api.sendMessage({
          body:
            `🏆 TTT WINNER!\n\n${view}\n\n` +
            `🎉 ${winnerName} ${winner} WINS!\n` +
            `💀 ${loserName} lost!\n\n` +
            (game.bet > 0n
              ? `💰 Prize: ${money(game.bet * 2n)} coins!`
              : "✨ Great game!"),
          mentions: [
            { tag: winnerName, id: winnerID },
            { tag: loserName, id: loserID }
          ]
        }, event.threadID, event.messageID);

      } catch (error) {
        console.error("TTT winner processing error:", error);

        clearGame(thread, game);

        return api.sendMessage(
          "⚠️ Winner processing failed. Please check the balances and stats before starting another bet game.",
          event.threadID
        );
      }
    }

    // DRAW
    if (!game.board.includes(" ")) {
      if (game.finished) return;
      game.finished = true;

      try {
        await refundPlayers(game, usersData);

        recordResult(
          game.players[0],
          game.players[1],
          true
        );

        clearGame(thread, game);

        return api.sendMessage(
          `🤝 TTT DRAW!\n\n${view}\n\n` +
          (game.bet > 0n
            ? `💰 Both players received ${money(game.bet)} coins back.`
            : "No winner this time!"),
          event.threadID,
          event.messageID
        );
      } catch (error) {
        console.error("TTT draw processing error:", error);

        clearGame(thread, game);

        return api.sendMessage(
          "⚠️ Draw refund or stats saving failed. Please check the balances.",
          event.threadID
        );
      }
    }

    // NEXT TURN
    game.turn = game.turn === 0 ? 1 : 0;

    const nextID = game.players[game.turn];
    const nextName = game.names[game.turn];
    const nextSymbol = game.symbols[game.turn];

    return api.sendMessage({
      body:
        `${view}\n\n` +
        `👉 Turn: ${nextSymbol} ${nextName}\n` +
        `Reply with a number from 1 to 9.`,
      mentions: [{ tag: nextName, id: nextID }]
    }, event.threadID, event.messageID);
  }
};
