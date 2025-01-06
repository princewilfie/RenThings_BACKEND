const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Chat = sequelize.define('Chat', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        receiver_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    Chat.associate = (models) => {
        Chat.belongsTo(models.Account, { as: 'sender', foreignKey: 'sender_id' });
        Chat.belongsTo(models.Account, { as: 'receiver', foreignKey: 'receiver_id' });
    };

    return Chat;
};