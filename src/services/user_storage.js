const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../data/users.json');

function getUsers() {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
}

function saveUsers(users) {
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

function getUser(chatId) {
    const users = getUsers();

    if(!users[chatId]) {
        users[chatId] = {
            balance: 1000,
            portfolio: {}
        };
        saveUsers(users);
    }
    return users[chatId];
}

function updateUser(chatId, userData) {
    const users = getUsers();
    users[chatId] = userData;
    saveUsers(users);
}

module.exports = { getUser, updateUser };