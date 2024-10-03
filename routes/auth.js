const express = require('express');
const router = express.Router();
const User = require('../models/User');  // Import the User model
const bcrypt = require('bcrypt');  // For password comparison

// Show the signup page
router.get('/signup', (req, res) => {
    res.render('signup');
});

// Handle signup form submission
router.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.send('Username already taken. Please choose another one.');
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({
            username,
            password: hashedPassword
        });

        await newUser.save();  // Save the user to MongoDB
        res.send('User registered successfully!');
    } catch (err) {
        console.error(err);
        res.send('Error occurred while registering the user.');
    }
});

// Show the login page
router.get('/login', (req, res) => {
    res.render('login');
});

// Handle login form submission
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find the user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.send('User not found.');
        }

        // Compare the password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.send('Incorrect password.');
        }

        // Store user ID in session
        req.session.userId = user._id;
        // Set cookie to expire in 1 hour
        
        // Redirect to homepage after successful login
        if (!req.session.userId) {
            return res.redirect('/auth/login');
        }
        
        try {
            // Fetch all users except the logged-in user
            const users = await User.find({ _id: { $ne: req.session.userId } });
            res.cookie('username', username, { httpOnly: true, maxAge: 3600000 }); 
            // Render the homepage.ejs view and pass users
            const usr = await User.findById(req.session.userId);
            res.render('homepage', { users,usr });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error fetching users.');
        }
    } catch (err) {
        console.error(err);
        res.send('Error occurred during login.');
    }
});

// Logout route (clear session)
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Error logging out.');
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect('/auth/login');    // Redirect to login page
    });
});

module.exports = router;
