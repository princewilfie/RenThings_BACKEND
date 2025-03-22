const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const feedbackService = require('./feedback.service');

// routes
router.get('/', authorize(), getAll);
router.get('/:id', getById);
router.get('/rentitem/:RentItem_id', getByRentItemId);
router.get('/item/:Item_id', getByItemId);
router.get('/account/:acc_id', authorize(), getByAccountId);
router.get('/rating/:Item_id', getAverageRatingByItemId);
router.post('/', authorize(), createSchema, create);
router.put('/:id', authorize(), updateSchema, update);
router.delete('/:id', authorize(), _delete);

module.exports = router;

function createSchema(req, res, next) {
    const schema = Joi.object({
        RentItem_id: Joi.number().required(),
        acc_id: Joi.number().required(),
        rating: Joi.number().min(1).max(5).required(),
        comment: Joi.string().allow('', null)
    });
    validateRequest(req, next, schema);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        RentItem_id: Joi.number().empty(''),
        acc_id: Joi.number().empty(''),
        rating: Joi.number().min(1).max(5).empty(''),
        comment: Joi.string().allow('', null),
        status: Joi.string().valid('Active', 'Inactive').empty('')
    });
    validateRequest(req, next, schema);
}

function getAll(req, res, next) {
    feedbackService.getAll()
        .then(feedback => res.json(feedback))
        .catch(next);
}

function getById(req, res, next) {
    feedbackService.getById(req.params.id)
        .then(feedback => feedback ? res.json(feedback) : res.sendStatus(404))
        .catch(next);
}

function getByRentItemId(req, res, next) {
    feedbackService.getByRentItemId(req.params.RentItem_id)
        .then(feedback => feedback ? res.json(feedback) : res.json(null))
        .catch(next);
}

function getByItemId(req, res, next) {
    feedbackService.getByItemId(req.params.Item_id)
        .then(feedback => res.json(feedback))
        .catch(next);
}

function getByAccountId(req, res, next) {
    feedbackService.getByAccountId(req.params.acc_id)
        .then(feedback => res.json(feedback))
        .catch(next);
}

function getAverageRatingByItemId(req, res, next) {
    feedbackService.getAverageRatingByItemId(req.params.Item_id)
        .then(rating => res.json(rating))
        .catch(next);
}

function create(req, res, next) {
    feedbackService.create(req.body)
        .then(feedback => res.json(feedback))
        .catch(next);
}

function update(req, res, next) {
    // Only allow users to update their own feedback or admins
    const currentUser = req.user;
    const isAdmin = currentUser.role === 'Admin';
    
    feedbackService.getById(req.params.id)
        .then(feedback => {
            if (feedback.acc_id !== currentUser.id && !isAdmin) {
                return res.status(403).json({ message: 'Forbidden: You can only update your own feedback' });
            }
            
            feedbackService.update(req.params.id, req.body)
                .then(feedback => res.json(feedback))
                .catch(next);
        })
        .catch(next);
}

function _delete(req, res, next) {
    // Only allow users to delete their own feedback or admins
    const currentUser = req.user;
    const isAdmin = currentUser.role === 'Admin';
    
    feedbackService.getById(req.params.id)
        .then(feedback => {
            if (feedback.acc_id !== currentUser.id && !isAdmin) {
                return res.status(403).json({ message: 'Forbidden: You can only delete your own feedback' });
            }
            
            feedbackService.delete(req.params.id)
                .then(result => res.json(result))
                .catch(next);
        })
        .catch(next);
}