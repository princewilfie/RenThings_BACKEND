const db = require('_helpers/db');
const sendEmail = require('_helpers/send-email');
const { Op } = require('sequelize'); 


module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete,
    getRentalsByAccountId,
    approveRental,
    rejectRental,
    getRentersByItemId,
    markAsReturned

};

async function getAll() {
    return await db.RentItem.findAll({
        include: [
            { model: db.Item, as: 'item' },
            { model: db.Account, as: 'renter' }
        ]
    });
}

async function getRentersByItemId(Item_id) {
    return await db.RentItem.findAll({
        where: { Item_id },  // Fetch all rentals for the given Item_id
        include: [
            { model: db.Item, as: 'item' }, 
            { model: db.Account, as: 'renter' } 
        ]
    });
}

async function getById(RentItem_id) {
    const rentItem = await db.RentItem.findByPk(RentItem_id, {
        include: [
            { model: db.Item, as: 'item' },
            { model: db.Account, as: 'renter' }
        ]
    });
    if (!rentItem) throw 'Rental item not found';
    return rentItem;
}

async function create(params, file) {

    
    
    // Existing conflict and validation checks
    const item = await db.Item.findByPk(params.Item_id);
    if (!item) throw 'Item not found';
    if (item.Item_status !== 'Available') throw 'Item is not available for rent';

    const renterAccount = await db.Account.findByPk(params.renter_acc_id);
    if (!renterAccount) throw 'Renter account not found';

    // Check if the renter has been verified
    if (!renterAccount.acc_verification_status || renterAccount.acc_verification_status !== 'approved') {
        throw 'Your account needs to be verified before renting items. Please upload a verification image.';
    }

    // Check for conflicting rental periods
    const conflictingRentals = await db.RentItem.findAll({
        where: {
            Item_id: params.Item_id,
            rental_status: {
                [Op.in]: ['Pending', 'Approved', 'Active']
            },
            [Op.or]: [
                {
                    rental_start_date: {
                        [Op.lt]: params.rental_end_date,
                        [Op.gt]: params.rental_start_date
                    }
                },
                {
                    rental_end_date: {
                        [Op.lt]: params.rental_end_date,
                        [Op.gt]: params.rental_start_date
                    }
                },
                {
                    rental_start_date: {
                        [Op.gte]: params.rental_start_date,
                        [Op.lte]: params.rental_end_date
                    }
                }
            ]
        }
    });

    if (conflictingRentals.length > 0) {
        throw 'Item is already rented for the selected dates';
    }

    // Calculate total rental price
    const rentalDays = Math.ceil((new Date(params.rental_end_date) - new Date(params.rental_start_date)) / (1000 * 60 * 60 * 24));
    const totalRentalPrice = item.Item_price * rentalDays;

    const rentItemParams = {
        ...params,
        total_rental_price: totalRentalPrice,
        rental_status: 'Pending'
    };

    // Create rental item
    const rentItem = new db.RentItem(rentItemParams);
    await rentItem.save();

    // Notify item owner about rental request
    const itemOwner = await db.Account.findByPk(item.acc_id);
    if (itemOwner) {
        await sendEmail({
            to: itemOwner.acc_email,
            subject: 'New Rental Request',
            html: `<p>A new rental request has been made for your item: ${item.Item_name}</p>
                   <p>Rental period: ${params.rental_start_date} to ${params.rental_end_date}</p>`
        });
    }

    return rentItem;
}

async function update(RentItem_id, params) {
    const rentItem = await getById(RentItem_id);
    Object.assign(rentItem, params);
    rentItem.updated_at = Date.now();
    await rentItem.save();
    return rentItem;
}

async function _delete(RentItem_id) {
    const rentItem = await getById(RentItem_id);
    await rentItem.destroy();
}

async function getRentalsByAccountId(acc_id) {
    return await db.RentItem.findAll({
        where: { renter_acc_id: acc_id },
        include: [
            { model: db.Item, as: 'item' }
        ]
    });
}

async function approveRental(RentItem_id) {
    const rentItem = await getById(RentItem_id);
    const item = await db.Item.findByPk(rentItem.Item_id);

    if (rentItem.rental_status !== 'Pending') {
        throw 'Rental can only be approved from Pending status';
    }

    // Update item status
    item.Item_status = 'Rented';
    await item.save();

    // Update rental status
    rentItem.rental_status = 'Approved';
    rentItem.updated_at = new Date();
    await rentItem.save();

    // Notify renter about approval
    const renterAccount = await db.Account.findByPk(rentItem.renter_acc_id);
    if (renterAccount) {
        await sendEmail({
            to: renterAccount.acc_email,
            subject: 'Rental Request Approved',
            html: `<p>Your rental request for ${item.Item_name} has been approved!</p>
                   <p>Rental period: ${rentItem.rental_start_date} to ${rentItem.rental_end_date}</p>`
        });
    }

    return rentItem;
}

async function rejectRental(RentItem_id, rejectionReason) {
    const rentItem = await getById(RentItem_id);

    if (rentItem.rental_status !== 'Pending') {
        throw 'Rental can only be rejected from Pending status';
    }

    rentItem.rental_status = 'Rejected';
    rentItem.rejection_reason = rejectionReason;
    rentItem.updated_at = new Date();
    await rentItem.save();

    // Notify renter about rejection
    const renterAccount = await db.Account.findByPk(rentItem.renter_acc_id);
    const item = await db.Item.findByPk(rentItem.Item_id);
    if (renterAccount) {
        await sendEmail({
            to: renterAccount.acc_email,
            subject: 'Rental Request Rejected',
            html: `<p>Your rental request for ${item.Item_name} has been rejected.</p>
                   <p>Reason: ${rejectionReason}</p>`
        });
    }

    return rentItem;
}

async function markAsReturned(RentItem_id) {
    const rentItem = await getById(RentItem_id);

    if (rentItem.rental_status !== 'Approved') {
        throw 'Only Approved rentals can be marked as returned';
    }

    // Update rental status to Completed
    rentItem.rental_status = 'Completed';
    rentItem.updated_at = new Date();
    await rentItem.save();

    // Update item status to Available
    const item = await db.Item.findByPk(rentItem.Item_id);
    item.Item_status = 'Available';
    await item.save();

    // Notify renter about return completion
    const renterAccount = await db.Account.findByPk(rentItem.renter_acc_id);
    if (renterAccount) {
        await sendEmail({
            to: renterAccount.acc_email,
            subject: 'Rental Completed - Share Your Feedback',
            html: `
                <p>Your rental period for <strong>${item.Item_name}</strong> has ended, and the item has been returned successfully.</p>
                <p>We’d love to hear about your experience! Feel free to share your feedback.</p>
                <p>Thank you for renting with us!</p>
            `
        });
    }
    
    return rentItem;
}
