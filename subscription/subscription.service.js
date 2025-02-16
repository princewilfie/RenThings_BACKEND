const db = require('_helpers/db');
const path = require('path');
const sendEmail = require('_helpers/send-email');

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete,
    getAllApproved,
    approveSubscription,
    rejectSubscription
};

async function getAll() {
    return await db.Subscription.findAll({
        include: [
            {
                model: db.Account,
                as: 'subscriber',
                attributes: ['acc_email', 'acc_firstName', 'acc_lastName', 'acc_image'],
            },
            {
                model: db.Account,
                as: 'reviewer',
                attributes: ['acc_firstName', 'acc_lastName'],
            }
        ],
    });
}

async function getById(id) {
    return await getSubscription(id);
}

async function create(params) {
    // Log for debugging
    console.log('Received params in service:', params);
    
    if (!params.subscription_receipt) {
        throw new Error('subscription_receipt is required');
    }

    let planDuration;
    switch (params.subscription_plan) {
        case '1_month':
            planDuration = 1;
            break;
        case '3_months':
            planDuration = 3;
            break;
        case '6_months':
            planDuration = 6;
            break;
        default:
            throw 'Invalid subscription plan';
    }

    const startDate = new Date(params.start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + planDuration);

    try {
        const subscription = await db.Subscription.create({
            acc_id: params.acc_id,
            start_date: startDate,
            end_date: endDate,
            subscription_plan: params.subscription_plan,
            plan_duration: planDuration,
            subscription_receipt: params.subscription_receipt // Ensure this is set
        });

        return subscription;
    } catch (error) {
        // Log any database errors
        console.error('Database error:', error);
        throw error;
    }
}


async function update(id, params) {
    const subscription = await getSubscription(id);

   

    // Calculate the new end_date if the subscription plan has changed
    if (params.subscription_plan) {
        let planDuration;
        switch (params.subscription_plan) {
            case '1_month':
                planDuration = 1;
                break;
            case '3_months':
                planDuration = 3;
                break;
            case '6_months':
                planDuration = 6;
                break;
            default:
                throw 'Invalid subscription plan';
        }

        // Set the new end_date
        const startDate = new Date(subscription.start_date);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + planDuration);
        subscription.end_date = endDate;
        subscription.plan_duration = planDuration; // Update plan_duration
    }

    

    // Update subscription fields
    Object.assign(subscription, params);
    await subscription.save();

    return subscription.get();
}


async function _delete(id) {
    const subscription = await getSubscription(id);
    await subscription.destroy();
}

async function getSubscription(id) {
    const subscription = await db.Subscription.findByPk(id, {
        include: [
            {
                model: db.Account,
                as: 'subscriber',
                attributes: ['id', 'acc_email', 'acc_firstName', 'acc_lastName'],
            },
            {
                model: db.Account,
                as: 'reviewer',
                attributes: ['acc_firstName', 'acc_lastName'],
            }
        ],
    });

    if (!subscription) throw 'Subscription not found';
    return subscription;
}


async function getAllApproved() {
    return await db.Subscription.findAll({
        where: {
            status: 'approved'
        },
        include: [
            {
                model: db.Account,
                as: 'subscriber',
                attributes: ['acc_email', 'acc_firstName', 'acc_lastName', 'acc_image', 'acc_subscription']
            }
        ]
    });
}

async function approveSubscription(id, adminId, remarks) {
    const subscription = await getSubscription(id);

    // Update start_date to current date upon approval
    const startDate = new Date();
    let planDuration;

    switch (subscription.subscription_plan) {
        case '1_month':
            planDuration = 1;
            break;
        case '3_months':
            planDuration = 3;
            break;
        case '6_months':
            planDuration = 6;
            break;
        default:
            throw 'Invalid subscription plan';
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + planDuration);

    // Update subscription details
    subscription.status = 'approved';
    subscription.start_date = startDate;
    subscription.end_date = endDate;
    subscription.admin_remarks = remarks || null;
    subscription.reviewed_by = adminId;
    subscription.reviewed_at = new Date();

    await subscription.save();

    const account = await db.Account.findByPk(subscription.acc_id);
    if (account) {
        account.acc_subscription = 'active';
        await account.save();
        
        // Send approval email
        const emailBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #27ae60;">Subscription Approved ✅</h2>
            <p>Hello <strong>${account.acc_firstName} ${account.acc_lastName}</strong>,</p>
            <p>Your subscription request has been approved. You now have access to all premium features.</p>
            <p><strong>Plan:</strong> ${subscription.subscription_plan.replace('_', ' ')}</p>
            <p><strong>Start Date:</strong> ${new Date(subscription.start_date).toDateString()}</p>
            <p><strong>End Date:</strong> ${new Date(subscription.end_date).toDateString()}</p>
            <p><em>Remarks: ${remarks ? remarks : 'No additional remarks'}</em></p>
            <p>Best regards,</p>
            <p><strong>RentThings Inc.</strong></p>
        </div>
    `;

        await sendEmail({
            to: account.acc_email,
            subject: "Subscription Approved",
            html: emailBody
        });
    }

    return subscription;
}

async function rejectSubscription(id, adminId, remarks) {
    const subscription = await getSubscription(id);
    subscription.status = 'rejected';
    subscription.admin_remarks = remarks || null;
    subscription.reviewed_by = adminId;
    subscription.reviewed_at = new Date();
    
    await subscription.save();

    const account = await db.Account.findByPk(subscription.acc_id);
    if (account) {
        account.acc_subscription = 'disabled';
        await account.save();

        // Send rejection email
        const emailBody = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #e74c3c;">Subscription Rejected ❌</h2>
                <p>Hello <strong>${account.acc_firstName} ${account.acc_lastName}</strong>,</p>
                <p>We regret to inform you that your subscription request has been rejected.</p>
                <p><strong>Reason:</strong> ${remarks ? remarks : 'No additional remarks'}</p>
                <p>If you believe this was a mistake, please contact our support team.</p>
                <p>Best regards,</p>
                <p><strong>RentThings Inc.</strong></p>
            </div>
        `;

        await sendEmail({
            to: account.acc_email,
            subject: "Subscription Rejected",
            html: emailBody
        });
    }

    return subscription.get();
}


