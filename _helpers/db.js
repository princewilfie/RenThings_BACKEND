const config = require('config.json');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

module.exports = db = {};

initialize();

async function initialize() {
    const { host, port, user, password, database } = config.database;

    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

    const sequelize = new Sequelize(database, user, password, { dialect: 'mysql' });

    // Initialize Account model
    db.Account = require('../accounts/account.model')(sequelize);

    // Initialize Item model after Account model
    db.Item = require('../Items/items.model')(sequelize);

    // Initialize RefreshToken model
    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);

    // Define associations after models are initialized
    db.Account.hasMany(db.Item, {
        foreignKey: 'acc_id',
        onDelete: 'CASCADE',
    });
    db.Item.belongsTo(db.Account, {
        foreignKey: 'acc_id',
        as: 'account',
    });

    db.Account.hasMany(db.RefreshToken, {
        onDelete: 'CASCADE',
    });
    db.RefreshToken.belongsTo(db.Account);

    // Sync the database
    await sequelize.sync();
}
