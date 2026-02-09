require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getPrice } = require('./services/binance_service');

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

console.log('Bot is running...');
