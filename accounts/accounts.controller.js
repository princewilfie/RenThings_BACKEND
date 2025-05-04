const express = require('express'); 
const router = express.Router();
const Joi = require('joi');
const multer = require('_middleware/multer-config'); 
const validateRequest = require('_middleware/validate-request'); 
const authorize = require('_middleware/authorize')
const Role = require('_helpers/role');
const accountService = require('./account.service');

// routes
router.post('/authenticate', authenticateSchema, authenticate);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', authorize(), revokeTokenSchema, revokeToken);
router.post('/register', multer.single('acc_image'), registerSchema, register); 
router.post('/verify-email', verifyEmailSchema, verifyEmail);
router.post('/forgot-password', forgotPasswordSchema, forgotPassword); 
router.post('/validate-reset-token', validateResetTokenSchema, validateResetToken); 
router.post('/reset-password', resetPasswordSchema, resetPassword);
router.get('/', authorize(Role.Admin), getAll);
router.get('/:id', authorize(), getById);
router.post('/', authorize(Role.Admin), createSchema, create);
router.put('/:id', multer.single('acc_image'), (req, res, next) => {
    updateSchema(req, res, next);
}, update);

router.put('/:id/subscription', authorize(Role.Admin), updateSubscriptionSchema, updateSubscription);
router.put('/:id', authorize(), updateSchema, update);
router.post(
    '/:id/verification-image',
    authorize(),
    multer.array('verification_images', 10), // Allow up to 10 files with name verification_images
    uploadVerificationImage
);
router.get('/:id/verification-status', authorize(), getVerificationStatus);
router.put('/:id/approve-verification', authorize(Role.Admin), approveVerificationSchema, approveVerification);
router.put('/:id/reject-verification', authorize(Role.Admin), rejectVerificationSchema, rejectVerification);




router.delete('/:id', authorize(), _delete);

module.exports = router;

function authenticateSchema(req, res, next) { 
    const schema = Joi.object({
        acc_email: Joi.string().required(), // Updated to match your model
        acc_passwordHash: Joi.string().required() // Updated to match your model
    });
    validateRequest(req, next, schema);
}

function authenticate(req, res, next) {
    const { acc_email, acc_passwordHash } = req.body;
    const ipAddress = req.ip;

    accountService.authenticate({ acc_email, acc_passwordHash, ipAddress })
        .then(({ refreshToken, ...account }) => {
            console.log('Generated Refresh Token:', refreshToken);
            setTokenCookie(res, refreshToken); // Set the cookie
            console.log("Returning account and refreshToken:", { ...account, refreshToken });

            res.json({ ...account, refreshToken });
        })
        .catch(err => {
            if (err === 'Account not verified. Please check your email to verify your account.') {
                return res.status(403).json({ message: err });
            }
            next(err);
        });
}

function refreshToken(req, res, next) {
    const token = req.cookies.refreshToken;
    const ipAddress = req.ip;
    accountService.refreshToken({ token, ipAddress }) 
        .then(({ refreshToken, ...account }) => {
            setTokenCookie(res, refreshToken); 
            res.json(account);
        })
        .catch(next);
}

function revokeTokenSchema(req, res, next) { 
    const schema = Joi.object({
        token: Joi.string().empty('')
    });
    validateRequest(req, next, schema);
}

function revokeToken(req, res, next) {
    const token = req.cookies.refreshToken;
    const ipAddress = req.ip;

    if (!token) return res.status(400).json({ message: 'Token is required' });

    if (!req.auth.ownsToken(token) && req.auth.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService.revokeToken({ token, ipAddress })
        .then(() => res.json({ message: 'Token revoked' }))
        .catch(next);
}

function registerSchema(req, res, next) {
    const schema = Joi.object({
        acc_firstName: Joi.string().required(), 
        acc_lastName: Joi.string().required(), 
        acc_email: Joi.string().email().required(),
        acc_address: Joi.string().required(),
        acc_passwordHash: Joi.string().min(6).required(), 
        confirmPassword: Joi.string().valid(Joi.ref('acc_passwordHash')).required(),
        acc_acceptTerms: Joi.boolean().valid(true).required()
    });
    validateRequest(req, next, schema);
}

function register(req, res, next) {
    // Access data from req.body
    const { acc_email, acc_passwordHash, acc_firstName, acc_lastName, acc_address, acc_acceptTerms } = req.body;
    const acc_image = req.file ? path.basename(req.file.path) : 'default-profile.png'; // Change null to 'default-image.png'

    const body = { acc_email, acc_passwordHash, acc_firstName, acc_lastName, acc_address, acc_image, acc_acceptTerms };


    accountService.register(body, req.get('origin'))
        .then(() => {
            res.json({ message: 'Registration successful, please check your email for verification instructions' });
        })
        .catch(next);
}


function verifyEmailSchema(req, res, next) {
    const schema = Joi.object({
      token: Joi.string().required()  
    });
    validateRequest(req, next, schema);
}

function verifyEmail(req, res, next) {
    accountService.verifyEmail(req.body)
        .then(() => res.json({ message: 'Verification successful, you can now login' }))
        .catch(next);
}

function forgotPasswordSchema(req, res, next) {
    const schema = Joi.object({
        acc_email: Joi.string().email().required() // Updated to match your model
    });
    validateRequest(req, next, schema);
}

function forgotPassword(req, res, next) {
    accountService.forgotPassword(req.body, req.get('origin'))
        .then(() => res.json({ message: 'Please check your email for password reset instructions' }))
        .catch(next);
}

function validateResetTokenSchema(req, res, next) {
    const schema = Joi.object({
        token: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function validateResetToken(req, res, next) {
    accountService.validateResetToken(req.body)
        .then(() => res.json({ message: 'Token is valid' }))
        .catch(next);
}

function resetPasswordSchema(req, res, next) {
    const schema = Joi.object({
        token: Joi.string().required(),
        acc_passwordHash: Joi.string().min(6).required(), // Updated to match your model
        confirmPassword: Joi.string().valid(Joi.ref('acc_passwordHash')).required() // Updated to match your model
    });
    validateRequest(req, next, schema);
}

function resetPassword(req, res, next) {
    accountService.resetPassword(req.body)
        .then(() => res.json({ message: 'Password reset successful, you can now login' }))
        .catch(next);
}

function getAll(req, res, next) {
    accountService.getAll()
        .then(accounts => res.json(accounts))
        .catch(next);
}

function getById(req, res, next) {
    if (Number(req.params.id) !== req.auth.id && req.auth.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService.getById(req.params.id)
        .then(account => account ? res.json(account) : res.sendStatus(404))
        .catch(next);
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        acc_firstname: Joi.string().required(),
        acc_lastname: Joi.string().required(),
        acc_email: Joi.string().email().required(),
        acc_passwordHash: Joi.string().min(6).required(),
        acc_address: Joi.string().required(),
        confirmPassword: Joi.string().valid(Joi.ref('acc_passwordHash')).required(),
        role: Joi.string().valid(Role.Admin, Role.User).required()
    });
    validateRequest(req, next, schema);
}

function create(req, res, next) {
    accountService.create(req.body)
        .then(account => res.json(account))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        acc_firstName: Joi.string().empty(''),
        acc_lastName: Joi.string().empty(''),
        acc_email: Joi.string().email().empty(''),
        acc_passwordHash: Joi.string().min(6).empty(''),
        acc_address: Joi.string().empty(''),
        acc_status: Joi.string().empty(''), 
        confirmPassword: Joi.string().valid(Joi.ref('acc_passwordHash')).empty('')

    });
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    accountService.update(req.params.id, req.body, req.file)
        .then(account => {
            res.json(account);
        })
        .catch(next);
}


function _delete(req, res, next) {
    accountService.delete(req.params.id)
        .then(() => {
            res.json({ message: 'Account deleted successfully' });
        })
        .catch(next);
}

function updateSubscriptionSchema(req, res, next) {
    const schema = Joi.object({
        acc_subscription: Joi.string().valid('disabled', 'active').required()
    });
    validateRequest(req, next, schema);
}

function updateSubscription(req, res, next) {
    accountService.updateSubscription(req.params.id, req.body.acc_subscription)
        .then(account => res.json(account))
        .catch(next);
}


// helper functions

function setTokenCookie(res, token) {
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + 7*24*60*60*1000)
    };
    res.cookie('refreshToken', token, cookieOptions);
}

function uploadVerificationImage(req, res, next) {
    // Debug
    console.log('Files received:', req.files);
    
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'At least one verification image is required' });
    }

    // Authorization check
    if (Number(req.params.id) !== req.auth.id && req.auth.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService
        .uploadVerificationImage(req.params.id, req.files)
        .then(account => res.json({
            message: 'Verification images uploaded successfully. Pending review.',
            account
        }))
        .catch(error => {
            console.error('Error:', error);
            next(error);
        });
}


function getVerificationStatus(req, res, next) {
    // Check if user is authorized to view this account's verification status
    if (Number(req.params.id) !== req.auth.id && req.auth.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    accountService.checkVerificationStatus(req.params.id)
        .then(status => res.json(status))
        .catch(next);
}

function approveVerificationSchema(req, res, next) {
    const schema = Joi.object({});  // No body needed for approval
    validateRequest(req, next, schema);
}

function approveVerification(req, res, next) {
    accountService.approveVerification(req.params.id, req.auth.id)
        .then(account => res.json({
            message: 'Account verification approved successfully',
            account
        }))
        .catch(next);
}

function rejectVerificationSchema(req, res, next) {
    const schema = Joi.object({});
    validateRequest(req, next, schema);
}

function rejectVerification(req, res, next) {
    accountService.rejectVerification(req.params.id, req.auth.id, req.body.notes)
        .then(account => res.json({
            message: 'Account verification rejected',
            account
        }))
        .catch(next);
}