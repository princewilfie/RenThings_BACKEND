const db = require('../_helpers/db');
const { Op } = require('sequelize'); // Destructure Op from Sequelize


module.exports = {
    sendMessage,
    getConversation,
    getUnreadMessages,
    markAsRead,
    getChatParticipants
};

async function sendMessage(data) {
    if (!data.sender_id || !data.receiver_id || !data.message) {
        throw new Error('Missing required fields');
    }
    
    return await db.Chat.create({
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        message: data.message
    });
}

async function getConversation(user_id, other_id) {
    return await db.Chat.findAll({
        where: {
            [Op.or]: [
                { sender_id: user_id, receiver_id: other_id },
                { sender_id: other_id, receiver_id: user_id }
            ]
        },
        include: [
            {
                model: db.Account,
                as: 'sender',
                attributes: ['acc_firstname', 'acc_lastname', 'acc_image'] // Added acc_image here
            },
            {
                model: db.Account,
                as: 'receiver',
                attributes: ['acc_firstname', 'acc_lastname', 'acc_image'] // Added acc_image here
            }
        ],
        order: [['created_at', 'ASC']]
    });
}


async function getUnreadMessages(user_id) {
    return await db.Chat.count({
        where: {
            receiver_id: user_id,
            read: false
        }
    });
}

async function markAsRead(message_id, user_id) {
    const message = await db.Chat.findOne({
        where: {
            id: message_id,
            receiver_id: user_id
        }
    });

    if (message) {
        message.read = true;
        await message.save();
    }
    return message;
}

async function getChatParticipants(user_id) {
    const chats = await db.Chat.findAll({
        where: {
            [Op.or]: [
                { sender_id: user_id },
                { receiver_id: user_id }
            ]
        },
        attributes: ['sender_id', 'receiver_id'],
        group: ['sender_id', 'receiver_id'] // Ensure no duplicates
    });

    const participantIds = chats.map(chat => chat.sender_id === user_id ? chat.receiver_id : chat.sender_id);

    return db.Account.findAll({
        where: { id: { [Op.in]: participantIds } },
        attributes: ['id', 'acc_firstname', 'acc_lastname', 'acc_image']
    });
}

