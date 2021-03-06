const UserController = {};
const passport = require('passport');
const User = require('../models/user');
const sendEmail = require('../helpers/emailer.js');

require('../config/passport');

/*
* If we have extra time near the end of the project
* Go back and add login attempt tracking
* Lock an account after too many attempts were made
*/
UserController.createNewUser = function(req, res, next) {
    passport.authenticate('local-registration', function(err, user, info) {
        if (err) {
            return res.status(500).json(info);
        } else if (!user) {
            return res.status(400).json(info);
        } else {
            return res.status(201).json(info);
        }
    })(req, res, next);
};

UserController.updateUser = function(req, res) {
    User.findById(req.locals.decoded.id)
    .then(user => {
        if (!user) {
            throw 'Unable to find a user with given information.';
        }

        // start saving updated user details
        if (req.body.email) {
            user.local.email = req.body.email;
        }
        if (req.body.username) {
            user.username = req.body.username;
        }
        if (req.body.password && req.body.password.length > 5) {
            user.local.password = user.generateHash(req.body.password);
        }

        return user.save();
    })
    .then(() => {
        return res.status(204).json({
            success: 'User updated successfully!'
        });
    })
    .catch(err => {
        return res.status(500).json({
            error: err
        });
    });
};

UserController.deleteUser = function(req, res) {
    User.findById(req.locals.decoded.id)
    .then(user => {
        return user.remove();  
    })
    .then(() => {
        return res.status(204).json({
            success: 'User deleted successfully!'
        });
    })
    .catch(() => {
        return res.status(500).json({
            error: 'Something unexpected happened.'
        });
    });
};

UserController.findUser = function(req, res) {
    User.findOne({ 'username': req.query.username })
        .select('username')
        .then(user => {
            return res.status(200).json({
                user: user
            });
        })
        .catch(() => {
            return res.status(500).json({
                error: 'An unknown error occurred'
            });
        });
};

//Password Reset
UserController.forgotPassword = function(req, res) {
    const randomString = length => {
        let text = "";
        const possible = "abcdefghijklmnopqrstuvwxyz0123456789_-.";
        for (let i = 0; i< length; i++) {
            text+= possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };
        
        User.findOne({'local.email': req.body.email})
        .then(user => {
            const token = randomString(40);
            const emailData = {
                to: user.local.email,
                subject: "Beacon Password Reset Instructions",
                text: `Please use the following link for instruction to reset your password: http://localhost:3000/resetpassword/${token}`,
                html: `<p>Please use the link below for instruction to reset your password.</p><p>http://localhost:3000/resetpassword/${token}</p>`,
            };
            user.resetPassLink = token;
            user.save()
            .then(() => {
                sendEmail(emailData);
                return res.status(200).json({
                    message: `Password reset email sent.`
                });
            });
        })
        .catch(() => {
            return res.status(200).json({
                message: `Password reset email sent.`
            });
        });
};

UserController.resetPassword = function(req, res){
    const {resetToken, newPassword} = req.body;
    if (!req.body) return res.status(400).json({message: 'No Request Body'});
    User.findOne({'resetPassLink':resetToken})
    .then(user => {
        user.local.password = user.generateHash(newPassword);
        user.resetPassLink = "";
        user.save()
        .then(() => {
            return res.status(200).json({message: 'Password updated succesfully'});
        });
    });
};

module.exports = UserController;