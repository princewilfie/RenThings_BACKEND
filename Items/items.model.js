const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        Item_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        acc_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        Item_name: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        Item_Description: { 
            type: DataTypes.TEXT, 
            allowNull: true 
        },
        Item_image: { 
            type: DataTypes.STRING, 
            allowNull: true 
        },
        created_at: { 
            type: DataTypes.DATE, 
            allowNull: false, 
            defaultValue: DataTypes.NOW 
        },
        updated_at: { 
            type: DataTypes.DATE 
        }
    };

    const options = {
        timestamps: false,
        tableName: 'items'
    };

    const Item = sequelize.define('Item', attributes, options);

    return Item;
}
