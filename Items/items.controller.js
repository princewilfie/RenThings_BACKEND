const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('_middleware/multer-config');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const itemService = require('./items.service');

// routes
router.get('/', authorize(), getAll);
router.get('/:id', authorize(), getById);
router.get('/account/:acc_id', authorize(), getByAccountId);
router.post('/', authorize(), multer.single('Item_image'), createSchema, create);
router.put('/:id', authorize(), multer.single('Item_image'), updateSchema, update);
router.delete('/:id', authorize(), _delete);

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

function getById(req, res, next) {
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