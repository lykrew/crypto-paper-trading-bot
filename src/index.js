require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        '🚀 Добро пожаловать в Crypto Paper Trading Bot!\n\nУ тебя есть 1000$ виртуальных денег.'
    );
});

console.log('Bot is running...');
