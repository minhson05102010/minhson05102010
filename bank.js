const fs = require('fs');

module.exports.config = {
    name: "bank",
    version: "4.0.0",
    hasPermssion: 0,
    credits: "Heo Rừng",
    description: "Heo Rừng Pro Max",
    commandCategory: "ngân hàng",
    usages: "[deposit|withdraw|balance|borrow|repay|debt|top|info] [amount]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "axios": ""
    }
};

module.exports.onLoad = async () => {
    const { existsSync, writeFileSync, mkdirSync } = require("fs-extra");
    const { join } = require("path");
    const dir = __dirname + `/banking`;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const pathData = join(__dirname + '/banking/banking.json');
    if (!existsSync(pathData)) return writeFileSync(pathData, "[]", "utf-8");
    const bankConfigPath = join(__dirname, 'banking', 'bankConfig.json');
    if (!existsSync(bankConfigPath)) {
        const defaultConfig = {
            maxBorrow: 1000,
            debtRate: 0.1,
            lastTotalMoney: 0,
            checkTime: new Date().toLocaleString()
        };
        writeFileSync(bankConfigPath, JSON.stringify(defaultConfig, null, 4), 'utf-8');
    }
    return;
}

module.exports.run = async function ({ api, event, args, Currencies, Users, Threads }) {
    const { threadID, messageID, senderID } = event;
    const { readFileSync, writeFileSync } = require("fs-extra");
    const { join } = require("path");
    const pathData = join(__dirname + '/banking/banking.json');
    const bankingData = JSON.parse(readFileSync(pathData, "utf-8"));
    const bankConfigPath = join(__dirname, 'banking', 'bankConfig.json');
    let bankConfig = JSON.parse(readFileSync(bankConfigPath, 'utf-8'));
    var lastTimeCheck = bankConfig.checkTime;

    const userIndex = bankingData.findIndex(user => user.id == senderID);
    if (userIndex == -1) {
        bankingData.push({
            id: senderID,
            balance: 0,
            debt: 0,
            dueDate: null
        });
    }

    const user = bankingData.find(user => user.id == senderID);

    const action = args[0];
    const amount = parseInt(args[1]);
    const penaltyRate = 0.1; // 10% penalty for overdue debt

    switch (action) {
        case "deposit":
            if (isNaN(amount) || amount <= 0) return api.sendMessage("❌ Số tiền không hợp lệ.", threadID, messageID);
            const userMoney = (await Currencies.getData(senderID)).money;
            if (userMoney < amount) return api.sendMessage("❌ Bạn không có đủ tiền để gửi.", threadID, messageID);
            user.balance += amount;
            await Currencies.decreaseMoney(senderID, amount);
            api.sendMessage(`🏦 Heo Rừng's Bank 🏦\n_______________\n✅ Bạn đã gửi ${amount}$ vào ngân hàng. 💰 Số dư hiện tại: ${user.balance}$`, threadID, messageID);
            break;
        case "withdraw":
            if (isNaN(amount) || amount <= 0) return api.sendMessage("❌ Số tiền không hợp lệ.", threadID, messageID);
            if (user.balance < amount) return api.sendMessage("❌ Số dư trong ngân hàng không đủ.", threadID, messageID);
            user.balance -= amount;
            await Currencies.increaseMoney(senderID, amount);
            api.sendMessage(`🏦 Heo Rừng's Bank 🏦\n_______________\n✅ Bạn đã rút ${amount}$ từ ngân hàng. 💰 Số dư hiện tại: ${user.balance}$`, threadID, messageID);
            break;
        case "balance":
            const userData = await Users.getData(senderID);
            const userName = userData.name;
            const debt = user.debt || 0;
            const dueDate = user.dueDate || 0;
            const timeRemaining = dueDate ? Math.max(0, dueDate - Date.now()) : 0;
            const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
            const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);

            api.sendMessage(
                `🏦 Heo Rừng's Bank 🏦\n_______________\n` +
                `📊 Thông tin tài khoản của bạn:\n` +
                `👤 Tên người dùng: ${userName}\n` +
                `💰 Số dư hiện tại: ${user.balance}$\n` +
                `💸 Số nợ hiện tại: ${debt}$\n` +
                `⏳ Thời gian còn lại để trả nợ: ${days} ngày, ${hours} giờ, ${minutes} phút, ${seconds} giây`,
                threadID,
                messageID
            );
            break;
        case "top":
            try {
                let all = await Currencies.getAll(['userID', 'money']);
                all.sort((a, b) => b.money - a.money);
                let num = 0;
                let totalMoney = 0;
                let msg = {
                    body: `🏦 Heo Rừng's Bank 🏦\n_______________\n🏆 Top 10 người giàu nhất:\n`,
                };
                for (var i = 0; i < 10; i++) { //thay vào số line cần check	
                    let level = all[i].money;
                    let name = (await Users.getData(all[i].userID)).name;
                    num += 1;
                    msg.body += '\n' + num + '. ' + name + ': ' + level + "$";
                }
                // Calculate total money and count users
                for (let user of all) {
                    totalMoney += user.money;
                }
                const userCount = all.length;
                msg.body += `\n_______________\n💰 Tổng số tiền hiện tại của ${userCount} người dùng: ${totalMoney}$`;
                console.log(msg.body);
                api.sendMessage(msg, event.threadID, event.messageID);
            } catch (error) {
                console.log(error);
            }
            break;
        case "info":
            try {
                let all = await Currencies.getAll(['userID', 'money']);
                let totalMoney = 0;
                for (let user of all) {
                    totalMoney += user.money;
                }
                const percentageIncrease = ((totalMoney - bankConfig.lastTotalMoney) / bankConfig.lastTotalMoney) * 100;
                var increaseNoti = '';
                if (percentageIncrease > 0) increaseNoti = `📈 +${percentageIncrease.toFixed(2)}%`;
                if (percentageIncrease == 0) increaseNoti = `💹 Không thay đổi`;
                else if (percentageIncrease < 0) increaseNoti = `📉 -${Math.abs(percentageIncrease).toFixed(2)}%`;
                const currentTime = new Date();
                const lastCheckTime = new Date(bankConfig.checkTime);
                const timeDifference = currentTime - lastCheckTime;
                const diffDays = Math.floor(timeDifference / (24 * 60 * 60 * 1000));
                const diffHours = Math.floor((timeDifference % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                const diffMinutes = Math.floor((timeDifference % (60 * 60 * 1000)) / (60 * 1000));
                const diffSeconds = Math.floor((timeDifference % (60 * 1000)) / 1000);
                var adminName = (await Users.getData(bankConfig.admin)).name;


                bankConfig.lastTotalMoney = totalMoney;
                bankConfig.checkTime = currentTime;
                writeFileSync(bankConfigPath, JSON.stringify(bankConfig, null, 4));

                api.sendMessage(
                    `🏦 Heo Rừng's Bank 🏦\n_______________\n` +
                    `💵 Cho vay tối đa: ${bankConfig.maxBorrow}$\n` +
                    `👤 Người điều hành ngân hàng: ${adminName}\n` +
                    `💸 Lãi suất: ${bankConfig.debtRate * 100}%\n` +
                    `📈 Tổng tiền lưu hành: ${totalMoney}$\n` +
                    `📊 Thống kê: ${increaseNoti}\n` +
                    `⏳ Thời gian từ lần check trước: ${diffDays}:${diffHours}:${diffMinutes}:${diffSeconds}`,
                    threadID,
                    messageID
                );
            } catch (error) {
                console.log(error);
                api.sendMessage("❌ Đã xảy ra lỗi khi kiểm tra thông tin ngân hàng.", threadID, messageID);
            }
            break;
        case "borrow":
            if (isNaN(amount) || amount <= 0) return api.sendMessage("❌ Số tiền không hợp lệ.", threadID, messageID);
            if (user.debt >= bankConfig.maxBorrow) return api.sendMessage("❌ Bạn không thể vay thêm vì số nợ đã vượt mức cho phép.", threadID, messageID);
            if (amount > bankConfig.maxBorrow) return api.sendMessage(`❌ Bạn chỉ có thể vay tối đa ${bankConfig.maxBorrow}`, threadID, messageID);
            user.debt += amount;
            user.dueDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
            await Currencies.increaseMoney(senderID, amount);
            const dueDateFormatted = new Date(user.dueDate).toLocaleDateString('vi-VN');
            api.sendMessage(`🏦 Heo Rừng's Bank 🏦\n_______________\n✅ Bạn đã vay ${amount}$. 💸 Nợ hiện tại: ${user.debt}$. ⏳ Hạn trả nợ: ${dueDateFormatted}`, threadID, messageID);
            break;
        case "repay":
            if (isNaN(amount) || amount <= 0) return api.sendMessage("Số tiền không hợp lệ.", threadID, messageID);
            const userCurrentMoney = (await Currencies.getData(senderID)).money;
            if (userCurrentMoney < amount) return api.sendMessage("Bạn không có đủ tiền để trả nợ.", threadID, messageID);
            if (user.debt < amount) return api.sendMessage("Số tiền trả nợ vượt quá số nợ hiện tại.", threadID, messageID);
            if (Date.now() > user.dueDate) {
                const penalty = user.debt * penaltyRate;
                user.debt += penalty;
                api.sendMessage(`Bạn đã bị phạt ${penalty}$ vì không trả nợ đúng hạn. Nợ hiện tại: ${user.debt}$`, threadID, messageID);
            }
            user.debt -= amount;
            await Currencies.decreaseMoney(senderID, amount);
            api.sendMessage(`Bạn đã trả ${amount}$. Nợ hiện tại: ${user.debt}$`, threadID, messageID);
            break;
        case "check-debt":
            if (senderID !== bankConfig.admin) return api.sendMessage("❌ Bạn không có quyền sử dụng lệnh này.", threadID, messageID);
            try {
                const bankingData = JSON.parse(fs.readFileSync(pathData, 'utf8'));
                const overdueUsers = bankingData.filter(user => user.debt > 0 && new Date(user.dueDate) < new Date());

                if (overdueUsers.length === 0) {
                    api.sendMessage("Không có người dùng nào đang quá hạn nợ.", threadID, messageID);
                } else {
                    let message = "Danh sách người dùng quá hạn nợ:\n";
                    for (let i = 0; i < overdueUsers.length; i++) {
                        let user = overdueUsers[i];
                        let name = (await Users.getData(overdueUsers[i].id)).name;
                        let num = i + 1;
                        message += `${num}. ${name} - ${user.debt}$ - ${new Date(user.dueDate).toLocaleString('vi-VN')}\n`;
                    };
                    message += "\nGửi 'confirm' để trừng phạt những người quá hạn nợ.";
                    api.sendMessage(message, threadID, (err, info) => {
                        global.client.handleReply.push({
                            type: "clearDebt",
                            name: this.config.name,
                            messageID: info.messageID,
                            author: senderID,
                            overdueUsers: overdueUsers
                        });
                    });
                }
            } catch (error) {
                console.log(error);
                api.sendMessage("❌ Đã xảy ra lỗi khi kiểm tra nợ quá hạn.", threadID, messageID);
            }
            break;
        case "debt":
            if (user.debt === 0) {
                api.sendMessage("💰 Bạn không có nợ.", threadID, messageID);
            } else {
                let overdueMessage = `💰 Nợ hiện tại của bạn là: ${user.debt}$\n📅 Hạn trả nợ: ${new Date(user.dueDate).toLocaleString('vi-VN')}`;
                if (new Date(user.dueDate) < new Date()) {
                    let overdueDays = Math.floor((Date.now() - new Date(user.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                    overdueMessage += `\n⚠️ Bạn đã quá hạn ${overdueDays} ngày.`;
                }
                api.sendMessage(overdueMessage, threadID, messageID);
            }
            break;
        case "top-allthread":
            try {
                api.getThreadList(100, null, ["INBOX"]).then(threads => {
                    const threadAssetsPromises = threads.map(thread => {
                        const threadID = thread.threadID;
                        const participants = thread.participantIDs;
                        let totalAssets = 0;
        
                        const participantPromises = participants.map(userID => {
                            return Currencies.getData(userID).then(userData => {
                                totalAssets += userData.money || 0;
                            });
                        });
        
                        return Promise.all(participantPromises).then(() => {
                            return { threadID, totalAssets };
                        });
                    });
        
                    return Promise.all(threadAssetsPromises);
                }).then(threadAssets => {
                    const topThreads = threadAssets.sort((a, b) => b.totalAssets - a.totalAssets).slice(0, 5);
                    let topMessage = "🏦 Heo Rừng's Bank 🏦\n_______________\n🏆 Top 5 box giàu nhất:\n";
        
                    const threadInfoPromises = topThreads.map(thread => {
                        return api.getThreadInfo(thread.threadID).then(threadInfo => {
                            return { threadID: thread.threadID, threadName: threadInfo.threadName, totalAssets: thread.totalAssets };
                        });
                    });
        
                    return Promise.all(threadInfoPromises).then(topThreadsInfo => {
                        for (let i = 0; i < topThreadsInfo.length; i++) {
                            const thread = topThreadsInfo[i];
                            topMessage += `#${i + 1}: ${thread.threadName}\nTid: ${thread.threadID}\n💵: ${thread.totalAssets}$\n\n`;
                        }
                        api.sendMessage(topMessage, threadID, messageID);
                    });
                }).catch(error => {
                    console.log(error);
                    api.sendMessage("❌ Đã xảy ra lỗi khi kiểm tra thông tin top threads.", threadID, messageID);
                });
            } catch (error) {
                console.log(error);
                api.sendMessage("❌ Đã xảy ra lỗi khi kiểm tra thông tin top threads.", threadID, messageID);
            }
            break;
        default:
            api.sendMessage("Vui lòng sử dụng lệnh: bank [deposit|withdraw|balance|borrow|repay|debt|top|info] [amount]", threadID, messageID);
            break;
    }

    writeFileSync(pathData, JSON.stringify(bankingData, null, 4));
}



module.exports.handleReply = async ({ event, api, handleReply, Currencies, getText, Users, args }) => {
    try {
        const { readFileSync, writeFileSync } = require("fs-extra");
        const { join } = require("path");
        const bankConfigPath = join(__dirname, 'banking', 'bankConfig.json');
        let bankConfig = JSON.parse(readFileSync(bankConfigPath, 'utf-8'));
        const pathData = join(__dirname + '/banking/banking.json');
        const bankingData = JSON.parse(readFileSync(pathData, "utf-8"));
        switch (handleReply.type) {
            case "clearDebt":
                if (event.senderID !== handleReply.author) return;
                const selectedNumbers = event.body.split(' ').map(num => parseInt(num.trim()));
                let punishedUsers = [];
                for (let num of selectedNumbers) {
                    if (num > 0 && num <= handleReply.overdueUsers.length) {
                        let user = handleReply.overdueUsers[num - 1];
                        let overdueDays = Math.floor((Date.now() - new Date(user.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                        let penalty = user.debt + Math.round(user.debt * bankConfig.debtRate * overdueDays);
                        await Currencies.decreaseMoney(user.id, penalty);
                        user.debt = 0;
                        user.dueDate = null;
                        punishedUsers.push(user.name);
                    }
                }
                api.unsendMessage(handleReply.messageID);
                // Update the bankingData with the new debt values
                for (let user of handleReply.overdueUsers) {
                    let userData = bankingData.find(u => u.id === user.id);
                    if (userData) {
                        userData.debt = user.debt;
                        userData.dueDate = user.dueDate;
                    }
                }
                // Write the updated bankingData back to the file
                writeFileSync(pathData, JSON.stringify(bankingData, null, 4));
                api.sendMessage(`✅Hoàn tất quá trình thu hồi nợ!!!`, event.threadID, event.messageID);
                break;
        }
    } catch (error) {
        console.log(error);
        api.sendMessage("❌ Đã xảy ra lỗi khi thu hồi nợ.", event.threadID, event.messageID);
    }
}