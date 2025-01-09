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
    getAllApproved    
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
                attributes: ['acc_address']
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

    Object.assign(item, params);
    item.updated_at = Date.now();
    await item.save();

    return item;
}


async function _delete(Item_id) {
    const item = await getById(Item_id);
    await item.destroy();
}


async function approveItem(Item_id) {
    const item = await getById(Item_id);

    if (item.Item_approvalstatus === 'Approved') {
        throw 'Item is already approved';
    }

    item.Item_approvalstatus = 'Approved';
    item.Item_status = 'Available';
    item.approval_date = new Date();
    item.updated_at = new Date();
    await item.save();

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

    item.Item_approvalstatus = 'Rejected';
    item.Item_status = 'Unavailable';
    item.rejection_reason = rejectionReason;
    item.rejection_date = new Date();
    item.updated_at = new Date();
    await item.save();

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


