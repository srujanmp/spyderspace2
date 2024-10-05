const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Chat = require('../models/Chat');

// Chat route between the logged-in user and another user
router.get('/:userId', async (req, res) => {
    const senderId = req.session.userId; // Logged-in user (sender)
    const receiverId = req.params.userId; // User you're chatting with (receiver)

    try {
        const sender = await User.findById(req.session.userId);
        const receiver = await User.findById(receiverId);
        
        if (!sender) {
            return res.redirect('/auth/login');
        }
        if (!sender || !receiver) {
            return res.status(404).send('User not found.');
        }

        // Fetch previous chat history between the users
        const chatHistory = await Chat.find({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        }).sort({ timestamp: 1 });

        const usr = await User.findById(req.session.userId);
        res.render('chat', { sender, receiver, chatHistory ,usr});
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading chat.');
    }
});

module.exports = router;
