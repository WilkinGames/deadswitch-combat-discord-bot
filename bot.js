/**
 * Deadswitch Combat - Discord Bot
 * ©2025 Wilkin Games
 * https://wilkingames.com - https://deadswitchcombat.com
 */

const dotenv = require("dotenv");
dotenv.config();

const Discord = require("discord.io");
const logger = require("winston");
//const fetch = require("node-fetch");
const logoURL = "https://xwilkinx.com/play/combat/latest/assets/images/ui/logo.png";

//Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = "debug";

//Initialize Discord Bot
const bot = new Discord.Client({
    token: process.env.DISCORD_BOT_TOKEN,
    autorun: true
});

bot.on("ready", (evt) =>
{
    logger.info("Connected");
    logger.info("Logged in as:");
    logger.info(bot.username + " - (" + bot.id + ")");
});

bot.on("message", async (user, userID, channelID, message, evt) =>
{
    if (message.substring(0, 1) === "!") 
    {
        var args = message.substring(1).split(" ");
        var cmd = args[0];
        switch (cmd) 
        {
            case "getPlayer":
                const username = args[1];
                if (username)
                {
                    requestPlayer(channelID, username);
                }
                else 
                {
                    bot.sendMessage({
                        to: channelID,
                        message: "*Missing username!*"
                    });
                }
                break;
            case "getOnline":
                requestOnlinePlayers(channelID);
                break;
        }
    }
});

/**
 * Retrieves player profile data.
 * @param channelID 
 * @param username 
 */
async function requestPlayer(channelID, username)
{
    try
    {
        const api = `https://dsc.wilkingames.net/`;
        const res = await fetch(`${api}api/getPlayer?username=${username}`);
        const json = await res.json();
        const player = json?.profile;
        if (player)
        {
            let fields = [
                {
                    name: "Rank",
                    value: "Level " + player.level + (player.prestige > 0 ? (" Prestige " + player.prestige) : "")
                },
                {
                    name: "Total XP",
                    value: formatNum(Math.max(player.xp, player.totalXP || player.xp))
                },
                {
                    name: "XP",
                    value: formatNum(player.xp)
                }
            ];
            fields.push(
                {
                    name: "Kills",
                    value: formatNum(player.stats.kills)
                },
                {
                    name: "Join Date",
                    value: new Date(json.joinDate).toString()
                },
                {
                    name: "Last Seen",
                    value: new Date(json.lastModified).toString()
                }
            );
            bot.sendMessage({
                to: channelID,
                message: "",
                embed: {
                    color: 14177600,
                    title: player.name,
                    thumbnail: {
                        url: logoURL
                    },
                    fields: fields
                }
            });
        }
        else 
        {
            bot.sendMessage({
                to: channelID,
                message: "",
                embed: {
                    color: 14177600,
                    description: "That player does not exist!",
                    thumbnail: {
                        url: logoURL
                    }
                }
            });
        }
    }
    catch (e)
    {
        console.warn(e);
        bot.sendMessage({
            to: channelID,
            message: "",
            embed: {
                color: 14177600,
                description: "That player does not exist!",
                thumbnail: {
                    url: logoURL
                }
            }
        });
    }
}

/**
 * Retrieves and displays online players.
 * @param channelID
 */
async function requestOnlinePlayers(channelID)
{
    try
    {
        const res = await fetch("https://dsc.wilkingames.net/players");
        const json = await res.json();

        const players = json?.players;
        if (Array.isArray(players) && players.length > 0)
        {
            // Limit output to avoid exceeding Discord message size
            const maxPlayers = 25;
            const limitedPlayers = players.slice(0, maxPlayers);
            const playerNames = limitedPlayers.map(p => `• ${p.name}`).join("\n");

            bot.sendMessage({
                to: channelID,
                message: "",
                embed: {
                    color: 14177600,
                    title: `Online Players (${players.length})`,
                    description: playerNames + (players.length > maxPlayers ? `\n...and ${players.length - maxPlayers} more` : ""),
                    thumbnail: {
                        url: logoURL
                    }
                }
            });
        }
        else
        {
            bot.sendMessage({
                to: channelID,
                message: "",
                embed: {
                    color: 14177600,
                    description: "No players are currently online.",
                    thumbnail: {
                        url: logoURL
                    }
                }
            });
        }
    }
    catch (e)
    {
        console.warn(e);
        bot.sendMessage({
            to: channelID,
            message: "",
            embed: {
                color: 14177600,
                description: "Failed to retrieve online players.",
                thumbnail: {
                    url: logoURL
                }
            }
        });
    }
}

function formatNum(val) 
{
    if (isNaN(val) || val == null)
    {
        return "0";
    }
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}