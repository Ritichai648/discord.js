const { Client } = require("discord.js");
const { Manager } = require("erela.js");
const { token, nodes } = require("./config");

const client = new Client({
    intents: [129]
})

client.on("ready", () => {
    console.log("I am ready")
    client.manager.init(client.user.id);
    client.application.commands.set([
        {
            name: "play",
            description: "คำสั่งเล่นเพลง",
            options: [{
                name: "url",
                description: "ลิ้งค์เพลง",
                type: "STRING",
                required: true
            }]
        },
        {
            name: "skip",
            description: "ข้ามเพลง"
        },
        {
            name: "join",
            description: "เข้าห้องเสียง"
        },
        {
            name: "leave",
            description: "ออกห้องเสียง"
        },
        {
            name: "nowplaying",
            description: "ดูรายละเอียดของเพลงที่กำลังเล่น"
        },
        {
            name: "queue",
            description: "ดูรายละเอียดเพลงทั้งหมด"
        },
        {
            name: "loop",
            description: "คำสั่งวนเพลง",
            options: [
                {
                    name: "mode",
                    description: "เลือกการวนเพลง",
                    type: "INTEGER",
                    choices: [
                        {
                            name: "loopqueue",
                            value: 0
                        },
                        {
                            name: "loopmusic",
                            value: 1
                        },
                        {
                            name: "loopqueueoff",
                            value: 2
                        },
                        {
                            name: "loopmusicoff",
                            value: 3
                        }
                    ],
                    required: true
                }
            ]
        },
        {
            name: "resume",
            description: "เล่นเพลงอีกครั้ง"
        },
        {
            name: "nc",
            description: "Effect Nightcore"
        },
        {
            name: "8d",
            description: "Effect 8D"
        },
        {
            name: "bb",
            description: "Effect BassBoost"
        }
    ])
})

client.on("raw", d => client.manager.updateVoiceState(d));

client.on("interactionCreate", async (interaction) => {
    if (!interaction.guild) return;

    if (interaction.isCommand()) {
        const namecmd = interaction.commandName;
        if (namecmd === "play") {
            const url = interaction.options.getString("url");

            let res;
            try {
                // Search for tracks using a query or url, using a query searches youtube automatically and the track requester object
                res = await client.manager.search(url, interaction.user);
                // Check the load type as this command is not that advanced for basics
                if (res.loadType === "LOAD_FAILED") throw res.exception;
                else if (res.loadType === "PLAYLIST_LOADED") throw { message: "Playlists are not supported with this command." };
            } catch (err) {
                return interaction.reply(`there was an error while searching: ${err.message}`);
            }

            const player = client.manager.create({
                guild: interaction.guildId,
                voiceChannel: interaction.member.voice.channel.id,
                textChannel: interaction.channel.id,
            });

            player.connect();
            player.queue.add(res.tracks[0]);

            if (!player.playing && !player.paused && !player.queue.size) player.play()

            return interaction.reply(`enqueuing ${res.tracks[0].title}.`)
        } else if (namecmd === "skip") {
            const { channel } = interaction.member.voice;

            const player = client.manager.get(interaction.guildId);

            if (!player || !player.queue.current) return interaction.reply({ content: "ขณะนี้ไม่มีเพลงที่กำลังเล่นอยู่" });

            if (!channel || channel.id != player.voiceChannel) return interaction.reply({ content: "คุณไม่ได้อยู่ในห้องเสียง" });

            player.stop();

            interaction.reply({ content: "ข้ามเพลงแล้ว!" })
        } else if (namecmd === "join") {
            const { channel } = interaction.member.voice;

            if (!channel) return interaction.reply({ content: "คุณไม่ได้อยู่ในห้องเสียง" });

            let player = client.manager.get(interaction.guildId);

            if (!player) {
                player = client.manager.create({
                    guild: interaction.guildId,
                    voiceChannel: interaction.member.voice.channel.id,
                    textChannel: interaction.channel.id,
                });
            } else {
                return interaction.reply({ content: "กรุณากลับเข้าห้องที่บอทอยู่" })
            }

            player.connect();

            interaction.reply({ content: "เข้าห้องแล้ว" })

        } else if (namecmd === "leave") {
            const { channel } = interaction.member.voice;

            if (!channel) return interaction.reply({ content: "คุณไม่ได้อยู่ในห้องเสียง" });

            let player = client.manager.get(interaction.guildId);

            if (!player) {
                return interaction.reply({ content: "ขณะนี้ไม่มีเพลงที่เล่น" })
            } else {
                player.destroy();
                interaction.reply({ content: "ออกห้องแล้ว" })
            }
        } else if (namecmd === "nowplaying") {
            const { channel } = interaction.member.voice;

            let player = client.manager.get(interaction.guildId);

            if (!player) return interaction.reply({ content: "ไม่มีเพลงที่เล่นอยู่" })

            if (channel.id != player.voiceChannel) return interaction.reply({ content: "คุณไม่ได้อยู่ห้องเดียวกับบอท" })

            if (!player.queue.current) return interaction.reply({ content: "ไม่มีเพลงที่เล่นอยู่" })

            const track = player.queue.current

            interaction.reply({
                embeds: [
                    {
                        author: {
                            name: client.user.username,
                            icon_url: client.user.avatarURL()
                        },
                        description: `ขณะนี้กำลังเล่น: [${((track.title).slice(0, 20))}...](${track.uri})`,
                        footer: {
                            text: client.user.username,
                            icon_url: client.user.avatarURL()
                        }
                    }
                ]
            })
        } else if (namecmd === "queue") {
            const { channel } = interaction.member.voice;

            let player = client.manager.get(interaction.guildId);

            if (!player) return interaction.reply({ content: "ไม่มีเพลงที่เล่นอยู่" })

            if (channel.id != player.voiceChannel) return interaction.reply({ content: "คุณไม่ได้อยู่ห้องเดียวกับบอท" })

            if (!player.queue.current) return interaction.reply({ content: "ไม่มีเพลงที่เล่นอยู่" })

            const track = player.queue

            interaction.reply({
                embeds: [
                    {
                        author: {
                            name: client.user.username,
                            icon_url: client.user.avatarURL()
                        },
                        description: track.map(t => `**${(track.indexOf(t) + 1)}** **${t.title.substr(0, 15)}**`).join("\n"),
                        fields: [
                            {
                                name: "กำลังเล่นเพลง...",
                                value: player.queue.current.title
                            },
                            {
                                name: "มีคิวทั้งหมด",
                                value: track.length + "queue"
                            }
                        ],
                        footer: {
                            text: client.user.username,
                            icon_url: client.user.avatarURL()
                        }
                    }
                ]
            })
        } else if (namecmd === "loop") {
            let mode = interaction.options.getInteger("mode");

            let player = client.manager.get(interaction.guildId);

            if (!player) return interaction.reply({ content: "ไม่มีเพลงที่เล่นอยู่" })

            const { channel } = interaction.member.voice;

            if (channel.id != player.voiceChannel) return interaction.reply({ content: "คุณไม่ได้อยู่ห้องเดียวกับบอท" })

            if (mode === 1) {
                player.setTrackRepeat(true);

                await interaction.reply({ content: "เปิด loop เพลงแล้ว" })
            } else if (!mode) {
                player.setQueueRepeat(true);

                await interaction.reply({ content: "เปิด loop คิวแล้ว" })
            } else if (mode === 2) {
                player.setQueueRepeat(false);

                await interaction.reply({ content: "ปิด loop คิวแล้ว" })
            } else if (mode === 3) {
                player.setTrackRepeat(false);

                await interaction.reply({ content: "ปิด loop เพลงแล้ว" })
            }
        } else if (namecmd === "resume") {
            const { channel } = interaction.member.voice;

            let player = client.manager.get(interaction.guildId);

            if (!player) return interaction.reply({ content: "ไม่มีเพลงที่เล่นอยู่" })

            if (channel.id != player.voiceChannel) return interaction.reply({ content: "คุณไม่ได้อยู่ห้องเดียวกับบอท" })

            if (player.playing) {
                player.pause(player.playing);
                return interaction.reply({ content: "หยุดเพลงแล้ว" })
            } else {
                player.pause(player.playing);
                return interaction.reply({ content: "เล่นเพลงต่อแล้ว" })
            }
        } else if (namecmd === "nc") {
            let player = client.manager.get(interaction.guildId);

            if (!player) return interaction.reply({ content: "ไม่มีเพลงที่เล่นอยู่" })

            const { channel } = interaction.member.voice;

            if (channel.id != player.voiceChannel) return interaction.reply({ content: "คุณไม่ได้อยู่ห้องเดียวกับบอท" })

            if (player.nightcore) {
                player.nightcore = false;
                return interaction.reply({ content: "ปิด nightcore แล้ว" })
            } else {
                player.nightcore = true;
                return interaction.reply({ content: "เปิด nightcore แล้ว" })
            }
        } else if (namecmd === "8d") {
            let player = client.manager.get(interaction.guildId);

            if (!player) return interaction.reply({ content: "ไม่มีเพลงที่เล่นอยู่" })

            const { channel } = interaction.member.voice;

            if (channel.id != player.voiceChannel) return interaction.reply({ content: "คุณไม่ได้อยู่ห้องเดียวกับบอท" })

            if (player.eightD) {
                player.eightD = false;
                return interaction.reply({ content: "ปิด 8D แล้ว" })
            } else {
                player.eightD = true;
                return interaction.reply({ content: "เปิด 8D แล้ว" })
            }
        } else if (namecmd === "bb") {
            let player = client.manager.get(interaction.guildId);

            if (!player) return interaction.reply({ content: "ไม่มีเพลงที่เล่นอยู่" })

            const { channel } = interaction.member.voice;

            if (channel.id != player.voiceChannel) return interaction.reply({ content: "คุณไม่ได้อยู่ห้องเดียวกับบอท" })

            if (player.bassboost) {
                player.bassboost = false;
                return interaction.reply({ content: "ปิด bassboost แล้ว" })
            } else {
                player.bassboost = true;
                return interaction.reply({ content: "เปิด bassboost แล้ว" })
            }
        }
    }
})

const filter = require('erela.js-filters')

client.manager = new Manager({
    // The nodes to connect to, optional if using default lavalink options
    nodes,
    plugins: [
        new filter()
    ],
    // Method to send voice data to Discord
    send: (id, payload) => {
        const guild = client.guilds.cache.get(id);
        // NOTE: FOR ERIS YOU NEED JSON.stringify() THE PAYLOAD
        if (guild) guild.shard.send(payload);
    }
});

client.manager.on("nodeConnect", node => {
    console.log(`Node "${node.options.identifier}" connected.`)
})

client.manager.on("trackStart", (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    // Send a message when the track starts playing with the track name and the requester's Discord tag, e.g. username#discriminator
    channel.send(`Now playing: \`${track.title}\`, requested by \`${track.requester.tag}\`.`);
});

client.manager.on("queueEnd", player => {
    const channel = client.channels.cache.get(player.textChannel);
    channel.send("Queue has ended.");
    player.destroy();
});

client.login(token)