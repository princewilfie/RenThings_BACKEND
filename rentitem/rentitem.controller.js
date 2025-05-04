const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const rentItemService = require('./rentitem.service');

// Routes
router.get('/', authorize(), getAll);
router.get('/item/:id', getRentersByItem);
router.get('/:id', authorize(), getById);
router.get('/account/:acc_id', authorize(), getRentalsByAccountId);
router.post(
    '/', 
    authorize(), 
    createSchema, 
    create
);
router.put('/:id', authorize(), updateSchema, update);
router.put('/:id/approve', authorize(), approve);
router.put('/:id/reject', authorize(), reject);
router.put('/:id/return', authorize(), markAsReturned);
router.delete('/:id', authorize(), _delete);

module.exports = router;

async function getRentersByItem(req, res, next) {
    try {
        const renters = await rentItemService.getRentersByItemId(req.params.id);
        res.json(renters);
    } catch (err) {
        next(err);
    }
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        Item_id: Joi.number().required(),
        renter_acc_id: Joi.number().required(),
        rental_start_date: Joi.date().required(),
        rental_end_date: Joi.date().required().min(Joi.ref('rental_start_date'))
    });
    validateRequest(req, next, schema);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        rental_start_date: Joi.date().optional(),
        rental_end_date: Joi.date().optional().min(Joi.ref('rental_start_date'))
    });
    validateRequest(req, next, schema);
}

function getAll(req, res, next) {
    rentItemService.getAll()
        .then(rentItems => res.json(rentItems))
        .catch(next);
}

function getById(req, res, next) {
    rentItemService.getById(req.params.id)
        .then(rentItem => rentItem ? res.json(rentItem) : res.sendStatus(404))
        .catch(next);
}

function getRentalsByAccountId(req, res, next) {
    rentItemService.getRentalsByAccountId(req.params.acc_id)
        .then(rentItems => res.json(rentItems))
        .catch(next);
}

function create(req, res, next) {
    rentItemService.create(req.body, req.file)
        .then(rentItem => res.json(rentItem))
        .catch(next);
}

function update(req, res, next) {
    rentItemService.update(req.params.id, req.body)
        .then(rentItem => res.json(rentItem))
        .catch(next);
}

function _delete(req, res, next) {
    rentItemService.delete(req.params.id)
        .then(() => res.json({ message: 'Rental item deleted successfully' }))
        .catch(next);
}

function approve(req, res, next) {
    rentItemService.approveRental(req.params.id)
        .then(rentItem => res.json(rentItem))
        .catch(next);
}

function reject(req, res, next) {
    rentItemService.rejectRental(req.params.id, req.body.rejection_reason)
        .then(rentItem => res.json(rentItem))
        .catch(next);
}

async function markAsReturned(req, res, next) {
    try {
        const result = await rentItemService.markAsReturned(req.params.id);
        res.json({ message: 'Rental marked as returned successfully', result });
    } catch (err) {
        next(err);
    }
}
