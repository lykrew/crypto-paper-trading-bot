const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

function readDb() {
    if (!fs.existsSync(dbPath)) {
        return {};
    }

    const data = fs.readFileSync(dbPath, 'utf-8');
    return data ? JSON.parse(data) : {};
}

function writeDb(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
    readDb,
    writeDb
};
