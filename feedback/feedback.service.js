const db = require('_helpers/db');
const sendEmail = require('_helpers/send-email');

module.exports = {
    getAll,
    getById,
    getByRentItemId,
    getByItemId,
    getByAccountId,
    create,
    update,
    delete: _delete,
    getAverageRatingByItemId
};

async function getAll() {
    return await db.Feedback.findAll({
        include: [
            {
                model: db.Account,
                as: 'account',
                attributes: ['acc_firstName', 'acc_lastName']
            },
            {
                model: db.RentItem,
                as: 'rentItem',
                include: [
                    {
                        model: db.Item,
                        as: 'item',
                        attributes: ['Item_name', 'Item_id']
                    }
                ]
            }
        ]
    });
}

async function getById(feedback_id) {
    const feedback = await db.Feedback.findByPk(feedback_id, {
        include: [
            {
                model: db.Account,
                as: 'account',
                attributes: ['acc_firstName', 'acc_lastName']
            },
            {
                model: db.RentItem,
                as: 'rentItem',
                include: [
                    {
                        model: db.Item,
                        as: 'item',
                        attributes: ['Item_name', 'Item_id']
                    }
                ]
            }
        ]
    });
    if (!feedback) throw 'Feedback not found';
    return feedback;
}

async function getByRentItemId(RentItem_id) {
    return await db.Feedback.findOne({
        where: { RentItem_id: RentItem_id, status: 'Active' },
        include: [
            {
                model: db.Account,
                as: 'account',
                attributes: ['acc_firstName', 'acc_lastName']
            }
        ]
    });
}

async function getByItemId(Item_id) {
    // Get all rent items for this item
    const rentItems = await db.RentItem.findAll({
        where: { Item_id: Item_id }
    });
    
    // Extract all rentItem_ids
    const rentItemIds = rentItems.map(item => item.RentItem_id);
    
    // Get all feedback for these rent items
    return await db.Feedback.findAll({
        where: { 
            RentItem_id: rentItemIds,
            status: 'Active' 
        },
        include: [
            {
                model: db.Account,
                as: 'account',
                attributes: ['acc_firstName', 'acc_lastName']
            },
            {
                model: db.RentItem,
                as: 'rentItem',
                include: [
                    {
                        model: db.Item,
                        as: 'item',
                        attributes: ['Item_name']
                    }
                ]
            }
        ],
        order: [['created_at', 'DESC']]
    });
}

async function getByAccountId(acc_id) {
    return await db.Feedback.findAll({
        where: { acc_id: acc_id },
        include: [
            {
                model: db.RentItem,
                as: 'rentItem',
                include: [
                    {
                        model: db.Item,
                        as: 'item',
                        attributes: ['Item_name', 'Item_image']
                    }
                ]
            }
        ],
        order: [['created_at', 'DESC']]
    });
}

async function create(params) {
    // Validate if rental exists and is completed
    const rentItem = await db.RentItem.findByPk(params.RentItem_id, {
        include: [
            {
                model: db.Item,
                as: 'item'
            }
        ]
    });
    
    if (!rentItem) throw 'Rental not found';
    
    if (rentItem.rental_status !== 'Completed') {
        throw 'Feedback can only be provided for completed rentals';
    }
    
    // Validate if account exists and is the renter
    const account = await db.Account.findByPk(params.acc_id);
    if (!account) throw 'Account not found';
    
    if (rentItem.renter_acc_id !== params.acc_id) {
        throw 'You can only provide feedback for your own rentals';
    }

    // Check if user has already provided feedback for this rental
    const existingFeedback = await db.Feedback.findOne({
        where: {
            RentItem_id: params.RentItem_id
        }
    });

    if (existingFeedback) throw 'You have already provided feedback for this rental';

    // Create new feedback
    const feedback = new db.Feedback(params);
    await feedback.save();

    // Fetch item owner's details for notification
    const itemOwner = await db.Account.findByPk(rentItem.item.acc_id);
    if (itemOwner) {
        const emailData = {
            to: itemOwner.acc_email,
            subject: 'New Feedback Received',
            html: `<p>Dear ${itemOwner.acc_firstName},</p>
                   <p>A new feedback has been received for your item <strong>${rentItem.item.Item_name}</strong>.</p>
                   <p>Rating: ${params.rating}/5</p>
                   <p>Comment: ${params.comment || 'No comment provided'}</p>
                   <p>Thank you for using our services!</p>`
        };
        await sendEmail(emailData);
    }

    return feedback;
}

async function update(feedback_id, params) {
    const feedback = await getById(feedback_id);

    // If RentItem_id is being updated, validate it
    if (params.RentItem_id) {
        const rentItem = await db.RentItem.findByPk(params.RentItem_id);
        if (!rentItem) throw 'Rental not found';
        if (rentItem.rental_status !== 'Completed') {
            throw 'Feedback can only be provided for completed rentals';
        }
    }

    // Validate account exists if acc_id is being updated
    if (params.acc_id) {
        const account = await db.Account.findByPk(params.acc_id);
        if (!account) throw 'Account not found';
    }

    // Update feedback
    Object.assign(feedback, params);
    feedback.updated_at = new Date();
    await feedback.save();

    return feedback;
}

async function _delete(feedback_id) {
    const feedback = await getById(feedback_id);
    
    // Instead of deleting, mark as inactive
    feedback.status = 'Inactive';
    feedback.updated_at = new Date();
    await feedback.save();
    
    return { message: 'Feedback marked as inactive' };
}

async function getAverageRatingByItemId(Item_id) {
    // Get all rent items for this item
    const rentItems = await db.RentItem.findAll({
        where: { Item_id: Item_id }
    });
    
    // Extract all rentItem_ids
    const rentItemIds = rentItems.map(item => item.RentItem_id);
    
    // Get all feedback ratings for these rent items
    const feedbacks = await db.Feedback.findAll({
        where: { 
            RentItem_id: rentItemIds,
            status: 'Active'
        },
        attributes: ['rating']
    });
    
    if (feedbacks.length === 0) {
        return { averageRating: 0, totalReviews: 0 };
    }
    
    const sum = feedbacks.reduce((total, feedback) => total + feedback.rating, 0);
    const average = sum / feedbacks.length;
    
    return {
        averageRating: parseFloat(average.toFixed(1)),
        totalReviews: feedbacks.length
    };
}