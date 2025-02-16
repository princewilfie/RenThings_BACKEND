const { DataTypes } = require('sequelize');

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
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending',
            allowNull: false
        },
        admin_remarks: {
            type: DataTypes.STRING,
            allowNull: true
        },
        reviewed_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        reviewed_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    };

    const options = {
        timestamps: false,
    };

    return sequelize.define('subscription', attributes, options);
}

module.exports = model;