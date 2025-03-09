const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('_middleware/multer-config'); // Using your existing multer configuration
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const Role = require('_helpers/role');
const reportUserService = require('./reportuser.service');
const path = require('path');

// Routes
router.post('/', authorize(), multer.single('evidence'), createReportSchema, createReport);
router.get('/', authorize([Role.Admin]), getAll);
router.get('/pending', authorize([Role.Admin]), getPending);
router.get('/by-reporter/:id', authorize(), getByReporter);
router.get('/against-user/:id', authorize([Role.Admin]), getAgainstUser);
router.get('/:id', authorize(), getById);
router.put('/:id/status', authorize([Role.Admin]), updateStatusSchema, updateStatus);
router.put('/:id/review', authorize([Role.Admin]), reviewSchema, reviewReport);
router.delete('/:id', authorize([Role.Admin]), _delete);

module.exports = router;

// Controller functions
function createReportSchema(req, res, next) {
    const schema = Joi.object({
        reported_id: Joi.number().required(),
        reason_type: Joi.string().valid(
            'inappropriate_content',
            'harassment',
            'spam',
            'fraud',
            'fake_account',
            'hate_speech',
            'violence',
            'impersonation',
            'intellectual_property',
            'other'
        ).required(),
        description: Joi.string().allow('', null)
    });
    validateRequest(req, next, schema);
}

function createReport(req, res, next) {
    // Add reporter_id from authenticated user
    const reportData = {
        ...req.body,
        reporter_id: req.auth.id, // Using req.auth.id to match your authentication pattern
        evidence: req.file ? path.basename(req.file.path) : null
    };
    
    reportUserService.createReport(reportData)
        .then(report => res.json(report))
        .catch(next);
}

function getAll(req, res, next) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || null;
    const reason_type = req.query.reason_type || null;
    
    reportUserService.getAllReports(page, limit, status, reason_type)
        .then(reports => res.json(reports))
        .catch(next);
}

function getPending(req, res, next) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    reportUserService.getPendingReports(page, limit)
        .then(reports => res.json(reports))
        .catch(next);
}

function getByReporter(req, res, next) {
    // Only allow users to view their own reports unless admin
    if (parseInt(req.params.id) !== req.auth.id && req.auth.role !== Role.Admin) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    reportUserService.getReportsByReporter(req.params.id, page, limit)
        .then(reports => res.json(reports))
        .catch(next);
}

function getAgainstUser(req, res, next) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    reportUserService.getReportsByReportedUser(req.params.id, page, limit)
        .then(reports => res.json(reports))
        .catch(next);
}

function getById(req, res, next) {
    reportUserService.getReportById(req.params.id)
        .then(report => {
            // Only allow users to view reports they created or admins to view any
            if (report.reporter_id !== req.auth.id && req.auth.role !== Role.Admin) {
                return res.status(403).json({ message: 'Forbidden' });
            }
            res.json(report);
        })
        .catch(next);
}

function updateStatusSchema(req, res, next) {
    const schema = Joi.object({
        status: Joi.string().valid('pending', 'reviewed', 'resolved', 'dismissed').required()
    });
    validateRequest(req, next, schema);
}

function updateStatus(req, res, next) {
    reportUserService.updateReportStatus(req.params.id, req.body.status)
        .then(report => res.json(report))
        .catch(next);
}

function reviewSchema(req, res, next) {
    const schema = Joi.object({
        status: Joi.string().valid('reviewed', 'resolved', 'dismissed').required(),
        reviewer_comments: Joi.string().allow('', null),
        action_taken: Joi.string().allow('', null)
    });
    validateRequest(req, next, schema);
}

function reviewReport(req, res, next) {
    const reviewData = {
        ...req.body,
        reviewer_id: req.auth.id
    };
    
    reportUserService.reviewReport(req.params.id, reviewData)
        .then(report => res.json(report))
        .catch(next);
}

function _delete(req, res, next) {
    reportUserService.deleteReport(req.params.id)
        .then(() => res.json({ message: 'Report deleted successfully' }))
        .catch(next);
}