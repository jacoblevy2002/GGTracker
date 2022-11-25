const express = require('express');
const router = express.Router();
const routeRoot = '/';
const formsView = 'userSignUp.hbs'
const db = require('../models/userModel')
const gamesDB = require('../models/gameModel')
const gameController = require('./gameController')
const errors = require('../errorContainer')
const pino = require('pino')
const logger = pino(pino.destination("logs/controllers/users-log.log"));
const uuid = require('uuid');

const sessionCookieName = "sessionId"

/**
 * Creates a user auth session
 * @param {string} username 
 * @param {string} numHours 
 * @returns The Session object
 */
async function createSession(username, numHours, response) {
    try {
        const sessionId = uuid.v4()
        const expiresAt = new Date(Date.now() + numHours * 3600000)
    
        await db.addSession(sessionId, username, expiresAt)
    
        return { Id: sessionId, ExpiresAt: expiresAt }
    } catch (e) { await errorHandler(e, response) }
}

/**
 * Authenticates a user using a Session
 * @param {*} request 
 * @returns If authenticated, the Session object; Otherwise, null
 */
async function authenticateUser(request, response) {
    try {
        if (!request.cookies) return null
    
        const sessionId = request.cookies.sessionId
        if (!sessionId) return null
    
        let userSession = await db.getSession(sessionId)
        if (!userSession) return null
    
        if (userSession.ExpiresAt < (new Date())) {
            await db.deleteSession(uuid)
            return null
        }
    
        return { sessionId, userSession } // successfully validated
    } catch (e) { await errorHandler(e, response) }
}

/**
 * Refreshes the user's current session
 * @param {*} request 
 * @param {*} response 
 * @returns The refreshed Session's ID
 */
async function refreshSession(request, response) {
    try {
        const authenticatedSession = await authenticateUser(request, response)
        if (!authenticatedSession) return
    
        const newSession = await createSession(authenticatedSession.userSession.Username, 24, response)
    
        await db.deleteSession(authenticatedSession.userSession.UUID)
    
        response.cookie(sessionCookieName, newSession.Id, { expires: newSession.ExpiresAt })
    
        return newSession.Id
    } catch (e) { await errorHandler(e, response) }
}

/**
 * Handles any errors thrown in the controller or model
 * @param {Error} err 
 * @param {*} response 
 * @param {bool} over 
 * @param {object} data 
 */
async function errorHandler(err, response, over = false, data = null) {
    try {
        logger.error(err)
        let options = {}
        let isAdmin 
        if (!over && !(err instanceof errors.DuplicateUsernameError)) {
            options = await genUserList(response, isAdmin);
            isAdmin = response.locals.partials.userContext.loggedIn && await db.isAdmin(response.locals.partials.userContext.user.Username)
        }

        if (err instanceof errors.UnauthorizedAccess) response.status(403)
        else if (err instanceof errors.UnauthenticatedAccess) response.status(401)
        else if (err instanceof errors.UserError) response.status(400)
        else response.status(500)

        if (data) {
            options = data
            options.error = true
            options.errorText = err.message
            response.render(formsView, options)
        } else if (err instanceof errors.InvalidInput) {
            options.warning = true
            options.warningText = err.message
            response.render(isAdmin ? 'users' : 'games', options)
        } else if (err instanceof errors.DatabaseError || err instanceof errors.UnauthorizedAccess || err instanceof errors.UnauthenticatedAccess) {
            options.error = true
            options.errorText = err.message
            response.render(isAdmin ? 'users' : 'games', options)
        } else {
            options.error = true
            options.errorText = err.message
            response.render('genericError', options)
        }
    } catch (err) { await errorHandler(err, response, true) }
}

/**
 * Generates the user list if an admin is logged in, and the game list otherwise
 * @param {*} response 
 * @param {bool} isAdmin 
 * @returns The relevant list
 */
async function genUserList(response, isAdmin) {
    try {
        if (isAdmin) return { users: await db.getAllUsers() }
        else return { games: await gamesDB.getAllGames() }
    } catch (err) { await errorHandler(err, response, true) }
}

/**
 * Displays the form for registering a new user, and registers the user
 * @param {*} request 
 * @param {*} response 
 */
async function addUser(request, response) {
    if (response.locals.partials.userContext.loggedIn) {
        response.redirect('/')
        return
    }
    let data = {}
    if (request.method == "GET") response.render(formsView, data)
    else {
        try {
            let requestJson = request.body
            if (requestJson.loginName) {
                if (await db.checkLogin(requestJson.loginName, requestJson.loginPassword)) {
                    const session = await createSession(requestJson.loginName, 24, response)

                    response.cookie(sessionCookieName, session.Id, { expires: session.ExpiresAt })
                    response.redirect(requestJson.loginBtn ? '/' + requestJson.loginBtn : '/')
                }
            }
            else {
                await db.addEntry(requestJson.name, requestJson.password, requestJson.bio ? requestJson.bio : "", false, requestJson.email)
                data.successText = "User " + requestJson.name + " successfully signed up!"
                data.success = true
                response.render(formsView, data)
            }

        } catch (err) {
            // sets starting values so form is auto-filled
            data.nStartingValue = request.body.name
            data.eStartingValue = request.body.email
            data.bStartingValue = request.body.bio
            data.nlStartingValue = request.body.loginName
            await errorHandler(err, response, false, data)
        }
    }
}
router.all('/signup', addUser)
router.all('/login', addUser)

/**
 * Displays the list of users, if the logged in user is an admin
 * @param {*} request 
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in
 * @throws {UnauthorizedAccess} If the logged in user is not an admin
 */
let getUsers = async (request, response) => {
    try {
        await checkUserIsAdmin(response)
        response.render('users.hbs', { users: await db.getAllUsers() })
    }
    catch (err) { await errorHandler(err, response) }
}
router.all('/users', getUsers)

/**
 * Displays the information of a specific user
 * @param {*} request 
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in AND did not provide a user to lookup
 */
let getUser = async (request, response) => {
    try {
        let user
        if (request.query.name) {
            if (response.locals.partials.userContext.loggedIn && response.locals.partials.userContext.user.Username == request.query.name) user = await db.getUser(request.query.name)
            else user = await isPagePrivate(request.query.name, response, db.getUser)
        }
        else if (response.locals.partials.userContext.loggedIn) user = await db.getUser(response.locals.partials.userContext.user.Username)
        else throw new errors.UnauthenticatedAccess("You must be logged in to see this page")
        response.render('singleUser.hbs', {user: user})
    } catch (err) { await errorHandler(err, response) }
}
router.all('/user', getUser)

/**
 * Checks if a user-based page is private, based on the user's preferences
 * @param {String} name
 * @param {*} response
 * @param {Function} callIfPublic
 * @throws {UnauthorizedAccess} If the user is not logged in
 */
let isPagePrivate = async (name, response, callIfPublic) => {
    if (!(await db.isPublic(name))) {
        if (response.locals.partials.userContext.loggedIn && (response.locals.partials.userContext.user.IsAdmin || response.locals.partials.userContext.user.Username.toLowerCase() == name.toLowerCase())) return await callIfPublic(name, response)
        else throw new errors.UnauthorizedAccess("You do not have access to this page!")
    } else return await callIfPublic(name, response)
}

/**
 * Edits a user's profile - can only be accessed by that user
 * @param {*} request
 * @param {*} response
 * @throws {UnauthenticatedAccess} If the user is not logged in
 * @throws {UnauthorizedAccess} If the user is attempting to edit somebody else's profile 
 */
let editUser = async (request, response) => {
    try {
        if (!response.locals.partials.userContext.loggedIn) throw new errors.UnauthenticatedAccess("You must be logged in to use this page!")
        let requestJson = request.body
        if (response.locals.partials.userContext.user.Username != requestJson.oldName) throw new errors.UnauthorizedAccess("You do not have permission to edit another person's profile!")
        await db.updateUser(requestJson.oldName, requestJson.name, requestJson.bio, requestJson.email, requestJson.public ? true : false)
        await createSession(requestJson.name, 24, response) // create a new session cookie because their previous one would include the incorrect username
        response.redirect('/user')
    } catch (err) { await errorHandler(err, response) }
}
router.post('/user/edit', editUser)

/**
 * Deletes a user from the database
 * @param {*} request
 * @param {*} response
 * @throws {UnauthenticatedAccess} If the user is not logged in
 * @throws {UnauthorizedAccess} If the logged in user is not an admin
 */
async function deleteUser(request, response) {
    try {
        await checkUserIsAdmin(response)
        let requestJson = request.body
        await db.deleteUser(requestJson.name)
        logger.info(`The user ${requestJson.name} has been deleted by ${response.locals.partials.userContext.user.Username}.`)
        response.render('users.hbs', { success: true, successText: `User ${requestJson.name} has been banned.`, users: await db.getAllUsers() })
    } catch (err) { await errorHandler(err, response) }
}
router.post('/users/delete', deleteUser)

/**
 * Deletes your own account. Requires a specific POST parameter, avoiding accidental account deletion
 * @param {*} request 
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in
 */
async function deleteSelf(request, response) {
    try {
        if (!response.locals.partials.userContext.loggedIn) throw new errors.UnauthenticatedAccess("You must be logged in to view this page!")
        
        if (request.method == "POST" && request.body.confirmDelete)
        {
            await db.deleteUser(response.locals.partials.userContext.user.Username)
            logger.info(`The user ${response.locals.partials.userContext.user.Username} has deleted their account.`)
            response.redirect('/')
        } else throw new errors.InvalidInput("Careful! This page will permanently delete your account. Do NOT follow links here.")
    } catch (err) { await errorHandler(err, response) }
}
router.all('/user/delete', deleteSelf)

/**
 * Logs out the current user session
 * @param {*} request 
 * @param {*} response 
 */
async function logoutUser(request, response) {
    try {
        if (!response.locals.partials.userContext.loggedIn) {
            response.redirect('/')
            return
        }
    
        await db.deleteSession(response.locals.partials.userContext.user.UUID)
        logger.info("User " + response.locals.partials.userContext.user.Username + " has logged out, and session was deleted")
        response.cookie(sessionCookieName, "", { expires: new Date() })   // force cookie to expire
        response.redirect('/')
    } catch (e) { await errorHandler(e, response) }
}
router.all('/logout', logoutUser)

/**
 * Adds game to a user's collection
 * @param {*} request 
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in
 */
async function addGameToUser(request, response) {
    try {
        if (!response.locals.partials.userContext.loggedIn) { throw new errors.UnauthenticatedAccess("You must be logged in to view this page!") }
        let requestJson = request.body
        
        await db.addGameToUser(response.locals.partials.userContext.user.Username, requestJson.addGameID, requestJson.hours, requestJson.liked ? true : false)
        let options = {success: true, successText: `${(await gamesDB.getGameById(requestJson.addGameID)).name} added to your collection.`}
        let opts = await gameController.genGameListOptions(response, request, null, options);
        response.render('games', opts)
    } catch (err) { await errorHandler(err, response) }
}
router.post('/users/games', addGameToUser)

/**
 * Displays a user's games
 * @param {*} request 
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in
 */
async function getUserGames(request, response) {
    try {
        let games
        if (request.query.name) {
            if (response.locals.partials.userContext.loggedIn && response.locals.partials.userContext.user.Username == request.query.name) games = await getGamesForUser(response.locals.partials.userContext.user.Username, response)
            else games = await isPagePrivate(request.query.name, response, getGamesForUser)
        }
        else if (response.locals.partials.userContext.loggedIn) games = await getGamesForUser(response.locals.partials.userContext.user.Username, response)
        else throw new errors.UnauthenticatedAccess("You must be logged in to see this page!")

        response.render('userGames', { games: games, name: request.query.name ? request.query.name : response.locals.partials.userContext.user.Username, active: { collection: true } })
    } catch (err) { await errorHandler(err, response) }
}
router.get('/users/games', getUserGames)

async function getGamesForUser(user, response) {
    try {
        let games = await db.getUsersGames(user)
    
        if (response.locals.partials.userContext.loggedIn)
            for (let i = 0; i < games.length; i++)
                games[i].canAddGame = await db.canUserAddGame(response.locals.partials.userContext.user.Username, games[i].id)
        
        return games
    } catch (e) { await errorHandler(e, response) }
}

/**
 * Removes a game from a user's collection
 * @param {*} request 
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in
 */
async function removeGameFromUser(request, response) {
    try {
        if (!response.locals.partials.userContext.loggedIn) throw new errors.UnauthenticatedAccess("You must be logged in to view this page!")

        await db.removeGameFromUser(response.locals.partials.userContext.user.Username, request.body.removeGameID)

        // render line is temporary - should direct to the user's games
        let options = {success: true, successText: `${(await gamesDB.getGameById(request.body.removeGameID)).name} removed from your collection.` }
        let opts = await gameController.genGameListOptions(response, request, null, options);
        response.render('games', opts);
        //response.render('games', { games: await db.getUsersGames(response.locals.partials.userContext.user.Username), success: true, successText: `${(await gamesDB.getGameById(request.body.removeGameID)).name} removed from your collection.` })
    } catch (err) { await errorHandler(err, response) }
}
router.post('/users/games/remove', removeGameFromUser)

/**
 * Updates user stats on game in their collection
 * @param {*} request 
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in
 */
async function updateGameForUser(request, response) {
    try {
        if (!response.locals.partials.userContext.loggedIn) throw new errors.UnauthenticatedAccess("You must be logged in to view this page!")

        let requestJson = request.body
        await db.updateUserGame(response.locals.partials.userContext.user.Username, requestJson.game, requestJson.hours, requestJson.liked ? true : false)
        
        let game = await gamesDB.getGameById(requestJson.game);
        let opts = await gameController.genSingleGameOptions(response, game);
        opts.admin = await db.isAdmin(response.locals.partials.userContext.user.Username)
        opts.canAddGame = false
        opts.editStarting = await db.getUserGameStats(response.locals.partials.userContext.user.Username, requestJson.game)
        opts.success = true
        opts.successText = "Successfully updated game information!"
        
        response.render("singleGame", opts);
    } catch (e) { await errorHandler(e, response) }
}
router.post('/users/games/edit', updateGameForUser)

/**
 * Promotes a user to admin
 * @param {*} request 
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in
 * @throws {UnauthorizedAccess} If the user is not an admin
 */
async function promoteUser(request, response) {
    try {
        await checkUserIsAdmin(response)
        let requestJson = request.body
        await db.promoteUser(requestJson.name)
        logger.info(`The user ${requestJson.name} has been promoted by ${response.locals.partials.userContext.user.Username}.`)
        response.render('users.hbs', { success: true, successText: `User ${requestJson.name} has been promoted.`, users: await db.getAllUsers() })
    } catch (e) { await errorHandler(e, response) }
}
router.post('/users/promote', promoteUser)

/**
 * Demote an admin
 * @param {*} request 
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in
 * @throws {UnauthorizedAccess} If the user is not an admin
 */
async function demoteUser(request, response) {
    try {
        await checkUserIsAdmin(response)
        let requestJson = request.body
        await db.demoteUser(requestJson.name)
        logger.info(`The user ${requestJson.name} has been demoted by ${response.locals.partials.userContext.user.Username}.`)
        response.render('users.hbs', { success: true, successText: `User ${requestJson.name} has been demoted.`, users: await db.getAllUsers() })
    } catch (e) { await errorHandler(e, response) }
}
router.post('/users/demote', demoteUser)

/**
 * Checks if the current user is an admin
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in
 * @throws {UnauthorizedAccess} If the user is not an admin
 */
 let checkUserIsAdmin = async (response) => {
    if(!response.locals.partials.userContext.loggedIn)     throw new errors.UnauthenticatedAccess("You do not have access to this page!")
    if(!response.locals.partials.userContext.user.IsAdmin) throw new errors.UnauthorizedAccess("You do not have access to this page!")
  }
module.exports = {
    router,
    routeRoot,
    refreshSession,
    authenticateUser
}
