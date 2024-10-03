const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    friendRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Reference to User model
    }],
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Reference to User model
    }]
});

module.exports = mongoose.model('User', userSchema);
