const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('_middleware/multer-config');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const itemService = require('./items.service');

// routes
router.get('/', authorize(), getAll);
router.get('/approved', getAllApproved);
router.get('/:id', getById);
router.get('/account/:acc_id', authorize(), getByAccountId);
router.post('/', authorize(), multer.single('Item_image'), createSchema, create);
router.put('/:id', authorize(), multer.single('Item_image'), updateSchema, update);
router.put('/:id/approve', authorize('Admin'), approve);
router.put('/:id/reject', authorize('Admin'),  reject);
router.delete('/:id', authorize(), _delete);
router.get('/tracking/report', authorize('Admin'), trackingReportSchema, getItemsTrackingReport);
router.get('/tracking/:id', authorize(), getItemTrackingHistory);
module.exports = router;

function createSchema(req, res, next) {
    const schema = Joi.object({
        acc_id: Joi.number().required(),
        Item_name: Joi.string().required(),
        Item_price: Joi.number().required(),
        Item_Description: Joi.string().allow('', null),
    });
    validateRequest(req, next, schema);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        acc_id: Joi.number().empty(''),
        Item_name: Joi.string().empty(''),
        Item_price: Joi.number().empty(''),
        Item_Description: Joi.string().allow('', null),
        acc_address: Joi.string().empty('')
    });
    validateRequest(req, next, schema);
}

function getAll(req, res, next) {
    itemService.getAll()
        .then(items => res.json(items))
        .catch(next);
}

function trackingReportSchema(req, res, next) {
    const schema = Joi.object({
        startDate: Joi.date().iso().allow(null, ''),
        endDate: Joi.date().iso().allow(null, ''),
        status: Joi.string().valid('Available', 'Unavailable').allow(null, ''),
        approval_status: Joi.string().valid('Pending', 'Approved', 'Rejected').allow(null, '')
    });
    validateRequest(req, next, schema);
}

function getById(req, res, next) {
    console.log('Fetching item with ID:', req.params.id); // Add this line
    itemService.getById(req.params.id)
        .then(item => item ? res.json(item) : res.sendStatus(404))
        .catch(next);
}

function getByAccountId(req, res, next) {
    itemService.getByAccountId(req.params.acc_id)
        .then(items => res.json(items))
        .catch(next);
}

function create(req, res, next) {
    itemService.create(req.body, req.file)
        .then(item => res.json(item))
        .catch(next);
}

function update(req, res, next) {
    itemService.update(req.params.id, req.body, req.file)
        .then(item => res.json(item))
        .catch(next);
}

function _delete(req, res, next) {
    itemService.delete(req.params.id)
        .then(() => res.json({ message: 'Item deleted successfully' }))
        .catch(next);
}

function approve(req, res, next) {
    itemService.approveItem(req.params.id)
        .then(item => res.json(item))
        .catch(next);
}

function reject(req, res, next) {
    itemService.rejectItem(req.params.id, req.body.rejection_reason)
        .then(item => res.json(item))
        .catch(next);
}

function getAllApproved(req, res, next) {
    itemService.getAllApproved()
        .then(items => res.json(items))
        .catch(next);
}

// New controller functions for tracking reports
function getItemsTrackingReport(req, res, next) {
    const { startDate, endDate, status, approval_status } = req.query;
    
    itemService.getItemsTrackingReport(startDate, endDate, status, approval_status)
        .then(report => res.json(report))
        .catch(next);
}

function getItemTrackingHistory(req, res, next) {
    itemService.getItemTrackingHistory(req.params.id)
        .then(history => res.json(history))
        .catch(next);
}