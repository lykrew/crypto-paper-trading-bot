require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getPrice } = require('./services/binance_service');
const { getUser, updateUser } = require('./services/user_storage.js');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

function normalizeSymbol(symbolInput) {
    const s = symbolInput.trim().toUpperCase();
    if (!s) {
        return null;
    }
    return s.endsWith('USDT') ? s : s + 'USDT';
}

function parsePositiveNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
}

bot.setMyCommands([
    { command: 'start', description: 'Запустить бота' },
    { command: 'price', description: 'Узнать цену монеты (/price BTC)' },
    { command: 'buy', description: 'Купить монету (/buy BTC 100)' },
    { command: 'sell', description: 'Продать монету (/sell BTC 100 или /sell BTC all)' },
    { command: 'portfolio', description: 'Показать портфель' },
    { command: 'sell_all', description: 'Закрыть все позиции (/sell all)' },
  ]);

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
    const symbolInput = (match[1] || '').trim();

    if (!symbolInput) {
        return bot.sendMessage(chatId, '❌ Укажи символ, например: /price BTC');
    }

    const displaySymbol = symbolInput.toUpperCase();
    const symbol = normalizeSymbol(symbolInput);

    try {
        const price = await getPrice(symbol);
        bot.sendMessage(chatId, `💰 Цена ${displaySymbol}: ${price} USDT`);
    } catch (error) {
        console.log('PRICE ERROR:', error.response?.data || error.message);
        const errorMsg = error.response?.data?.msg || 'Ошибка запроса.';
        bot.sendMessage(chatId, `❌ ${errorMsg}`);
    }
})

bot.onText(/\/buy (.+) (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const rawSymbolInput = match[1] || '';
    const symbolInput = rawSymbolInput.trim();
    const amount = parsePositiveNumber(match[2]);

    if (!symbolInput) {
        return bot.sendMessage(chatId, '❌ Укажи монету, например: /buy BTC 100');
    }

    if (amount === null) {
        return bot.sendMessage(chatId, '❌ Неверная сумма. Пример: /buy BTC 100');
    }

    try {
        const symbol = normalizeSymbol(symbolInput);
        const price = await getPrice(symbol);
        const user = getUser(chatId);

        if (user.balance < amount) {
            return bot.sendMessage(chatId, 'Недостаточно средств 💸');
        }

        const quantity = amount / price;

        user.balance -= amount;

        if (!user.portfolio[symbol]) {
            user.portfolio[symbol] = {
                quantity: 0,
                totalSpent: 0,
                avgPrice: 0
            };
        }

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

// Продать все позиции во всём портфеле: /sell all
bot.onText(/\/sell all/, async (msg) => {
    const chatId = msg.chat.id;
    const user = getUser(chatId);

    const symbols = Object.keys(user.portfolio || {});
    if (symbols.length === 0) {
        return bot.sendMessage(chatId, 'У тебя нет открытых позиций для продажи.');
    }

    let totalReceived = 0;
    let totalPnl = 0;

    for (const symbol of symbols) {
        const position = user.portfolio[symbol];
        if (!position || position.quantity <= 0) continue;

        try {
            const currentPrice = await getPrice(symbol);
            const quantityToSell = position.quantity;
            const amountUSD = quantityToSell * currentPrice;
            const pnl = (currentPrice - position.avgPrice) * quantityToSell;

            totalReceived += amountUSD;
            totalPnl += pnl;

            user.balance += amountUSD;
            delete user.portfolio[symbol];
        } catch (e) {
            // если по какому-то символу не удалось получить цену — просто пропускаем его
        }
    }

    updateUser(chatId, user);

    bot.sendMessage(
        chatId,
        `✅ Все доступные позиции проданы.
Зачислено: ${totalReceived.toFixed(2)}$
Суммарный PnL: ${totalPnl.toFixed(2)}$
Текущий баланс: ${user.balance.toFixed(2)}$`
    );
});

bot.onText(/\/sell (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const rawSymbolInput = match[1] || '';
    const symbolInput = rawSymbolInput.trim();
    const amountArg = (match[2] || '').trim();

    const user = getUser(chatId);

    if (!symbolInput) {
        return bot.sendMessage(chatId, '❌ Укажи монету, например: /sell BTC 100 или /sell BTC all');
    }

    const symbol = normalizeSymbol(symbolInput);

    if (!user.portfolio[symbol]) {
        return bot.sendMessage(chatId, '❌ У тебя нет этой монеты');
    }

    try {
        const currentPrice = await getPrice(symbol);

        let quantityToSell;
        let amountUSD;

        if (amountArg.toLowerCase() === 'all') {
            quantityToSell = user.portfolio[symbol].quantity;
            amountUSD = quantityToSell * currentPrice;
        } else {
            amountUSD = parsePositiveNumber(amountArg);
            if (amountUSD === null) {
                return bot.sendMessage(chatId, '❌ Неверная сумма для продажи. Пример: /sell BTC 100 или /sell BTC all');
            }
            quantityToSell = amountUSD / currentPrice;
        }

        if (quantityToSell > user.portfolio[symbol].quantity) {
            return bot.sendMessage(chatId, '❌ Недостаточно монет');
        }

        const avgPrice = user.portfolio[symbol].avgPrice;
        const pnl = (currentPrice - avgPrice) * quantityToSell;

        user.portfolio[symbol].quantity -= quantityToSell;
        user.balance += amountUSD;

        if (user.portfolio[symbol].quantity <= 0.000001) {
            delete user.portfolio[symbol];
        }

        updateUser(chatId, user);

        bot.sendMessage(
            chatId,
            `✅ Продано ${quantityToSell.toFixed(6)} ${symbol}
Цена: ${currentPrice.toFixed(2)}$
PnL: ${pnl.toFixed(2)}$
Баланс: ${user.balance.toFixed(2)}$`
        );
    } catch (e) {
        const errorMsg = e.response?.data?.msg || 'Ошибка продажи';
        bot.sendMessage(chatId, `❌ ${errorMsg}`);
    }
});

console.log('Bot is running...');
