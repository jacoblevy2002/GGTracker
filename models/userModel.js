//This controls user actions and actions like adding a game to a user's library
const database = require ("./globalModel.js");
const gameModel = require('./gameModel')
const errors = require('../errorContainer')
const userTable = "Users"
const userGameTable = "UsersGames"
const pino = require("pino")
const logger = pino(pino.destination("logs/models/users-log.log"));
const validator = require('validator')
const bcrypt = require('bcrypt')

const maxNameLength = 20
const maxEmailLength = 50
const saltRounds = 10

/**
 * Add a user to the database and return the user object
 * @param {string} username 
 * @param {string} pass 
 * @param {string} bio 
 * @param {bool} admin 
 * @param {string} email 
 * @param {bool} publicStatus
 * @returns The user object
 * @throws {DuplicateUsernameError} If the username or email is already in use
 * @throws {DatabaseError} If there is an unexpected database error
 * @throws {InvalidPassword} If the password is invalid
 * @throws {InvalidEmail} If the email is invalid
 * @throws {InvalidUsername} If the username is invalid
 */
async function addEntry(username, pass, bio, admin, email, publicStatus = true) {
    await validateInfo(username, pass, email, bio)

    await database.getConnection().execute("INSERT INTO " + userTable + "(username, joinDate, password, bio, admin, email, public) values(?, ?, ?, ?, ?, ?, ?);", [username, new Date(Date.now()).toISOString().split('T')[0], await bcrypt.hash(pass, saltRounds), bio, admin, email, publicStatus])
        .catch((error) => {
            if (error.code == "ER_DUP_ENTRY") {
                logger.warn("Attempted user creation with the existing username " + username)
                throw new errors.DuplicateUsernameError("Username and/or email is already in use")
            } else {
                logger.error(error)
                throw new errors.DatabaseError("Unexpected server-side error")
            }
        })

    logger.info("User " + username + " added to the database.")
    return {
        "Username": username,
        "Bio": bio,
        "IsAdmin": admin ? true : false,     // want the actual boolean value to be returned, not the raw value of admin
        "Email": email,
        "Public": publicStatus ? true : false
    }
}

/**
 * Adds a session to the database, for user authentication
 * @param {string} uuid 
 * @param {string} username 
 * @param {Date} expiresAt 
 * @throws {InvalidUsername} If the username is invalid
 * @throws {DatabaseError} If there is an unexpected database error
 */
async function addSession(uuid, username, expiresAt) {
    if (username.includes("@")) username = await getNameFromEmail(username)
    await validateName(username)

    await database.getConnection().execute("INSERT INTO Sessions (uuid, username, expiresAt) values (?, ?, ?);", [uuid, username, expiresAt.toISOString().slice(0, 19).replace('T', ' ')])
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error")})
    
    logger.info("New Session created for user " + username)
}

let getNameFromEmail = async (email) => {
    await validateName(email, { AllowEmails: true })
    return (await database.getConnection().execute(`SELECT username FROM ${userTable} where email = ?`, [email]).catch((error) => { logger.error(error); throw new errors.DatabaseError('Unexpected server-side error')}))[0][0].username
}
/**
 * Gets a session from the database
 * @param {string} uuid 
 * @returns Session object
 * @throws {DatabaseError} If there is an unexpected database error
 */
async function getSession(uuid) {
    let r = (await database.getConnection().execute("SELECT uuid, username, expiresAt from Sessions where uuid = ?", [uuid])
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") }))[0]
    
    if (r.length === 0) return null

    return {
        UUID: r[0].uuid,
        Username: r[0].username,
        ExpiresAt: r[0].expiresAt
    }
}

/**
 * Deletes a session from the database
 * @param {string} uuid 
 * @throws {DatabaseError} If there is an unexpected database error
 */
let deleteSession = async (uuid) => await database.getConnection().execute("DELETE from Sessions where uuid = ?", [uuid]).catch((error) => {logger.error(error); throw new errors.DatabaseError("Unexpected server-side error")}) 

/**
 * Checks the login credentials of a potential user, returning whether or not it is valid
 * @param {string} username 
 * @param {string} pass 
 * @returns If a valid login, then the user's username. Otherwise, null
 * @throws {InvalidUsername} If the username is invalid
 * @throws {InvalidEmail} If the email is invalid (assuming the user logged in using email)
 * @throws {DatabaseError} If there is an unexpected database error
 * @throws {InvalidLogin} If the login is invalid
 */
async function checkLogin(username, pass) {
	await validateName(username, { AllowEmails: true })
	
    let toCheck = username.includes("@") ? "email" : "username"

    let r = (await database.getConnection().execute(`SELECT username, password from ${userTable} where ${toCheck} = ?`, [username])
            .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") }))[0]
    
    if (r.length == 1 && await bcrypt.compare(pass, r[0].password)) return r[0].username
    else throw new errors.InvalidLogin(`Incorrect username/email or password!`)
}

/**
 * Promotes a non-admin user to admin status
 * @param {string} username 
 * @throws {InvalidUsername} If the username is invalid
 * @throws {DatabaseError} If there is an unexpected database error
 * @throws {InvalidAdminChange} If the user is already an admin
 */
async function promoteUser(username) {
    if (await isAdmin(username)) throw new errors.InvalidAdminChange("Invalid input - " + username + " is already an admin")

    await database.getConnection().execute("UPDATE " + userTable + " set admin = 1 WHERE username = ?", [username])
        .then(() => logger.info("User " + username + " promoted to admin"))
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") })
}

/**
 * Demotes an admin user to non-admin status
 * @param {string} username 
 * @throws {InvalidUsername} If the username is invalid
 * @throws {DatabaseError} If there is an unexpected database error
 * @throws {InvalidAdminChange} If the user is not an admin
 */
async function demoteUser(username) {
    if (!(await isAdmin(username))) throw new errors.InvalidAdminChange("Invalid input - " + username + " is not an admin")

    await database.getConnection().execute("UPDATE " + userTable + " set admin = 0 WHERE username = ?", [username])
        .then(() => logger.info("User " + username + " demoted from admin"))
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") })
}

/**
 * Checks whether or not a user is an admin
 * @param {string} username 
 * @returns The admin status of the user
 * @throws {InvalidUsername} If the username is invalid
 * @throws {DatabaseError} If there is an unexpected database error
 */
async function isAdmin(username) {
    await validateName(username)

    return (await database.getConnection().execute("SELECT admin from " + userTable + " WHERE username = ?", [username])
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") }))[0][0].admin
}

/**
 * Deletes a user from the database, and wipes their collection
 * @param {string} username 
 * @throws {InvalidUsername} If the username is invalid
 * @throws {DatabaseError} If there is an unexpected database error
 */
async function deleteUser(username) {
    await validateName(username)

    await database.getConnection().execute("DELETE FROM " + userGameTable + " WHERE user = ?", [username])
        .then(() => logger.info("User " + username + "'s games cleared"))
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") })

    await database.getConnection().execute(`DELETE FROM Sessions WHERE username = ?`, [username])
        .then(() => logger.info(`User ${username}'s sessions cleared`))
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error")})
    
    await database.getConnection().execute("DELETE FROM " + userTable + " WHERE username = ?", [username])
        .then(() => logger.info("User " + username + " removed from the database"))
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") })
}

/**
 * Adds a game to a user's collection
 * @param {string} username 
 * @param {int} gameID 
 * @param {int} playtime 
 * @param {int} rating 
 * @returns The UserGame object
 * @throws {InvalidUsername} If the username is invalid
 * @throws {InvalidId} If the game ID is invalid
 * @throws {InvalidPlaytime} If the playtime is invalid
 * @throws {DuplicateGame} If the user already owns the game
 * @throws {DatabaseError} If there is an unexpected database error
 */
async function addGameToUser(username, gameID, playtime, rating) {
    await validateName(username)
    if (!gameModel.validateId(gameID)) throw new errors.InvalidId("Invalid input - " + gameID + " is not a valid game ID")
    validatePlaytime(playtime)
	if (rating == undefined) rating = null

    if (!(await canUserAddGame(username, gameID))) throw new errors.DuplicateGame("You already own that game!")

    await database.getConnection().execute("INSERT INTO " + userGameTable + " (user, gameID, playtime, rating) values(?, ?, ?, ?);", [username, gameID, playtime, rating])
        .then(() => logger.info("Game with ID " + gameID + " added to " + username + "'s collection."))
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") })
    
    return {
        user: username,
        gameID: gameID,
        playtime: playtime,
        rating: rating ? true : false       // returns the bool value, not the raw value of the var
    }
}

/**
 * Removes a game from a user's collection
 * @param {string} username 
 * @param {int} gameID
 * @throws {InvalidUsername} If the username is invalid
 * @throws {InvalidId} If the game ID is invalid
 * @throws {DatabaseError} If there is an unexpected database error 
 */
async function removeGameFromUser(username, gameID) {
    await validateName(username)
    if (!gameModel.validateId(gameID)) throw new errors.InvalidId("Invalid input - " + gameID + " is not a valid game ID")

    await database.getConnection().execute(`DELETE FROM ${userGameTable} WHERE user = ? AND gameID = ?`, [username, gameID])
        .then(() => logger.info(`Game with ID ${gameID} removed from ${username}'s collection`))
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") })
}

/**
 * Gets a user's collection
 * @param {string} username 
 * @returns The Game objects representing the user's collection
 * @throws {InvalidUsername} If the username is invalid
 * @throws {DatabaseError} If there is an unexpected database error
 */
async function getUsersGames(username) {
    await validateName(username)

    let r = (await database.getConnection().execute(
        "SELECT Games.id as 'id', Games.name as 'name', Games.description as 'description', Games.image as 'image', UsersGames.playtime as 'playtime', UsersGames.rating as 'rating' from Games, " + userGameTable + " where Games.id = UsersGames.gameID and UsersGames.user = ?", [username])
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") }))[0]

    logger.info("Retrieved games from " + username + "'s collection.")
    return r
}

/**
 * Checks whether or not a user can add a game to their collection
 * @param {string} username 
 * @param {int} gameID 
 * @returns Boolean value representing whether or not the user can add the game to their collection
 * @throws {InvalidUsername} If the username is invalid
 * @throws {InvalidId} If the game ID is invalid
 * @throws {DatabaseError} If there is an unexpected database error
 */
async function canUserAddGame(username, gameID) {
    await validateName(username)
    if (!gameModel.validateId(gameID)) throw new errors.InvalidId("Invalid input - " + gameID + " is not a valid game ID")

    let entries = (await database.getConnection().execute(`SELECT user FROM ${userGameTable} WHERE user = ? AND gameID = ?`, [username, gameID]).catch((err) => { logger.error(err); throw new errors.DatabaseError("Unexpected server-side error") }))[0]
    
    if (entries.length != 0) return false
    
    return true
}

/**
 * Updates a user's game to the new playtime and rating
 * @param {string} username 
 * @param {int} gameID 
 * @param {int} playtime 
 * @param {bool} rating
 * @throws {InvalidUsername} If the username is invalid
 * @throws {InvalidId} If the game ID is invalid
 * @throws {InvalidPlaytime} If the playtime is invalid
 * @throws {DatabaseError} If there is an unexpected database error 
 */
let updateUserGame = async (username, gameID, playtime, rating) => {
    await validateName(username)
    if (!gameModel.validateId(gameID)) throw new errors.InvalidId(`Invalid input - ${gameID} is not a valid game ID`)
	if (await canUserAddGame(username, gameID)) throw new errors.GameNotFound("You do not own that game!")
    validatePlaytime(playtime)
	if (rating == undefined) rating = null

    await database.getConnection().execute(`UPDATE ${userGameTable} SET playtime = ?, rating = ? WHERE user = ? AND gameID = ?`, [playtime, rating, username, gameID])
        .then(() => logger.info(`${username} changed their records on game with ID ${gameID} to playtime of ${playtime} and rating of ${rating}`))
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error")})
}

/**
 * @param {string} username
 * @param {int} gameID
 * @throws {InvalidUsername} If the username is invalid
 * @throws {InvalidId} If the game ID is invalid
 * @throws {DatabaseError} If there is an unexpected database error
 * @returns The user's stats for the specified game
 */
let getUserGameStats = async (username, gameID) => {
    await validateName(username)
    if (!gameModel.validateId(gameID)) throw new errors.InvalidId(`Invalid input - ${gameID} is not a valid game ID`)
	if (await canUserAddGame(username, gameID)) throw new errors.GameNotFound('You do not own that game!')

    let r = (await database.getConnection().execute(`SELECT playtime as 'Playtime', rating as 'Rating' FROM ${userGameTable} WHERE user = ? AND gameID = ?`, [username, gameID])
            .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error")}))[0][0]
    return r;
}

/**
 * Gets all users in the database
 * @returns All users
 * @throws {DatabaseError} If there is an unexpected database error
 */
let getAllUsers = async () => (await database.getConnection().execute(`SELECT username as 'Username', email as 'Email', joinDate as 'JoinDate', admin as 'IsAdmin' FROM ${userTable}`, []).catch((error) => { logger.error(error); throw new errors.DatabaseError('Unexpected server-side error')}))[0]

/**
 * Gets a user in the database
 * @returns The user
 * @throws {DatabaseError} If there is an unexpected database error
 */
 let getUser = async (username) => {
     await validateName(username)
     return (await database.getConnection().execute(`SELECT username as 'Username', bio as 'Bio', public as 'IsPublic', email as 'Email', joinDate as 'JoinDate', admin as 'IsAdmin' FROM ${userTable} where username = ?`, [username]).catch((error) => { logger.error(error); throw new errors.DatabaseError('Unexpected server-side error')}))[0][0]
 }

 /**
  * Updates a user's username, email, and bio
  * @param {string} oldUsername 
  * @param {string} newUsername 
  * @param {string} bio 
  * @param {string} email
  * @param {bool} publicStatus
  * @throws {InvalidEmail} If the email is invalid
  * @throws {InvalidUsername} If the username is invalid 
  * @throws {DuplicateUsernameError} If the new username or email already exist in the database
  * @throws {DatabaseError} If there is an unexpected database error
  */
 let updateUser = async (oldUsername, newUsername, bio, email, publicStatus) => {
     await validateName(oldUsername)
     if (oldUsername != newUsername) await validateName(newUsername, { DoesntExist: true})
     validateEmail(email)
	 validateBio(bio)
     
     let e = (await database.getConnection().execute(`SELECT email FROM ${userTable} WHERE email = ? AND NOT username = ?`, [email, oldUsername]).catch((err) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error")}))[0]
     if (e.length > 0) throw new errors.DuplicateUsernameError("That email is already taken!")

     await database.getConnection().execute(`UPDATE ${userTable} SET username = ?, email = ?, bio = ?, public = ? WHERE username = ?`, [newUsername, email, bio, publicStatus, oldUsername])
        .then(() => logger.info(`User ${oldUsername} changed their username to ${newUsername}, their email to ${email}, and their bio to ${bio}`))
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error") })
 }

 /**
  * Checks if a user's profile is public
  * @param {string} username  
  * @throws {InvalidUsername} If the username is invalid
  * @throws {DatabaseError} If there is an unexpected database error
  * @returns The publicity of the user's profile
  */
 let isPublic = async (username) => {
     await validateName(username)

     return (await database.getConnection().execute(`SELECT public as 'publicStatus' from ${userTable} WHERE username = ?`, [username])
        .catch((error) => {logger.error(error); throw new errors.DatabaseError("Unexpected server-side error")}))[0][0].publicStatus
 }

 /**
  * Updates a user's bio
  * @param {string} username 
  * @param {string} bio
  * @throws {InvalidUsername} If the username is invalid
  * @throws {InvalidInput} If the bio is invalid
  * @throws {DatabaseError} If there is an unexpected database error 
  */
 let updateBio = async (username, bio) => {
     await validateName(username)
	 validateBio(bio)

     await database.getConnection().execute(`UPDATE ${userTable} SET bio = ? WHERE username = ?`, [bio, username])
        .then(() => logger.info(`User ${username} changed their bio to ${bio}`))
        .catch((error) => { logger.error(error); throw new errors.DatabaseError("Unexpected server-side error")})
 }

/**
 * Validates user registration information
 * @param {string} name 
 * @param {string} pass 
 * @param {string} email 
 * @returns If info is valid, true; Otherwise null
 * @throws {InvalidUsername} If the username is invalid
 * @throws {InvalidEmail} If the email is invalid
 * @throws {InvalidPassword} If the password is invalid
 */
let validateInfo = async (name, pass, email, bio) => validatePassword(pass) && await validateName(name, { DoesntExist: true }) && validateEmail(email) && validateBio(bio)

/**
 * Validates playtime for collection adding
 * @param {int} playtime 
 * @returns If playtime is valid, true; Otherwise null
 * @throws {InvalidPlaytime} If the playtime is invalid
 */
let validatePlaytime = (playtime) => {
    if (!playtime || playtime != Number.parseInt(playtime)) throw new errors.InvalidPlaytime("Invalid input - " + playtime + " is not a valid playtime")
    return true
}

/**
 * Validates usernames
 * @param {string} name 
 * @param {object} options 
 * @property {bool} options.DoesntExist True if the name cannot exist in the database; False if it must
 * @property {bool} options.AllowEmails True if emails should pass verification; False otherwise
 * @returns If the username is valid, true; Otherwise, null
 * @throws {InvalidUsername} If the username is invalid
 * @throws {DatabaseError} If there is an unexpected database error
 * @throws {DuplicateUsernameError} If the username already exists in the database AND options.DoesntExist is set to True
 */
let validateName = async (name, options = { DoesntExist: false, AllowEmails: false }) => {
    if (!name || typeof name != 'string' || name.includes(" ")) throw new errors.InvalidUsername("Usernames must exist and not contain spaces!")
    
    let isEmail = name.includes("@") && options.AllowEmails

    if (name.includes("@") && !options.AllowEmails) throw new errors.InvalidUsername("Usernames must not contain @ signs")
	
	if (isEmail) validateEmail(name)

    if (name.length > maxEmailLength || (!isEmail && name.length > maxNameLength)) throw new errors.InvalidUsername("Usernames must be 20 characters or less!")

    let entries = (await database.getConnection().execute(`SELECT username from ${userTable} WHERE ${isEmail ? "email" : "username"} = ? LIMIT 1`, [name]).catch((err) => { logger.error(err); throw new errors.DatabaseError("Unexpected server-side error") }))[0]
    
    if (options.DoesntExist && entries.length != 0) throw new errors.DuplicateUsernameError(`The username or email ${name} is already taken!`)
    else if (!options.DoesntExist && entries.length < 1) throw new errors.InvalidUsername(`The username or email ${name} does not exist!`)

    return true
}

/**
 * Validates emails
 * @param {string} mail 
 * @returns If the email is valid, true; Otherwise, null
 * @throws {InvalidEmail} If the email is valid
 */
let validateEmail = (mail) => {
    // email regex pulled from w3resource
    if (!mail || typeof mail != 'string' || !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail) || mail.length > maxEmailLength) throw new errors.InvalidEmail(mail + " is not a valid email!")

    return true
}

/**
 * Validates passwords using validator's isStrongPassword method
 * @param {string} password 
 * @returns If the password is valid, true; Otherwise, null
 * @throws {InvalidPassword} If the password is invalid
 */
let validatePassword = (password) => {
    // default requirements: 8+ char, 1 lowercase, 1 uppercase, 1 symbol, 1 number
        // no max length checked, since hash will always be 60 char
    if (!validator.isStrongPassword(password)) throw new errors.InvalidPassword("That password is not secure! Passwords must include at least 1 lowercase character, 1 uppercase character, 1 number, and 1 symbol.")

    return true
}

/**
 * Validates bios
 * @param {string} bio
 * @throws {InvalidInput} If the bio is invalid
 * @returns If the bio is valid, true; Otherwise, null
 */
let validateBio = (bio) => {
	if (bio.length > 100) throw new errors.InvalidInput("Bio must not be over 100 characters!")
		
	return true
}


module.exports = {
    addEntry,
    promoteUser,
    demoteUser,
    isAdmin,
    deleteUser,
    addGameToUser,
    getUsersGames,
    checkLogin,
    getAllUsers,
    addSession,
    getSession,
    deleteSession,
    removeGameFromUser,
    canUserAddGame,
    getUser,
    updateUser,
    updateBio,
    isPublic,
    updateUserGame,
    getUserGameStats,
	// exported for testing purposes
	validateInfo,
	validatePlaytime,
	validateName,
	validateEmail,
	validatePassword,
	validateBio
}