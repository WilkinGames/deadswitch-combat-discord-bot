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
            case "getWeapon":
                const weaponId = args[1];
                if (weaponId)
                {
                    requestWeapon(channelID, weaponId.toLowerCase());
                }
                else
                {
                    bot.sendMessage({
                        to: channelID,
                        message: "*Missing weapon ID!*"
                    });
                }
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
        const players = await res.json();

        if (!Array.isArray(players) || players.length === 0)
        {
            return bot.sendMessage({
                to: channelID,
                message: "",
                embed: {
                    color: 14177600,
                    description: "No players are currently online.",
                    thumbnail: { url: logoURL }
                }
            });
        }

        // Sort players by state (e.g., 'game' first), then level
        players.sort((a, b) =>
        {
            const stateOrder = (s) => s === "game" ? 0 : 1;
            return stateOrder(a.state) - stateOrder(b.state) || b.level - a.level;
        });

        const maxShown = 10;
        const shownPlayers = players.slice(0, maxShown);

        const fields = shownPlayers.map(p =>
        {
            const prestigeStr = p.prestige > 0 ? ` (Prestige ${p.prestige})` : "";
            const levelStr = `Level ${p.level}${prestigeStr}`;
            const stateStr = p.state === "game" ? "🟢 In Game" : "🟡 In Menu";

            let details = stateStr;
            if (p.serverName)
            {
                details += ` — ${p.serverName.replace(/\[.*?\]/g, "").trim()}`;
            }
            if (p.gameModeId)
            {
                details += ` — ${p.gameModeId.replace(/_/g, " ")}`;
            }

            return {
                name: `${p.name} (${levelStr})`,
                value: details,
                inline: false
            };
        });

        const extraCount = players.length - shownPlayers.length;

        bot.sendMessage({
            to: channelID,
            message: "",
            embed: {
                color: 14177600,
                title: `Online Players (${players.length})`,
                description: extraCount > 0 ? `Showing ${maxShown} of ${players.length} players:` : "",
                thumbnail: { url: logoURL },
                fields: fields
            }
        });

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
                thumbnail: { url: logoURL }
            }
        });
    }
}

/**
 * Retrieves and displays weapon stats.
 * @param channelID 
 * @param weaponId 
 */
async function requestWeapon(channelID, weaponId)
{
    try
    {
        const api = "https://dsc.wilkingames.net/api/getWeapons";
        const res = await fetch(api);
        const weapons = await res.json();

        const weapon = weapons.find(w => w.id.toLowerCase() === weaponId);
        if (!weapon)
        {
            return bot.sendMessage({
                to: channelID,
                message: "",
                embed: {
                    color: 14177600,
                    description: "That weapon does not exist!",
                    thumbnail: { url: logoURL }
                }
            });
        }

        // Build stats display
        const fields = [
            { name: "Type", value: weapon.type, inline: true },
            { name: "Damage", value: `${weapon.damage}`, inline: true },
            { name: "RPM", value: `${weapon.rpm}`, inline: true },
            { name: "Mobility", value: `${weapon.mobility}`, inline: true },
            { name: "Fire Mode", value: weapon.fireMode, inline: true },
            { name: "Cost", value: `${formatNum(weapon.cost)} Credits`, inline: true }
        ];

        bot.sendMessage({
            to: channelID,
            message: "",
            embed: {
                color: 14177600,
                title: `${weapon.name}`,
                thumbnail: { url: logoURL },
                fields: fields
            }
        });

    }
    catch (e)
    {
        console.warn(e);
        bot.sendMessage({
            to: channelID,
            message: "",
            embed: {
                color: 14177600,
                description: "Failed to retrieve weapon data.",
                thumbnail: { url: logoURL }
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