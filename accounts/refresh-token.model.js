const { DataTypes } = require('sequelize');

function model(sequelize) {
    const attributes = {
        token: { type: DataTypes.STRING, allowNull: false, unique: true },
        expires: { type: DataTypes.DATE, allowNull: false },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        createdByIp: { type: DataTypes.STRING },
        revoked: { type: DataTypes.DATE },
        revokedByIp: { type: DataTypes.STRING },
        replacedByToken: { type: DataTypes.STRING },
        isExpired: {
            type: DataTypes.VIRTUAL,
            get() { return Date.now() >= this.expires; }
        },
        isActive: {
            type: DataTypes.VIRTUAL,
            get() { return !this.revoked && !this.isExpired; }
        }
    };

    const options = {
        timestamps: false // You can keep this if you want manual control over timestamps
    };

    return sequelize.define('refreshToken', attributes, options); // Capitalize for model name
}

module.exports = model;
