const db = require('_helpers/db');

module.exports = {
    logActivity,
    getAll,
    getByUser,
    getByAction,
    getByIp,
    getByDateRange
};

async function logActivity({ userId, username, action, ipAddress }) {
    // Create a new activity log entry
    const log = new db.ActivityLog({
        userId,
        username: username || 'Anonymous',
        action,
        ipAddress
    });
    
    await log.save();
    return log;
}

async function getAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await db.ActivityLog.findAndCountAll({
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });
    
    return {
        logs: rows,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalItems: count
    };
}

async function getByUser(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await db.ActivityLog.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });
    
    return {
        logs: rows,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalItems: count
    };
}

async function getByAction(action, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await db.ActivityLog.findAndCountAll({
        where: { action },
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });
    
    return {
        logs: rows,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalItems: count
    };
}

async function getByIp(ipAddress, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await db.ActivityLog.findAndCountAll({
        where: { ipAddress },
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });
    
    return {
        logs: rows,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalItems: count
    };
}

async function getByDateRange(startDate, endDate, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await db.ActivityLog.findAndCountAll({
        where: {
            createdAt: {
                [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
            }
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });
    
    return {
        logs: rows,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalItems: count
    };
}