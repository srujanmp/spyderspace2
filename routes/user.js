const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Profile route for viewing user profile by userId
router.get('/:userId', async (req, res) => {
    const userId = req.params.userId; // Get the userId from the URL

    try {
        const user = await User.findById(userId).populate('friends', 'username profilePicture status');
        const usr = await User.findById(req.session.userId); // Current logged-in user
        
        if (!user) {
            return res.status(404).send('User not found.');
        }
        if (!usr) {
            return res.redirect('/auth/login')
        }
        res.render('profile', { user, usr });
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).send('Error loading profile.');
    }
});

module.exports = router;
