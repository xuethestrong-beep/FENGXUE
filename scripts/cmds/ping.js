module.exports = {
  config: {
    name: "ping",
    version: "1.0",
    author: "Feng",
    role: 0,
    category: "system"
  },
  onStart: async function ({ api, event }) {
    const uptime = process.uptime();
    const d = Math.floor(uptime / 86400);
    const h = Math.floor((uptime % 86400) / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    let time = "";
    if (d > 0) time += `${d}d `;
    if (h > 0) time += `${h}h `;
    if (m > 0) time += `${m}m `;
    time += `${s}s`;

    api.sendMessage(`Bot alive: ${time}`, event.threadID, event.messageID);
  }
};
