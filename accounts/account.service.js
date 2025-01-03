const config = require('config.json');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require("crypto");
const sendEmail = require('_helpers/send-email');
const path = require('path');
const db = require('_helpers/db');
const Role = require('_helpers/role');



module.exports = {
    authenticate,
    refreshToken,
    revokeToken,
    register,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function authenticate({ acc_email, acc_passwordHash, ipAddress }) {
    const account = await db.Account.scope('withHash').findOne({ where: { acc_email } });

    if (!account.acc_verified) {
        throw 'Account not verified. Please check your email to verify your account.';
    }

    if (!account || !(await bcrypt.compare(acc_passwordHash, account.acc_passwordHash))) { 
        throw 'Email or password is incorrect';
    }

    if (account.acc_status === 'Inactive') {
        throw 'Your account is disabled. Please contact the administrator.';
    }

    const jwtToken = generateJwtToken(account);
    const refreshToken = generateRefreshToken(account, ipAddress);

    await refreshToken.save();

    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: refreshToken.token
    };
}

async function refreshToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    const account = await refreshToken.getAccount();

    const newRefreshToken = generateRefreshToken(account, ipAddress);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();
    await newRefreshToken.save();

    const jwtToken = generateJwtToken(account);

    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: newRefreshToken.token
    };
}

async function revokeToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}

async function register(params, origin) {
    if (await db.Account.findOne({ where: { acc_email: params.acc_email } })) {
        return await sendAlreadyRegisteredEmail(params.acc_email, origin);
    }

    const account = new db.Account(params);

    const isFirstAccount = (await db.Account.count()) === 0;
    account.acc_role = isFirstAccount ? Role.Admin : Role.User;
    account.acc_verificationToken = randomTokenString();

    account.acc_passwordHash = await hash(params.acc_password);

    await account.save();

    await sendVerificationEmail(account, origin);
}

async function verifyEmail({ token }) {
    const account = await db.Account.findOne({ where: { acc_verificationToken: token } });

    if (!account) throw 'Verification failed';

    account.acc_verified = Date.now();
    account.acc_verificationToken = null;
    await account.save();
}

async function forgotPassword({ acc_email }, origin) {
    const account = await db.Account.findOne({ where: { acc_email } });

    if (!account) return;

    account.acc_resetToken = randomTokenString();
    account.acc_resetTokenExpires = new Date(Date.now() + 24*60*60*1000);
    await account.save();

    await sendPasswordResetEmail(account, origin);
}

async function validateResetToken({ token }) {
    const account = await db.Account.findOne({
        where: {
            acc_resetToken: token,
            acc_resetTokenExpires: { [Op.gt]: Date.now() }
        }
    });

    if (!account) throw 'Invalid token';

    return account;
}

async function resetPassword({ token, password }) {
    const account = await validateResetToken({ token });

    account.acc_passwordHash = await hash(password);
    account.acc_passwordReset = Date.now();
    account.acc_resetToken = null;
    await account.save();
}

async function getAll() {
    const accounts = await db.Account.findAll();
    return accounts.map(x => basicDetails(x));
}

async function getById(id) {
    const account = await getAccount(id);
    return basicDetails(account);
}

async function create(params) {
    if (await db.Account.findOne({ where: { acc_email: params.acc_email } })) {
        throw 'Email "' + params.acc_email + '" is already registered';
    }

    const account = new db.Account(params);
    account.acc_verified = Date.now();

    account.acc_passwordHash = await hash(params.acc_password);

    await account.save();

    return basicDetails(account);
}

async function update(id, params, file) {
    try {
        const account = await getAccount(id);
        
        if (file) { 
            const newImagePath = path.basename(file.path);  // Safely access file path
            params.acc_image = newImagePath;
        } else {
            throw new Error("Image file is missing or path is not defined.");
        }
        

        // Validate email if it has changed
        const emailChanged = params.acc_email && account.acc_email !== params.acc_email;
        if (emailChanged && await db.Account.findOne({ where: { acc_email: params.acc_email } })) {
            throw new Error('Email "' + params.acc_email + '" is already registered');
        }

        // Hash password if provided
        if (params.acc_passwordHash) {
            params.acc_passwordHash = bcrypt.hashSync(params.acc_passwordHash, 10);
        }

        // Copy params to account and save
        Object.assign(account, params);
        await account.save();

        return basicDetails(account);
    } catch (error) {
        // Handle errors appropriately, possibly logging the error
        throw new Error('Failed to update account: ' + error.message);
    }
}


async function _delete(id) {
    const account = await getAccount(id);
    await account.destroy();
}

async function getAccount(id) {
    const account = await db.Account.findByPk(id);
    if (!account) throw 'Account not found';
    return account;
}

async function getRefreshToken(token) {
    const refreshToken = await db.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
    return refreshToken;
}

async function hash(password) {
    return await bcrypt.hash(password, 10);
}

function generateJwtToken(account) {
    return jwt.sign({ sub: account.id, id: account.id }, config.secret, { expiresIn: '15m' });
}

function generateRefreshToken(account, ipAddress) {
    return new db.RefreshToken({
        accountId: account.id,
        token: randomTokenString(),
        expires: new Date(Date.now() + 7*24*60*60*1000),
        createdByIp: ipAddress
    });
}

function randomTokenString() {
    return crypto.randomBytes(40).toString('hex');
}

function basicDetails(account) {
    const { id, acc_firstName, acc_lastName, acc_email, acc_role, acc_created, acc_updated, acc_isVerified, acc_image, acc_address } = account;
    return { id, acc_firstName, acc_lastName, acc_email, acc_role, acc_created, acc_updated, acc_isVerified, acc_image, acc_address };
}

async function sendVerificationEmail(account, origin) {
    let message;
    if (origin) {
        const verifyUrl = `${origin}/account/verify-email?token=${account.acc_verificationToken}`;
        message = `<p>Please click the below link to verify your email address:</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
    } else {
        message = `<p>Please use the below token to verify your email address with the <code>/account/verify-email</code> api route:</p>
                   <p><code>${account.acc_verificationToken}</code></p>`;
    }

    await sendEmail({
        to: account.acc_email,
        subject: 'Sign-up Verification API - Verify Email',
        html: `<h4>Verify Email</h4>
               <p>Thanks for registering!</p>
               ${message}`
    });
}

async function sendAlreadyRegisteredEmail(email, origin) {
    let message;
    if (origin) {
        message = `<p>If you don't know your password please visit the <a href="${origin}/account/forgot-password">forgot password</a> page.</p>`;
    } else {
        message = `<p>If you don't know your password you can reset it via the <code>/account/forgot-password</code> api route.</p>`;
    }

    await sendEmail({
        to: email,
        subject: 'Sign-up Verification API - Email Already Registered',
        html: `<h4>Email Already Registered</h4>
               <p>Your email <strong>${email}</strong> is already registered.</p>
               ${message}`
    });
}

async function sendPasswordResetEmail(account, origin) {
    let message;
    if (origin) {
        const resetUrl = `${origin}/account/reset-password?token=${account.acc_resetToken}`;
        message = `<p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    } else {
        message = `<p>Please use the below token to reset your password with the <code>/account/reset-password</code> api route:</p>
                   <p><code>${account.acc_resetToken}</code></p>`;
    }

    await sendEmail({
        to: account.acc_email,
        subject: 'Sign-up Verification API - Reset Password',
        html: `<h4>Reset Password Email</h4>
               ${message}`
    });
}