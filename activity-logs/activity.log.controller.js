const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const Role = require('_helpers/role');
const activityLogService = require('./activity-log.service');

// routes
router.get('/', authorize(Role.Admin), getAll);
router.get('/user/:id', authorize(Role.Admin), getByUser);
router.get('/action/:action', authorize(Role.Admin), getByAction);
router.get('/ip/:ip', authorize(Role.Admin), getByIp);
router.get('/date-range', authorize(Role.Admin), getByDateRangeSchema, getByDateRange);

module.exports = router;

function getAll(req, res, next) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    activityLogService.getAll(page, limit)
        .then(logs => res.json(logs))
        .catch(next);
}

function getByUser(req, res, next) {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    activityLogService.getByUser(userId, page, limit)
        .then(logs => res.json(logs))
        .catch(next);
}

function getByAction(req, res, next) {
    const action = req.params.action;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    activityLogService.getByAction(action, page, limit)
        .then(logs => res.json(logs))
        .catch(next);
}

function getByIp(req, res, next) {
    const ip = req.params.ip;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    activityLogService.getByIp(ip, page, limit)
        .then(logs => res.json(logs))
        .catch(next);
}

function getByDateRangeSchema(req, res, next) {
    const schema = Joi.object({
        startDate: Joi.date().required(),
        endDate: Joi.date().min(Joi.ref('startDate')).required()
    });
    validateRequest(req, next, schema);
}

function getByDateRange(req, res, next) {
    const { startDate, endDate } = req.body;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    activityLogService.getByDateRange(startDate, endDate, page, limit)
        .then(logs => res.json(logs))
        .catch(next);
}