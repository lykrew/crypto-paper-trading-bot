require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getPrice } = require('./services/binance_service');
const { getUser, updateUser } = require('./services/user_storage.js');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const user = getUser(chatId);

    bot.sendMessage(
        chatId,
        `🚀 Добро пожаловать в Crypto Paper Trading Bot!

Твой текущий баланс: ${user.balance.toFixed(2)}$`
    );
});


bot.onText(/\/price (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const symbol = match[1].toUpperCase();

    try {
        const rawPrice = await getPrice(symbol);
        const price = Number(rawPrice);
        bot.sendMessage(chatId, `💰 Цена ${symbol}: ${price} USDT`);
    } catch (error) {
        console.log('PRICE ERROR:', error.response?.data || error.message);
        const errorMsg = error.response?.data?.msg || 'Ошибка запроса.';
        bot.sendMessage(chatId, `❌ ${errorMsg}`);
    }
})

bot.onText(/\/buy (.+) (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const symbolInput = match[1];
    const amount = Number(match[2]);

    try {
        const price = await getPrice(symbolInput);
        const user = getUser(chatId);

        if (user.balance < amount) {
            return bot.sendMessage(chatId, 'Недостаточно средств 💸');
        }

        const symbol = symbolInput.toUpperCase().endsWith('USDT')
            ? symbolInput.toUpperCase()
            : symbolInput.toUpperCase() + 'USDT';

        const quantity = amount / price;

        user.balance -= amount;

        if (!user.portfolio[symbol]) {
            user.portfolio[symbol] = {
                quantity: 0,
                totalSpent: 0,
                avgPrice: 0
            };
        }

        // обновляем данные
        user.portfolio[symbol].quantity += quantity;
        user.portfolio[symbol].totalSpent += amount;
        user.portfolio[symbol].avgPrice =
            user.portfolio[symbol].totalSpent /
            user.portfolio[symbol].quantity;

        updateUser(chatId, user);

        bot.sendMessage(
            chatId,
            `✅ Куплено ${quantity.toFixed(6)} ${symbol}
Средняя цена: ${user.portfolio[symbol].avgPrice.toFixed(2)}$
Баланс: ${user.balance.toFixed(2)}$`
        );

    } catch (e) {
        const errorMsg = e.response?.data?.msg || 'Ошибка покупки';
        bot.sendMessage(chatId, `❌ ${errorMsg}`);
    }
});

bot.onText(/\/portfolio/, async (msg) => {
    const chatId = msg.chat.id;
    const user = getUser(chatId);

    let text = `💼 Твой портфель:\nБаланс: ${user.balance.toFixed(2)}$\n\n`;
    let totalValue = user.balance;

    for (const symbol in user.portfolio) {
        try {
            const data = user.portfolio[symbol];
            const currentPrice = await getPrice(symbol);

            const currentValue = data.quantity * currentPrice;
            const pnl = currentValue - data.totalSpent;
            const pnlPercent = (pnl / data.totalSpent) * 100;

            totalValue += currentValue;

            text += `${symbol}
Количество: ${data.quantity.toFixed(6)}
Средняя цена: ${data.avgPrice.toFixed(2)}$
Текущая цена: ${currentPrice.toFixed(2)}$
PnL: ${pnl.toFixed(2)}$ (${pnlPercent.toFixed(2)}%)

\n`;

        } catch (e) {
            text += `${symbol}: ошибка получения цены\n\n`;
        }
    }

    text += `💰 Общая стоимость портфеля: ${totalValue.toFixed(2)}$`;

    bot.sendMessage(chatId, text);
});

console.log('Bot is running...');
