const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const User = require('./models/User.js');
const app = express();

// Load environment variables from .env file
require('dotenv').config();

// Connect to MongoDB using the URI from the .env file
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 
app.use(cookieParser());

// Set up sessions
app.use(session({
    secret: 'yourSecretKey', // Replace with a secure key
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friends'); //

app.use((req, res, next) => {
    res.locals.username = req.session.userId ? req.session.username : null; // Assuming you store username in session
    next();
});

app.use('/auth', authRoutes);
app.use('/friends', friendRoutes);
// Middleware to protect the / route (restricted if not logged in)
app.get('/', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    
    try {
        // Fetch all users except the logged-in user
        const users = await User.find({ _id: { $ne: req.session.userId } });

        // Render the homepage.ejs view and pass users
        const usr = await User.findById(req.session.userId);
        res.render('homepage', { users,usr });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching users.');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
