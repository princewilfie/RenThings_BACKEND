const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true, 
            autoIncrement: true 
        },
        reporter_id: { 
            type: DataTypes.INTEGER, 
            allowNull: false,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        reported_id: { 
            type: DataTypes.INTEGER, 
            allowNull: false,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        reason_type: { 
            type: DataTypes.ENUM(
                'inappropriate_content',
                'harassment',
                'spam',
                'fraud',
                'fake_account',
                'hate_speech',
                'violence',
                'impersonation',
                'intellectual_property',
                'other'
            ), 
            allowNull: false 
        },
        description: { 
            type: DataTypes.TEXT, 
            allowNull: true 
        },
        evidence: { 
            type: DataTypes.STRING, 
            allowNull: true,
            comment: 'File path to evidence (screenshot, etc.)'
        },
        status: { 
            type: DataTypes.ENUM('pending', 'reviewed', 'resolved', 'dismissed'), 
            allowNull: false,
            defaultValue: 'pending'
        },
        reviewer_id: { 
            type: DataTypes.INTEGER, 
            allowNull: true,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        reviewer_comments: { 
            type: DataTypes.TEXT, 
            allowNull: true 
        },
        action_taken: { 
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
        tableName: 'user_reports'
    };
    
    const UserReport = sequelize.define('UserReport', attributes, options);

    

    return UserReport;
}