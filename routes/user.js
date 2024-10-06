const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET route to render profile update page (MUST be before :userId route)
router.get('/update-profile', async (req, res) => {
    const userId = req.session.userId; // Assuming user is logged in and their ID is stored in session

    try {
        // Find the logged-in user's profile information
        const usr = await User.findById(userId);
        
        if (!usr) {
            
            return res.redirect('/auth/login'); // Redirect if user not found
        }


        // Render the profile update page and pass the user object to the template
        res.render('editprofile', { usr }); // Pass user to EJS template
    } catch (err) {
        console.error(err);
        res.redirect('/auth/login');
    }
});

// POST route to update profile
router.post('/update-profile', async (req, res) => {
    const { username, status, profilePicture } = req.body;
    const userId = req.session.userId; // Assuming user is logged in and session stores userId

    try {
        // Check if the new username already exists (excluding the current user's username)
        const existingUser = await User.findOne({ username, _id: { $ne: userId } });
        if (existingUser) {
            req.session.message = 'Username already exists. Please choose another one.';
            return res.redirect('/user/' + userId); // Redirect back to profile page with a message
        }

        // Find the logged-in user
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/auth/login');
        }

        // Update user's profile details
        user.username = username;
        user.status = status;
        user.profilePicture = profilePicture; // Assuming this is one of the 10 images sent from the form

        // Save the updated user profile
        await user.save();

        res.redirect('/user/' + userId); // Redirect to the profile page
    } catch (err) {
        console.error(err);
        res.redirect('/auth/login');
    }
});

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
            return res.redirect('/auth/login');
        }

        const isOwner = userId === req.session.userId; // Check if the user is viewing their own profile

        // Render the profile and pass the user and the logged-in user's info
        res.render('profile', { user, usr, isOwner });
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).send('Error loading profile.');
    }
});

module.exports = router;
