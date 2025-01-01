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
            const account = await db.Account.findByPk(req.auth.id);
            console.log('Fetched account:', account ? account.dataValues : 'No account found'); // Debugging

            if (!account || (roles.length && !roles.includes(account.acc_role))) {
                console.log('Unauthorized: Role check failed');
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Authentication and authorization successful
            req.auth.role = account.acc_role;
            const refreshTokens = await account.getRefreshTokens();
            req.auth.ownsToken = token => !!refreshTokens.find(x => x.token === token);
            next();
        }
    ];
}
