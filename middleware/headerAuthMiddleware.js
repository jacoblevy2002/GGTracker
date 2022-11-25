const userController = require('../controllers/userController');
const userModel = require('../models/userModel')


async function getUserAuthMiddleware(req, res, next)  {
    res.locals.partials = {};
    let user = await userController.authenticateUser(req, res);
    if (user) {
        res.locals.partials.userContext = {
            loggedIn: true,
            user: user.userSession
        };
        res.locals.partials.userContext.user.IsAdmin = await userModel.isAdmin(user.userSession.Username)
    } else {
        res.locals.partials.userContext = {
            loggedIn: false
        };
    }
    next();

}

module.exports = getUserAuthMiddleware;