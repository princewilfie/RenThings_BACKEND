const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        acc_id: { type: DataTypes.INTEGER, allowNull: false },
        start_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        end_date: { type: DataTypes.DATE, allowNull: false },
        subscription_plan: { 
            type: DataTypes.ENUM('1_month', '3_months', '6_months'), 
            allowNull: false 
        },
        plan_duration: { 
            type: DataTypes.INTEGER, 
            allowNull: false 
        },
        subscription_receipt: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },   
     };

    const options = {
        timestamps: false,
    };

    return sequelize.define('subscription', attributes, options);
}
