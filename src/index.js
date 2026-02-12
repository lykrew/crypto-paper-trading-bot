require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getPrice } = require('./services/binance_service');
const { getUser, updateUser } = require('./services/user_storage.js');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        '🚀 Добро пожаловать в Crypto Paper Trading Bot!\n\nУ тебя есть 1000$ виртуальных денег.'
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
        bot.sendMessage(chatId, 'Ошибка. Возможно, такой монеты не существует.')
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
        bot.sendMessage(chatId, 'Ошибка при покупке.')
    }
});



console.log('Bot is running...');
