const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        Item_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // Change to allow NULL values for deleted items
            references: {
                model: 'items',
                key: 'Item_id',
            }
        },
        original_item_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // Store the original item ID for deleted items
            comment: 'Preserved ID of deleted items for tracking history'
        },
        acc_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false
        },
        previous_status: {
            type: DataTypes.STRING,
            allowNull: true
        },
        new_status: {
            type: DataTypes.STRING,
            allowNull: true
        },
        previous_approval_status: {
            type: DataTypes.STRING,
            allowNull: true
        },
        new_approval_status: {
            type: DataTypes.STRING,
            allowNull: true
        },
        previous_name: {  
            type: DataTypes.STRING,
            allowNull: true
        },
        new_name: {  
            type: DataTypes.STRING,
            allowNull: true
        },
        previous_description: {  
            type: DataTypes.TEXT,
            allowNull: true
        },
        new_description: {  
            type: DataTypes.TEXT,
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        admin_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    };

    const options = {
        timestamps: false,
        tableName: 'items_tracking'
    };

    const ItemTracking = sequelize.define('ItemTracking', attributes, options);

    return ItemTracking;
}
