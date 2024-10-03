const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users to send friend requests
router.get('/send-requests', async (req, res) => {
    const userId = req.session.userId; // Logged-in user ID

    try {
        // Fetch all users except the logged-in user and their friends
        const users = await User.find({ 
            _id: { $ne: userId },
            friends: { $ne: userId } // Exclude friends
        });
        const usr = await User.findById(req.session.userId);
        res.render('sendRequests', { users ,usr});
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching users.');
    }
});

// Send friend request
router.post('/send-request/:userId', async (req, res) => {
    const requesterId = req.session.userId; // Logged-in user
    const targetUserId = req.params.userId; // Target user ID

    if (requesterId === targetUserId) {
        return res.status(400).send('You cannot send a friend request to yourself.');
    }

    try {
        // Find the target user
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).send('User not found.');
        }

        // Check if the friend request already exists
        if (targetUser.friendRequests.includes(requesterId)) {
            return res.status(400).send('Friend request already sent.');
        }

        // Send the friend request
        targetUser.friendRequests.push(requesterId);
        await targetUser.save();

        res.send('Friend request sent!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error sending friend request.');
    }
});

// Get friend requests
router.get('/requests', async (req, res) => {
    const userId = req.session.userId; // Logged-in user ID

    try {
        const user = await User.findById(userId).populate('friendRequests', 'username');
        
        if (!user) {
            return res.status(404).send('User not found.');
        }

        // Render a view to display friend requests
        const usr = await User.findById(req.session.userId);
        res.render('friendRequests', { requests: user.friendRequests ,usr});
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching friend requests.');
    }
});

// Accept friend request
router.post('/accept-request/:userId', async (req, res) => {
    const requesterId = req.params.userId; // User who sent the request
    const targetId = req.session.userId; // Logged-in user

    try {
        const targetUser = await User.findById(targetId);
        const requesterUser = await User.findById(requesterId);

        // Check if the friend request exists
        if (!targetUser.friendRequests.includes(requesterId)) {
            return res.status(400).send('No friend request from this user.');
        }

        // Accept the friend request
        targetUser.friends.push(requesterId);
        requesterUser.friends.push(targetId);

        // Remove the friend request from the target user
        targetUser.friendRequests = targetUser.friendRequests.filter(id => id.toString() !== requesterId);
        
        await targetUser.save();
        await requesterUser.save();

        res.send('Friend request accepted!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error accepting friend request.');
    }
});

// Reject friend request
router.post('/reject-request/:userId', async (req, res) => {
    const targetId = req.params.userId; // ID of the user whose request is being rejected
    const loggedInId = req.session.userId; // ID of the logged-in user

    try {
        const targetUser = await User.findById(loggedInId);

        // Remove the target user from friendRequests
        targetUser.friendRequests = targetUser.friendRequests.filter(id => id.toString() !== targetId);
        await targetUser.save();

        res.send('Friend request rejected.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error rejecting friend request.');
    }
});

// Get friends list
router.get('/list', async (req, res) => {
    const userId = req.session.userId; // Logged-in user ID

    try {
        const user = await User.findById(userId).populate('friends', 'username'); // Populate friends' usernames

        if (!user) {
            return res.status(404).send('User not found.');
        }

        // Render a view to display friends
        const usr = await User.findById(req.session.userId);
        res.render('friendsList', { friends: user.friends ,usr});
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching friends.');
    }
});

// Remove a friend
router.post('/remove/:friendId', async (req, res) => {
    const { friendId } = req.params; // Get the friend's ID from the route parameter
    const userId = req.session.userId; // Get the logged-in user's ID

    try {
        // Update the logged-in user's friends list
        await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
        
        // Update the friend's friends list (if you want mutual removal)
        await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

        res.redirect('/friends/list'); // Redirect to the friends list page after removal
    } catch (error) {
        console.error(error);
        res.redirect('/friends/list'); // Redirect on error
    }
});

module.exports = router;
