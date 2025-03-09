const config = require('config.json');
const db = require('_helpers/db');
const { Op } = require('sequelize');

module.exports = {
    createReport,
    getReportById,
    getAllReports,
    getReportsByReporter,
    getReportsByReportedUser,
    getPendingReports,
    updateReportStatus,
    reviewReport,
    deleteReport
};

async function createReport(params) {
    // Validate reporter and reported user exist
    const reporter = await db.Account.findByPk(params.reporter_id);
    if (!reporter) throw 'Reporter account not found';
    
    const reportedUser = await db.Account.findByPk(params.reported_id);
    if (!reportedUser) throw 'Reported user account not found';
    
    // Prevent self-reporting
    if (params.reporter_id === params.reported_id) {
        throw 'You cannot report yourself';
    }
    
    // Create the report
    const report = new db.UserReport({
        reporter_id: params.reporter_id,
        reported_id: params.reported_id,
        reason_type: params.reason_type,
        description: params.description,
        evidence: params.evidence,
        created_at: new Date()
    });
    
    await report.save();
    
    return getReportById(report.id);
}

async function getReportById(id) {
    const report = await getReport(id);
    return reportDetails(report);
}

async function getAllReports(page = 1, limit = 10, status = null, reason_type = null) {
    const offset = (page - 1) * limit;
    let whereClause = {};
    
    if (status) {
        whereClause.status = status;
    }
    
    if (reason_type) {
        whereClause.reason_type = reason_type;
    }
    
    const reports = await db.UserReport.findAndCountAll({
        where: whereClause,
        limit: limit,
        offset: offset,
        order: [['created_at', 'DESC']],
        include: [
            { model: db.Account, as: 'reporter', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] },
            { model: db.Account, as: 'reportedUser', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] },
            { model: db.Account, as: 'reviewer', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] }
        ]
    });
    
    return {
        reports: reports.rows.map(x => reportDetails(x)),
        totalPages: Math.ceil(reports.count / limit),
        currentPage: page,
        totalCount: reports.count
    };
}

async function getReportsByReporter(reporterId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const reports = await db.UserReport.findAndCountAll({
        where: { reporter_id: reporterId },
        limit: limit,
        offset: offset,
        order: [['created_at', 'DESC']],
        include: [
            { model: db.Account, as: 'reportedUser', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] },
            { model: db.Account, as: 'reviewer', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] }
        ]
    });
    
    return {
        reports: reports.rows.map(x => reportDetails(x)),
        totalPages: Math.ceil(reports.count / limit),
        currentPage: page,
        totalCount: reports.count
    };
}

async function getReportsByReportedUser(reportedId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const reports = await db.UserReport.findAndCountAll({
        where: { reported_id: reportedId },
        limit: limit,
        offset: offset,
        order: [['created_at', 'DESC']],
        include: [
            { model: db.Account, as: 'reporter', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] },
            { model: db.Account, as: 'reviewer', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] }
        ]
    });
    
    return {
        reports: reports.rows.map(x => reportDetails(x)),
        totalPages: Math.ceil(reports.count / limit),
        currentPage: page,
        totalCount: reports.count
    };
}

async function getPendingReports(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const reports = await db.UserReport.findAndCountAll({
        where: { status: 'pending' },
        limit: limit,
        offset: offset,
        order: [['created_at', 'ASC']],
        include: [
            { model: db.Account, as: 'reporter', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] },
            { model: db.Account, as: 'reportedUser', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] }
        ]
    });
    
    return {
        reports: reports.rows.map(x => reportDetails(x)),
        totalPages: Math.ceil(reports.count / limit),
        currentPage: page,
        totalCount: reports.count
    };
}

async function updateReportStatus(id, status) {
    const report = await getReport(id);
    
    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
        throw 'Invalid status value';
    }
    
    report.status = status;
    report.updated_at = new Date();
    
    await report.save();
    
    return reportDetails(report);
}

async function reviewReport(id, params) {
    const report = await getReport(id);
    
    // Validate reviewer exists
    if (params.reviewer_id) {
        const reviewer = await db.Account.findByPk(params.reviewer_id);
        if (!reviewer) throw 'Reviewer account not found';
    }
    
    // Update report
    report.status = params.status || report.status;
    report.reviewer_id = params.reviewer_id;
    report.reviewer_comments = params.reviewer_comments;
    report.action_taken = params.action_taken;
    report.updated_at = new Date();
    
    await report.save();
    
    return reportDetails(report);
}

async function deleteReport(id) {
    const report = await getReport(id);
    await report.destroy();
}

// Helper functions
async function getReport(id) {
    const report = await db.UserReport.findByPk(id, {
        include: [
            { model: db.Account, as: 'reporter', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] },
            { model: db.Account, as: 'reportedUser', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] },
            { model: db.Account, as: 'reviewer', attributes: ['id', 'acc_firstName', 'acc_lastName', 'acc_email'] }
        ]
    });
    
    if (!report) throw 'Report not found';
    return report;
}

function reportDetails(report) {
    const { 
        id, 
        reporter_id, 
        reported_id, 
        reason_type,
        description, 
        evidence, 
        status, 
        reviewer_id, 
        reviewer_comments, 
        action_taken, 
        created_at, 
        updated_at,
        reporter,
        reportedUser,
        reviewer
    } = report;
    
    // Map reason_type to human-readable format
    const reasonMap = {
        'inappropriate_content': 'Inappropriate Content',
        'harassment': 'Harassment or Bullying',
        'spam': 'Spam or Misleading',
        'fraud': 'Fraud or Scam',
        'fake_account': 'Fake Account',
        'hate_speech': 'Hate Speech',
        'violence': 'Violence or Threats',
        'impersonation': 'Impersonation',
        'intellectual_property': 'Intellectual Property Violation',
        'other': 'Other'
    };
    
    return { 
        id, 
        reporter_id, 
        reported_id, 
        reason_type,
        reason_display: reasonMap[reason_type] || reason_type,
        description, 
        evidence, 
        status, 
        reviewer_id, 
        reviewer_comments, 
        action_taken, 
        created_at, 
        updated_at,
        reporter: reporter ? {
            id: reporter.id,
            fullName: `${reporter.acc_firstName} ${reporter.acc_lastName}`,
            email: reporter.acc_email
        } : null,
        reportedUser: reportedUser ? {
            id: reportedUser.id,
            fullName: `${reportedUser.acc_firstName} ${reportedUser.acc_lastName}`,
            email: reportedUser.acc_email
        } : null,
        reviewer: reviewer ? {
            id: reviewer.id,
            fullName: `${reviewer.acc_firstName} ${reviewer.acc_lastName}`,
            email: reviewer.acc_email
        } : null
    };
}