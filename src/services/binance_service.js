const axios = require('axios');

async function getPrice(symbol) {
    // Делаем символ заглавным
    symbol = symbol.toUpperCase();

    // Если пользователь уже написал USDT — не добавляем повторно
    if (!symbol.endsWith('USDT')) {
        symbol = symbol + 'USDT';
    }

    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;

    const response = await axios.get(url);

    return Number(response.data.price);
}


module.exports = { getPrice };
