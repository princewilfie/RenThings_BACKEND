const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const chatService = require('./chat.service');
const socket = require('_helpers/socket'); // Import the socket module

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
        const messageData = {
            sender_id: req.auth.id,
            receiver_id: req.body.receiver_id,
            message: req.body.message,
        };

        const savedMessage = await chatService.sendMessage(messageData);

        // Emit the message using Socket.IO
        const io = socket.getIO();
        io.to(messageData.receiver_id.toString()).emit('new_message', savedMessage);

        res.json(savedMessage);
    } catch (error) {
        console.error('Error Sending Message:', error);
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

router.get('/participants', authorize(), async (req, res, next) => {
    try {
        const participants = await chatService.getChatParticipants(req.auth.id);
        res.json(participants);
    } catch (error) {
        next(error);
    }
});


module.exports = router;