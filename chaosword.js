try {
    String.prototype.shuffle = function () {
        var a = this.split(""),
            n = a.length;

        for (var i = n - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a.join("");
    }
    const path = require("path");
    const axios = require("axios");
    const fs = require("fs-extra")
    module.exports.config = {
        name: "chaosword",
        version: "1.0.0",
        hasPermssion: 0,
        credits: "Niio-team - Heo Rừng",
        description: "Siêu cấp tối thượng siêu xáo trộn từ",
        commandCategory: "Heo Rừng Series",
        usages: "[]",
        cooldowns: 0
    };
    module.exports.checkPath = function (type, senderID) {
        const pathUser = path.join(__dirname, 'chaosword', 'datauser', `${senderID}.json`);
        const pathUser_1 = require("./chaosword/datauser/" + senderID + '.json');
        if (type == 3) return pathUser
        if (type == 4) return pathUser_1
    }

    module.exports.onLoad = async function ({ api, args, Users, Currencies }) {
        try {
            const config = require("./chaosword/config.json");
            const data = require("./chaosword/data.json");
            var mode = "";
            var turn = config.turnEnd;
            var i = 0;
            if (config.gamemode == 1) mode = "Newborn";///3-6
            if (config.gamemode == 2) mode = "Classic";///7-10
            if (config.gamemode == 3) mode = "Expert";///11-14
            if (config.gamemode == 4) mode = "Master";///15-18
            if (config.gamemode == 5) mode = "Incomparable";///19-22
            if (config.gamemode == 6) mode = "Nightmare";///23-26
            if (config.gamemode == 7) mode = "Chaos";///27-30
            if (config.gamemode == 8) mode = "True Annihilation";///31-34
            if (config.gamemode == 9) mode = "Absolute Extinction";///35-38
            if (config.gamemode == 10) mode = "Anti-Humanity Mode";///38+
            msg = "";

            if (config.status == true && i <= turn) {
                try {
                    msg = ""
                    setInterval(async () => {
                        let gamemode = config.gamemode;
                        var quiz = data.filter(i => i.modeDifficulty == gamemode);
                        var quizGame = quiz[Math.floor(Math.random() * quiz.length)];
                        i += 1;
                        console.log(i);
                        
                        if (config.status == true) {
                            global.data.allThreadID.forEach(i =>
                                api.sendMessage(`(• CHAOSWORD •)\n_______________\nDifficulty: ${mode}\nRank: ${quizGame.difficultRank}\nQuestion: ${quizGame.answer.shuffle()}\n_____________\nReply this message to answer, you only have 30 seconds!!!`, i, (error, info) => {
                                    global.client.handleReply.push({
                                        type: "quiz",
                                        name: this.config.name,
                                        answerCorrect: quizGame.answer,
                                        point: quizGame.difficultRank,
                                        messageID: info.messageID,
                                        timeSend: Date.now()
                                    });
                                    setInterval(async () => { api.unsendMessage(info.messageID) }, config.delayUnsend);
                                })
                            );

                        }

                    }, config.delay);


                } catch (error) {
                    console.log(error)
                }
            };

            fs.writeFileSync(__dirname + "/chaosword/config.json", JSON.stringify(config, null, 4));
        } catch (error) {
            console.log(error)
        }

    }

    module.exports.run = async function ({
        api,
        event,
        args,
        Users,
        Currencies
    }) {
        const {
            threadID,
            messageID,
            senderID
        } = event;
        const { readFileSync, writeFileSync, existsSync, createReadStream, readdirSync } = require("fs-extra");
        const pathData = path.join(__dirname, 'chaosword', 'datauser', `${senderID}.json`);
        switch (args[0]) {
            case 'switch':
            case '-s': {
                try {
                    if (event.senderID != 100037211391552) return api.sendMessage(`» You are not OLD enough to use this !!!`, event.threadID, event.messageID);
                    const config = require("./chaosword/config.json");
                    const serverStatus = config.status;
                    if (serverStatus == false) {
                        config.status = true;
                        fs.writeFileSync(__dirname + "/chaosword/config.json", JSON.stringify(config, null, 4));
                        var mode = "";
                        if (config.gamemode == 1) mode = "Newborn";///3-6
                        if (config.gamemode == 2) mode = "Classic";///7-10
                        if (config.gamemode == 3) mode = "Expert";///11-14
                        if (config.gamemode == 4) mode = "Master";///15-18
                        if (config.gamemode == 5) mode = "Incomparable";///19-22
                        if (config.gamemode == 6) mode = "Nightmare";///23-26
                        if (config.gamemode == 7) mode = "Chaos";///27-30
                        if (config.gamemode == 8) mode = "True Annihilation";///31-34
                        if (config.gamemode == 9) mode = "Absolute Extinction";///35-38
                        if (config.gamemode == 10) mode = "Anti-Humanity Mode";///38+
                        return api.sendMessage(`Game Start!!!\n- Difficulty: ${mode}\n`, threadID, messageID);
                    };
                    if (serverStatus == true) {
                        config.status = false;
                        fs.writeFileSync(__dirname + "/chaosword/config.json", JSON.stringify(config, null, 4));
                        return api.sendMessage(`Game Disabled!!!`, threadID, messageID);
                    }
                } catch (error) {
                    console.log(error)
                }

            }
                break
            case 'config':
            case '-c': {
                try {
                    if (event.senderID != 100037211391552) return api.sendMessage(`» You are not OLD enough to use this !!!`, threadID, messageID);
                    const config = require("./chaosword/config.json");
                    var mode = "";
                    if (config.gamemode == 1) mode = "Newborn";///3-6
                    if (config.gamemode == 2) mode = "Classic";///7-10
                    if (config.gamemode == 3) mode = "Expert";///11-14
                    if (config.gamemode == 4) mode = "Master";///15-18
                    if (config.gamemode == 5) mode = "Incomparable";///19-22
                    if (config.gamemode == 6) mode = "Nightmare";///23-26
                    if (config.gamemode == 7) mode = "Chaos";///27-30
                    if (config.gamemode == 8) mode = "True Annihilation";///31-34
                    if (config.gamemode == 9) mode = "Absolute Extinction";///35-38
                    if (config.gamemode == 10) mode = "Anti-Humanity Mode";///38+
                    var unsendMode = "";
                    if (config.unsendMode == true) mode = "Enabled";///3-6
                    if (config.unsendMode == false) mode = "Disabled";///7-10
                    api.sendMessage(`(• CHAOSWORD CONFIG •)\n- Current Difficulty: ${mode}\n- Level: ${config.gamemode}\n- Unsend: ${config.delayUnsend / 1000}s\n- Delay: ${config.delay / 1000}s\n______________\nReply tin nhắn này với cú pháp như:\n+ difficulty + số: thay đổi độ khó từ level 1 đến 4.\n+ set + số: điều chỉnh thời gian trả lời (giây).\n+ delay + số: điều chỉnh thời gian tung câu hỏi (giây)`, threadID, (error, info) => {
                        global.client.handleReply.push({
                            type: "quizConfig",
                            name: this.config.name,
                            author: event.senderID,
                            messageID: info.messageID
                        });
                    });
                } catch (error) {
                    console.log(error)
                }

            }
                break
            default: {
                api.sendMessage("(• CHAOSWORD •)\n_______________\nShuffle word phiên bản siêu cấp tối thượng của Heo Rừng\n- config: mở bảng config của game.\n- switch: Bật/Tắt game. ", threadID, messageID)
            }
                break
        }///Lv


    }
    module.exports.handleReply = async ({ event, api, handleReply, Currencies, getText, Users, args }) => {
        try {
            const { threadID, messageID, senderID } = event;
            const name = (await Users.getData(senderID)).name
            const config = require("./chaosword/config.json");
            const { readFileSync, writeFileSync, existsSync, createReadStream, readdirSync } = require("fs-extra")
            var mode = "";
            if (config.gamemode == 1) mode = "Newborn";///3-6
            if (config.gamemode == 2) mode = "Classic";///7-10
            if (config.gamemode == 3) mode = "Expert";///11-14
            if (config.gamemode == 4) mode = "Master";///15-18
            if (config.gamemode == 5) mode = "Incomparable";///19-22
            if (config.gamemode == 6) mode = "Nightmare";///23-26
            if (config.gamemode == 7) mode = "Chaos";///27-30
            if (config.gamemode == 8) mode = "True Annihilation";///31-34
            if (config.gamemode == 9) mode = "Absolute Extinction";///35-38
            if (config.gamemode == 10) mode = "Anti-Humanity Mode";///38+
            switch (handleReply.type) {
                case "quiz":
                    if (event.body == handleReply.answerCorrect) {
                        var pointGained = handleReply.point;
                        await Currencies.increaseMoney(senderID, parseInt(Math.round(pointGained * 1000)));
                        api.sendMessage(`Congratulations!!! ${name} answered correctly and gained ${Math.round(pointGained * 1000)}$`, threadID, messageID);
                        api.unsendMessage(handleReply.messageID);
                        break
                    }
                    else return api.sendMessage("Wrong!!!", threadID, messageID);
                case "quizConfig":
                    switch (event.args[0]) {
                        case "difficulty":
                            config.gamemode = event.args[1] * 1;
                            if (event.args[1]*1 > 4) config.gamemode = 4;
                            api.sendMessage(`Difficulty has changed to "Level ${config.gamemode}"`, threadID, messageID);
                            fs.writeFileSync(__dirname + "/chaosword/config.json", JSON.stringify(config, null, 4));
                            break;
                        case "set":
                            var unsendTime = event.args[1] * 1;
                            config.delayUnsend = unsendTime * 1000;
                            api.sendMessage(`Unsending Time has changed to "${unsendTime}s"`, threadID, messageID);
                            fs.writeFileSync(__dirname + "/chaosword/config.json", JSON.stringify(config, null, 4));
                            break;
                        case "delay":
                            var delayTime = event.args[1] * 1;
                            config.delay = delayTime * 1000;
                            api.sendMessage(`Delay Time has changed to "${delayTime}s"`, threadID, messageID);
                            fs.writeFileSync(__dirname + "/chaosword/config.json", JSON.stringify(config, null, 4));
                            break;
                        case "unsend":
                            switch (event.args[1]) {
                                case "on":
                                    config.unsendMode = true;
                                    api.sendMessage(`Unsend Mode enabled.`, threadID, messageID);
                                    break;

                                case "off":
                                    config.unsendMode = false;
                                    api.sendMessage(`Unsend Mode disabled.`, threadID, messageID);
                                    break;
                            }
                            fs.writeFileSync(__dirname + "/chaosword/config.json", JSON.stringify(config, null, 4));
                            break;

                        default:
                            break;
                    }
            }
        } catch (error) {
            console.log(error)
        }

    }
} catch (error) {
    console.log(error);
}