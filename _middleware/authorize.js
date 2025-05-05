const jwt = require('express-jwt');
const { secret } = require('config.json');
const db = require('_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        // Authenticate JWT token and attach user to request object (req.auth)
        jwt.expressjwt({ secret, algorithms: ['HS256'] }),

        // Authorize based on user role
        async (req, res, next) => {
            console.log('Token payload:', req.auth); // Debugging: Check JWT payload
            
            // Make sure the ID in req.auth is correctly extracted
            if (!req.auth || !req.auth.id) {
                console.log('Unauthorized: Missing or invalid token payload');
                return res.status(401).json({ message: 'Unauthorized - Invalid token format' });
            }
            
            const account = await db.Account.findByPk(req.auth.id);
            console.log('Fetched account:', account ? account.dataValues : 'No account found'); // Debugging

            if (!account) {
                console.log('Unauthorized: Account not found');
                return res.status(401).json({ message: 'Unauthorized - Account not found' });
            }
            
            // Role-based authorization check
            if (roles.length && !roles.includes(account.acc_role)) {
                console.log('Unauthorized: Role check failed. Account role:', account.acc_role, 'Required roles:', roles);
                return res.status(401).json({ message: 'Unauthorized - Insufficient permissions' });
            }

            // Authentication and authorization successful
            req.auth.role = account.acc_role;
            
            // Get refreshTokens for the account
            try {
                const refreshTokens = await account.getRefreshTokens();
                req.auth.ownsToken = token => !!refreshTokens.find(x => x.token === token);
            } catch (error) {
                console.error('Error getting refresh tokens:', error);
                // Don't fail the whole request if refreshTokens fails
                req.auth.ownsToken = () => false;
            }
            
            next();
        }
    ];
}