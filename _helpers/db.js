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

    db.Account = require('../accounts/account.model')(sequelize);

    // item
    db.Item = require('../Items/items.model')(sequelize);

    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);

    //subscription
    db.Subscription = require('../subscription/subscription.model')(sequelize); // New subscription model


    //chat
    db.Chat = require('../chat/chat.model')(sequelize);

    //rentitem
    db.RentItem = require('../rentitem/rentitem.model')(sequelize);



    Object.values(db).forEach((model) => {
        if (model.associate) {
            model.associate(db);
        }
    });


    // Define additional associations

    //item
    db.Account.hasMany(db.Item, { foreignKey: 'acc_id', onDelete: 'CASCADE' });
    db.Item.belongsTo(db.Account, { foreignKey: 'acc_id', as: 'account' });

    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);
    
    //chat
    db.Account.hasMany(db.Chat, { as: 'SentMessages', foreignKey: 'sender_id', onDelete: 'CASCADE' });
    db.Account.hasMany(db.Chat, { as: 'ReceivedMessages', foreignKey: 'receiver_id', onDelete: 'CASCADE' });

    // Account -> Subscription
    db.Account.hasMany(db.Subscription, { foreignKey: 'acc_id', onDelete: 'CASCADE' }); 
    db.Subscription.belongsTo(db.Account, { foreignKey: 'acc_id', as: 'account' }); 

    db.Account.hasMany(db.Subscription, { foreignKey: 'acc_id', onDelete: 'CASCADE' }); 
    db.Subscription.belongsTo(db.Account, { foreignKey: 'acc_id', as: 'subscriber' });
    
    // Add new reviewer association for subscriptions
    db.Account.hasMany(db.Subscription, { 
        foreignKey: 'reviewed_by', 
        as: 'reviewedSubscriptions'
    });
    db.Subscription.belongsTo(db.Account, { 
        foreignKey: 'reviewed_by', 
        as: 'reviewer'
    });
    
    // rentitem - items
    db.Item.hasMany(db.RentItem, { foreignKey: 'Item_id', as: 'rentalItems' });
    db.RentItem.belongsTo(db.Item, { foreignKey: 'Item_id', as: 'rentedItem' });

    db.Account.hasMany(db.RentItem, { foreignKey: 'renter_acc_id', as: 'rentals' });
    db.RentItem.belongsTo(db.Account, { foreignKey: 'renter_acc_id', as: 'renterAccount' });
            

    // Sync the database
    // await sequelize.sync({ alter: true }); //

    await sequelize.sync();
}
