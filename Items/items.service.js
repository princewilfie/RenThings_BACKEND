const db = require('_helpers/db');
const path = require('path');
const sendEmail = require('_helpers/send-email');


module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete,
    getByAccountId,
    approveItem,  
    rejectItem,  
    getAllApproved,
    getItemsTrackingReport,
    getItemTrackingHistory   
};

async function getAll() {
    return await db.Item.findAll();
}


async function getById(Item_id) {
    const item = await db.Item.findByPk(Item_id, {
        include: [
            {
                model: db.Account,
                as: 'account',
                attributes: ['acc_firstName', 'acc_lastName', 'acc_email', 'acc_image', 'acc_address']
            }
        ]
    });
    if (!item) throw 'Item not found';
    return item;
}


async function getByAccountId(acc_id) {
    return await db.Item.findAll({
        where: { acc_id: acc_id }
    });
}

async function create(params, file) {
    const account = await db.Account.findByPk(params.acc_id);
    if (!account) throw 'Account not found';

    // Check if the account subscription is disabled
    if (account.acc_subscription === 'disabled') {
        // Count how many items the user has already created
        const itemCount = await db.Item.count({ where: { acc_id: params.acc_id } });

        // If the user has already created 2 items, prevent creating more
        if (itemCount >= 2) {
            throw 'Subscribe now to activate the unlimited posting of items in our platform!.';
        }
    }

    if (file) {
        params.Item_image = path.basename(file.path);
    }

    // Default values for new attributes
    params.Item_status = params.Item_status || 'Available';
    params.Item_approvalstatus = params.Item_approvalstatus || 'Pending';

    const item = new db.Item(params);
    await item.save();

    await addTrackingRecord({
        Item_id: item.Item_id,
        acc_id: params.acc_id,
        action: 'Created',
        new_status: params.Item_status,
        new_approval_status: params.Item_approvalstatus
    });
    
    return item;
}


async function update(Item_id, params, file) {
    const item = await getById(Item_id);

    // validate if account exists if acc_id is being updated
    if (params.acc_id) {
        const account = await db.Account.findByPk(params.acc_id);
        if (!account) throw 'Account not found';
    }

    if (file) {
        params.Item_image = path.basename(file.path);
    }

    // Store previous values for tracking
    const previous_status = item.Item_status;
    const previous_approval_status = item.Item_approvalstatus;
    const previous_name = item.Item_name;
    const previous_description = item.Item_Description;

    Object.assign(item, params);
    item.updated_at = Date.now();
    await item.save();

     // Add tracking record for item update if status changed
     if (previous_name !== item.Item_name || previous_description !== item.Item_Description || previous_status !== item.Item_status || previous_approval_status !== item.Item_approvalstatus) {
        await addTrackingRecord({
            Item_id: Item_id,
            acc_id: item.acc_id,
            action: 'Updated',
            previous_name: previous_name,
            new_name: item.Item_name,
            previous_description: previous_description,
            new_description: item.Item_Description,
            previous_status: previous_status,
            new_status: item.Item_status,
            previous_approval_status: previous_approval_status,
            new_approval_status: item.Item_approvalstatus,
        });
    }

    return item;
}


async function _delete(Item_id) {
    const item = await getById(Item_id);
    if (!item) {
        throw new Error('Item not found');
    }

    // Step 1: Record tracking BEFORE deleting the item
    const trackingData = {
        Item_id: item.Item_id, // still exists at this point
        original_item_id: item.Item_id,
        acc_id: item.acc_id,
        action: 'Deleted',
        previous_status: item.Item_status,
        new_status: 'Deleted',
        previous_approval_status: item.Item_approvalstatus,
        new_approval_status: 'Deleted',
        previous_name: item.Item_name,
        notes: 'Item was deleted from the system'
    };

    await addTrackingRecord(trackingData); // record first

    // Step 2: Delete item (hard delete)
    try {
        await item.destroy(); // actually removes it from the `items` table
    } catch (error) {
        console.error('Error deleting item:', error);
        throw new Error('Failed to delete item: ' + error.message || error);
    }
}







async function approveItem(Item_id) {
    const item = await getById(Item_id);

    if (item.Item_approvalstatus === 'Approved') {
        throw 'Item is already approved';
    }
    const previous_status = item.Item_status;
    const previous_approval_status = item.Item_approvalstatus;

    item.Item_approvalstatus = 'Approved';
    item.Item_status = 'Available';
    item.approval_date = new Date();
    item.updated_at = new Date();
    await item.save();

    // Add tracking record for item approval
    await addTrackingRecord({
        Item_id: Item_id,
        acc_id: item.acc_id,
        action: 'Approved',
        previous_status: previous_status,
        new_status: item.Item_status,
        previous_approval_status: previous_approval_status,
        new_approval_status: item.Item_approvalstatus,
    });

    // Fetch account details for notification
    const account = await db.Account.findByPk(item.acc_id);
    if (account) {
        const emailData = {
            to: account.acc_email,
            subject: 'Item Approval Notification',
            html: `<p>Dear ${account.acc_firstName},</p>
                   <p>Your item <strong>${item.Item_name}</strong> has been approved and is now available on our platform.</p>
                   <p>Thank you for using our services!</p>`
        };
        await sendEmail(emailData);
    }

    return item;
}

async function rejectItem(Item_id, rejectionReason) {
    const item = await getById(Item_id);

    if (item.Item_approvalstatus === 'Rejected') {
        throw 'Item is already rejected';
    }

    const previous_status = item.Item_status;
    const previous_approval_status = item.Item_approvalstatus;

    item.Item_approvalstatus = 'Rejected';
    item.Item_status = 'Unavailable';
    item.rejection_reason = rejectionReason;
    item.rejection_date = new Date();
    item.updated_at = new Date();
    await item.save();

    // Add tracking record for item rejection
    await addTrackingRecord({
        Item_id: Item_id,
        acc_id: item.acc_id,
        action: 'Rejected',
        previous_status: previous_status,
        new_status: item.Item_status,
        previous_approval_status: previous_approval_status,
        new_approval_status: item.Item_approvalstatus,
        notes: rejectionReason,
    });

    // Fetch account details for notification
    const account = await db.Account.findByPk(item.acc_id);
    if (account) {
        const emailData = {
            to: account.acc_email,
            subject: 'Item Rejection Notification',
            html: `<p>Dear ${account.acc_firstName},</p>
                   <p>We regret to inform you that your item <strong>${item.Item_name}</strong> has been rejected for the following reason:</p>
                   <p><em>${rejectionReason}</em></p>
                   <p>If you have any questions or need assistance, please contact our support team.</p>`
        };
        await sendEmail(emailData);
    }

    return item;
}


async function getAllApproved() {
    return await db.Item.findAll({
        where: { Item_approvalstatus: 'Approved' }
    });
}

async function addTrackingRecord(trackingData) {
    const record = new db.ItemTracking(trackingData);
    await record.save();
    return record;
}


// New function to get item tracking reports
async function getItemsTrackingReport(startDate, endDate, status, approval_status) {
    const whereClause = {};
    
    // Apply date filter if provided
    if (startDate && endDate) {
        whereClause.created_at = {
            [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
        };
    } else if (startDate) {
        whereClause.created_at = {
            [db.Sequelize.Op.gte]: new Date(startDate)
        };
    } else if (endDate) {
        whereClause.created_at = {
            [db.Sequelize.Op.lte]: new Date(endDate)
        };
    }
    
    // Apply status filter if provided
    if (status) {
        whereClause.new_status = status;
    }
    
    // Apply approval status filter if provided
    if (approval_status) {
        whereClause.new_approval_status = approval_status;
    }
    
    // Get tracking records with related item and account information
    const trackingRecords = await db.ItemTracking.findAll({
        where: whereClause,
        include: [
            {
                model: db.Item,
                as: 'item',
                attributes: ['Item_id', 'Item_name', 'Item_price', 'Item_status', 'Item_approvalstatus']
            },
            {
                model: db.Account,
                as: 'account',
                attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email']
            },
            {
                model: db.Account,
                as: 'admin',
                attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email']
            }
        ],
        order: [['created_at', 'DESC']]
    });
    
    return trackingRecords;
}

// New function to get tracking history for a specific item
async function getItemTrackingHistory(Item_id) {
    const trackingRecords = await db.ItemTracking.findAll({
        where: {
            [db.Sequelize.Op.or]: [
                { Item_id: Item_id }, 
                { original_item_id: Item_id } // Also find records for deleted items
            ]
        },
        include: [
            {
                model: db.Account,
                as: 'account',
                attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email']
            },
            {
                model: db.Account,
                as: 'admin',
                attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email']
            },
            {
                model: db.Item,
                as: 'item',
                required: false // Make this join optional since item may be deleted
            }
        ],
        order: [['created_at', 'ASC']]
    });
    
    return trackingRecords;
}