const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, 
        acc_email: { type: DataTypes.STRING, allowNull: false },
        acc_passwordHash: { type: DataTypes.STRING, allowNull: false },
        acc_firstName: { type: DataTypes.STRING, allowNull: false },
        acc_lastName: { type: DataTypes.STRING, allowNull: false },
        acc_image: { type: DataTypes.STRING, allowNull: true },
        acc_address: { type: DataTypes.STRING, allowNull: false }, 
        acc_acceptTerms: { type: DataTypes.BOOLEAN },
        acc_role: { type: DataTypes.STRING, allowNull: false },
        acc_verificationToken: { type: DataTypes.STRING },
        acc_verified: { type: DataTypes.DATE },
        acc_resetToken: { type: DataTypes.STRING },
        acc_resetTokenExpires: { type: DataTypes.DATE },
        acc_passwordReset: { type: DataTypes.DATE },
        acc_created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        acc_updated: { type: DataTypes.DATE },
        acc_isVerified: {
            type: DataTypes.VIRTUAL,
            get() { return !!(this.acc_verified || this.acc_passwordReset); } // Fixed property name
        }
    };

    const options = {
        timestamps: false,
        defaultScope: {
            attributes: { exclude: ['acc_passwordHash'] }
        },
        scopes: {
            withHash: { attributes: {} }
        }
    };

    return sequelize.define('account', attributes, options);
}