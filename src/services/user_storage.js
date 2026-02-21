const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../storage/db.json');

// Чтение базы
function readDB() {
  if (!fs.existsSync(dbPath)) {
    return {};
  }

  const data = fs.readFileSync(dbPath, 'utf8');
  return data ? JSON.parse(data) : {};
}

// Запись базы
function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Получить пользователя
function getUser(userId) {
  const db = readDB();

  if (!db[userId]) {
    db[userId] = {
      balance: 10000,
      portfolio: {}
    };
    writeDB(db);
  }

  return db[userId];
}

// Обновить пользователя
function updateUser(userId, userData) {
  const db = readDB();
  db[userId] = userData;
  writeDB(db);
}

module.exports = {
  getUser,
  updateUser
};