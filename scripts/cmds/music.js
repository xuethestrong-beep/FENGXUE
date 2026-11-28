
const fs = require("fs");
const path = require("path");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");
const { pipeline } = require("stream/promises");

const CACHE_DIR = path.join(__dirname, "cache", "music");
const MAX_SIZE = 20 * 1024 * 1024;
const MAX_DURATION = 600;

fs.mkdirSync(CACHE_DIR, { recursive: true });

function getYtdlOptions() {
    const options = {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25
    };

    const cookie = process.env.YOUTUBE_COOKIE;

    if (cookie && cookie.trim()) {
        options.requestOptions = {
            headers: {
                Cookie: cookie.trim()
            }
        };
    }

    return options;
}

function formatDuration(seconds) {
    seconds = Number(seconds) || 0;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
}

async function downloadAudio(url, filePath) {
    let size = 0;

    const audio = ytdl(url, getYtdlOptions());

    const limiter = new (require("stream").Transform)({
        transform(chunk, encoding, callback) {
            size += chunk.length;

            if (size > MAX_SIZE) {
                return callback(new Error("FILE_TOO_LARGE"));
            }

            callback(null, chunk);
        }
    });

    await pipeline(audio, limiter, fs.createWriteStream(filePath));

    if (!size) {
        throw new Error("EMPTY_AUDIO");
    }

    return size;
}

module.exports = {
    config: {
        name: "music",
        aliases: ["song", "play"],
        version: "2.0.0",
        author: "FENGSAMA",
        countDown: 30,
        role: 0,
        description: "Search and download YouTube audio",
        category: "media",
        guide: "{pn} <song name or YouTube URL>"
    },

    onStart: async function ({ api, event, args }) {
        const query = args.join(" ").trim();

        if (!query) {
            return api.sendMessage(
                "🎵 MUSIC PLAYER\n\n" +
                "Usage: !music <song name>\n" +
                "Example: !music Night Changes\n\n" +
                "You can also send a YouTube link.",
                event.threadID,
                event.messageID
            );
        }

        const status = await new Promise(resolve => {
            api.sendMessage(
                "🔎 FENGSAMA is searching for your music...",
                event.threadID,
                (err, info) => resolve({ err, info }),
                event.messageID
            );
        });

        if (status.err) return;

        let filePath;

        try {
            let video;

            if (ytdl.validateURL(query)) {
                const info = await ytdl.getInfo(query, getYtdlOptions());

                video = {
                    title: info.videoDetails.title,
                    url: info.videoDetails.video_url,
                    duration: Number(info.videoDetails.lengthSeconds),
                    author: info.videoDetails.author?.name || "Unknown"
                };
            } else {
                const results = await yts(query);

                if (!results.videos || !results.videos.length) {
                    return api.sendMessage(
                        "❌ No music found. Try another search.",
                        event.threadID
                    );
                }

                const result = results.videos[0];

                video = {
                    title: result.title,
                    url: result.url,
                    duration: Number(result.seconds),
                    author: result.author?.name || "Unknown"
                };
            }

            if (!video.duration || video.duration > MAX_DURATION) {
                return api.sendMessage(
                    "⚠️ This video is unavailable or longer than 10 minutes.",
                    event.threadID
                );
            }

            filePath = path.join(
                CACHE_DIR,
                `feng_music_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`
            );

            await downloadAudio(video.url, filePath);

            const attachment = fs.createReadStream(filePath);

            const sent = await new Promise(resolve => {
                api.sendMessage(
                    {
                        body:
                            "🎧 FENGSAMA MUSIC\n\n" +
                            `🎵 Title: ${video.title}\n` +
                            `👤 Artist/Channel: ${video.author}\n` +
                            `⏱️ Duration: ${formatDuration(video.duration)}\n\n` +
                            `🔗 YouTube: ${video.url}\n\n` +
                            "Enjoy your music! 🚀",
                        attachment
                    },
                    event.threadID,
                    (err, messageInfo) => resolve({ err, messageInfo }),
                    event.messageID
                );
            });

            if (sent.err) {
                throw new Error("MESSENGER_SEND_FAILED");
            }

        } catch (error) {
            console.error("[FENG MUSIC]", error);

            let message = "❌ Music download failed. Please try another song.";

            if (error.message === "FILE_TOO_LARGE") {
                message = "⚠️ Audio is larger than 20 MB. Try a shorter song.";
            } else if (
                String(error.message).includes("Sign in") ||
                String(error.message).includes("403") ||
                String(error.message).includes("429")
            ) {
                message =
                    "⚠️ YouTube blocked this request. Check your cookie configuration or try again later.";
            } else if (error.message === "MESSENGER_SEND_FAILED") {
                message = "❌ Audio downloaded, but Messenger could not send it.";
            }

            api.sendMessage(message, event.threadID);

        } finally {
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    console.error("[MUSIC CLEANUP]", err);
                }
            }
        }
    }
};
        
