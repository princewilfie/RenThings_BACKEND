const db = require('_helpers/db');
const path = require('path');

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete,
    getAllApproved
};

async function getAll() {
    return await db.Subscription.findAll({
        include: [
            {
                model: db.Account,
                as: 'account', // Use the alias 'account' here
                attributes: ['acc_email', 'acc_firstName', 'acc_lastName', 'acc_image'],
            },
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

// Helper function
async function getSubscription(id) {
    const subscription = await db.Subscription.findByPk(id, {
        include: [
            {
                model: db.Account,
                as: 'account', // Specify alias here
                attributes: ['id', 'email', 'first_name', 'last_name'],
            },
        ],
    });

    if (!subscription) throw 'Subscription not found';
    return subscription;
}


async function getAllApproved() {
    return await db.Account.findAll({
        where: {
            acc_subscription: 'active' // Filter only accounts with active subscriptions
        },
        attributes: [
            'acc_email', 
            'acc_firstName', 
            'acc_lastName', 
            'acc_image', 
            'acc_subscription'
        ] 
    });
}




