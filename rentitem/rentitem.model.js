const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        RentItem_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        Item_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'items',
                key: 'Item_id'
            }
        },
        renter_acc_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        rental_start_date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        rental_end_date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        total_rental_price: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        rental_status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Pending',
            validate: {
                isIn: [['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Cancelled']]
            }
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
        tableName: 'rentitems'
    };

    const RentItem = sequelize.define('RentItem', attributes, options);

    RentItem.associate = (models) => {
        RentItem.belongsTo(models.Item, { 
            foreignKey: 'Item_id', 
            as: 'item' 
        });
        RentItem.belongsTo(models.Account, { 
            foreignKey: 'renter_acc_id', 
            as: 'renter' 
        });
    };

    return RentItem;
}