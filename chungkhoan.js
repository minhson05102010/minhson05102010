const config = {
    name: "chungkhoan",
    aliases: ["ck"],
    description: "Chơi chứng khoán: mua/bán cổ phiếu để kiếm tiền",
    permissions: [2],
    credits: "XaviaTeam",
    extra: {
        stocks: [
            { name: "Tesla Inc", symbol: "TSLA" },
            { name: "Netflix Inc", symbol: "NFLX" },
            { name: "Apple Inc", symbol: "AAPL" },
            { name: "Amazon.com Inc", symbol: "AMZN" }
        ],
        minLoss: 100, // Tối thiểu mất tiền
        maxLoss: 300, // Tối đa mất tiền
        minGain: 100, // Tối thiểu kiếm tiền
        maxGain: 300  // Tối đa kiếm tiền
    }
};

const langData = {
    "en_US": {
        "stock.invalidCommand": "Invalid command. Use the format: `{prefix}chungkhoan <stock_symbol> <buy|sell>`",
        "stock.noStockSelected": "Please select a stock to trade.",
        "stock.noAction": "Please specify an action: 'buy' or 'sell'.",
        "stock.tradeResult": "You {action} {stockName}. {resultText} You {actionEffect} {amount}XC!",
        "stock.failed": "Failed to process your trade."
    },
    "vi_VN": {
        "stock.invalidCommand": "Lệnh không hợp lệ. Sử dụng định dạng: `{prefix}chungkhoan <mã cổ phiếu> <mua|bán>`",
        "stock.noStockSelected": "Vui lòng chọn cổ phiếu để giao dịch.",
        "stock.noAction": "Vui lòng chỉ định hành động: 'mua' hoặc 'bán'.",
        "stock.tradeResult": "Bạn đã {action} {stockName}. {resultText} Bạn {actionEffect} {amount}XC!",
        "stock.failed": "Không thể xử lý giao dịch của bạn."
    }
};

async function onCall({ message, args, extra, getLang }) {
    const { Users } = global.controllers;
    const { stocks, minLoss, maxLoss, minGain, maxGain } = extra;

    try {
        if (args.length < 2) {
            return message.reply(
                getLang("stock.invalidCommand", { prefix: global.config.prefix })
            );
        }

        const stockSymbol = args[0]?.toUpperCase(); // Mã cổ phiếu
        const action = args[1]?.toLowerCase(); // "mua" hoặc "bán"

        const stock = stocks.find(s => s.symbol === stockSymbol);
        if (!stock) {
            return message.reply(
                getLang("stock.noStockSelected")
            );
        }
        if (!["buy", "sell", "mua", "bán"].includes(action)) {
            return message.reply(
                getLang("stock.noAction")
            );
        }

        const marketTrend = Math.random() > 0.5 ? "up" : "down"; // 
        let resultText = "";
        let actionEffect = "";
        let amount = 0;

        if (["buy", "mua"].includes(action)) {
            if (marketTrend === "up") {
                resultText = "Thị trường tăng.";
                actionEffect = "kiếm được";
                amount = global.random(minGain, maxGain);
                await Users.increaseMoney(message.senderID, amount);
            } else {
                resultText = "Thị trường giảm.";
                actionEffect = "mất";
                amount = global.random(minLoss, maxLoss);
                await Users.decreaseMoney(message.senderID, amount);
            }
        } else if (["sell", "bán"].includes(action)) {
            if (marketTrend === "down") {
                resultText = "Thị trường giảm.";
                actionEffect = "kiếm được";
                amount = global.random(minGain, maxGain);
                await Users.increaseMoney(message.senderID, amount);
            } else {
                resultText = "Thị trường tăng.";
                actionEffect = "mất";
                amount = global.random(minLoss, maxLoss);
                await Users.decreaseMoney(message.senderID, amount);
            }
        }

        const imagePath = marketTrend === "up" ? "path/to/green_arrow.png" : "path/to/red_arrow.png";

        message.reply({
            body: getLang("stock.tradeResult", {
                action,
                stockName: stock.name,
                resultText,
                actionEffect,
                amount
            }),
            attachment: global.fs.createReadStream(imagePath)
        });

    } catch (error) {
        console.error(error);
        message.reply(getLang("stock.failed"));
    }
}

export default {
    config,
    langData,
    onCall
};
