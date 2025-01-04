const db = require('_helpers/db');
const path = require('path');

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete,
    getByAccountId
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
    // validate if account exists
    const account = await db.Account.findByPk(params.acc_id);
    if (!account) throw 'Account not found';

    if (file) {
        params.Item_image = path.basename(file.path);
    }

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