const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const chatService = require('./chat.service');

// Message validation schema
function sendMessageSchema(req, res, next) {
    const schema = Joi.object({
        receiver_id: Joi.number().required(),
        message: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

// Routes
router.post('/send', authorize(), sendMessageSchema, async (req, res, next) => {
    try {
        console.log('User in request:', req.user); // Debug user object
        const messageData = {
            sender_id: req.auth.id,
            receiver_id: req.body.receiver_id,
            message: req.body.message
        };

        const chat = await chatService.sendMessage(messageData);
        res.json(chat);
    } catch (error) {
        next(error);
    }
});


router.get('/conversation/:other_id', authorize(), async (req, res, next) => {
    try {
        const messages = await chatService.getConversation(req.auth.id, req.params.other_id);
        res.json(messages);
    } catch (error) {
        next(error);
    }
});


router.get('/unread', authorize(), async (req, res, next) => {
    try {
        const count = await chatService.getUnreadMessages(req.auth.id);
        res.json({ unread_count: count });
    } catch (error) {
        next(error);
    }
});

router.put('/read/:message_id', authorize(), async (req, res, next) => {
    try {
        const message = await chatService.markAsRead(req.params.message_id, req.auth.id);
        res.json(message);
    } catch (error) {
        next(error);
    }
});

module.exports = router;