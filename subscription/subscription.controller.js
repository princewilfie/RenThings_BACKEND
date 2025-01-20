const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const subscriptionService = require('./subscription.service');
const authorize = require('_middleware/authorize');
const multer = require('_middleware/multer-config');


// Routes
router.get('/approved', getAllApproved); // Matches /approved
router.get('/:id', getById); // Matches /:id
router.get('/', getAll); // Matches /
router.post('/', authorize(), multer.single('subscription_receipt'), createSchema, create);
router.put('/:id', authorize(), multer.single('subscription_receipt'), updateSchema, update);
router.delete('/:id', _delete);


module.exports = router;

// Route functions
function getAll(req, res, next) {
    subscriptionService
        .getAll()
        .then(subscriptions => res.json(subscriptions))
        .catch(next);
}

function getById(req, res, next) {
    subscriptionService
        .getById(req.params.id)
        .then(subscription => res.json(subscription))
        .catch(next);
}

function createSchema(req, res, next) {
    // Check if file exists before schema validation
    if (!req.file) {
        return res.status(400).json({ message: "subscription_receipt file is required" });
    }

    const schema = Joi.object({
        acc_id: Joi.number().required(),
        start_date: Joi.date().required(),
        subscription_plan: Joi.string().valid('1_month', '3_months', '6_months').required(),
        // Make subscription_receipt optional in schema since we're handling it separately
        subscription_receipt: Joi.string().optional()
    });

    validateRequest(req, next, schema);
}





function create(req, res, next) {
    // Log for debugging
    console.log('File in create:', req.file);
    
    if (!req.file) {
        return res.status(400).json({ message: "subscription_receipt file is required" });
    }

    const subscriptionData = {
        ...req.body,
        subscription_receipt: req.file.filename || req.file.originalname // Ensure we have a filename
    };

    // Log the data being sent to service
    console.log('Data being sent to service:', subscriptionData);

    subscriptionService
        .create(subscriptionData)
        .then(subscription => res.json(subscription))
        .catch(next);
}




function updateSchema(req, res, next) {
    const schema = Joi.object({
        subscription_plan: Joi.string().valid('1_month', '3_months', '6_months').optional(),
        start_date: Joi.date().optional(),
        end_date: Joi.date().greater(Joi.ref('start_date')).optional(),
        subscription_receipt: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    const updateData = {
        ...req.body
    };
    
    if (req.file) {
        updateData.subscription_receipt = req.file.filename;
    }

    subscriptionService
        .update(req.params.id, updateData)
        .then(subscription => res.json(subscription))
        .catch(next);
}


function _delete(req, res, next) {
    subscriptionService
        .delete(req.params.id)
        .then(() => res.json({ message: 'Subscription deleted successfully' }))
        .catch(next);
}


function getAllApproved(req, res, next) {
    subscriptionService
        .getAllApproved()
        .then(subscriptions => res.json(subscriptions))
        .catch(next);
}
