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
    const symbol = match[1].toUpperCase();
    const amount = Number(match[2]);

    try {
        const price = await getPrice(symbol);
        const user = getUser(chatId);

        if (user.balance < amount) {
            return bot.sendMessage(chatId, 'Недостаточно средств 💸');
        }

        const quantity = amount / price;

        user.balance -= amount;

        if (!user.portfolio[symbol]) {
            user.portfolio[symbol] = 0;
        }

        user.portfolio[symbol] += quantity;

        updateUser(chatId, user);

        bot.sendMessage(
            chatId,
            `✅ Куплено ${quantity.toFixed(6)} ${symbol}\nОстаток: ${user.balance.toFixed(2)}$`
        );
    } catch (e) {
        const errorMsg = e.response?.data?.msg || 'Не удалось получить данные с Binance.';
        bot.sendMessage(chatId, `❌ Ошибка: ${errorMsg}`);
    }
});

bot.onText(/\/portfolio/, async (msg) => {
    const chatId = msg.chat.id;
    const user = getUser(chatId);

    let text = `💼 Твой портфель:\nБаланс: ${user.balance.toFixed(2)}$\n\n`;
    let totalValue = user.balance;

    for (const symbol in user.portfolio) {
        try {
            const quantity = user.portfolio[symbol];
            const price = await getPrice(symbol);

            const value = quantity * price;
            totalValue += value;

            text += `${symbol}: ${quantity.toFixed(6)} ≈ ${value.toFixed(2)}$\n`;
        } catch (e) {
            text += `${symbol}: ошибка получения цены\n`;
        }
    }
    text += `\n💰 Общая стоимость портфеля: ${totalValue.toFixed(2)}$`;

    bot.sendMessage(chatId, text);
});

console.log('Bot is running...');
