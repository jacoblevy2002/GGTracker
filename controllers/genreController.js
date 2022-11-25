const express = require('express');
const genreModel = require('../models/genreModel');
const model = require('../models/globalModel');
const errorList = require('../errorContainer');
const router = express.Router();
const routeRoot = '/genres';
const pino = require("pino");
const logger = pino(pino.destination("logs/controllers/games-log.log"));

router.post('/', addGenre);


async function displayError(res, err, good=true){
    logger.error(err)
    if (err instanceof errorList.UnauthorizedAccess) res.status(403)
    else if (err instanceof errorList.UnauthenticatedAccess) res.status(401)
    else if (err instanceof errorList.GenreNotFoundException) res.status(404)
    else if (err instanceof errorList.UserError) res.status(400)
    else res.status(500)

    opts = {};
    if (err instanceof errorList.InvalidGenre || err instanceof errorList.InvalidInput || err instanceof errorList.GenreNotFoundException)
        opts = { errorText: err.message, warning:true };
    else opts = {errorText: err.message, error: true};
    if(good) {
        opts = await genGenreOptions(opts);
        res.render("genres", opts);
    } else {
        res.render("error", opts);
    }
}

/**
 * Add a new genre to the database
 * @param {*} req  request object
 * @param {*} res  response object
 * @throws {UnauthenticatedAccess} If the user is not logged in
 * @throws {UnauthorizedAccess} If the logged in user is not an admin
 * @throws {InvalidInput} If there is no name provided
 * @throws {DatabaseError} If there is a database error
 */
async function addGenre(req, res) {
    try {
        if (!req.body.name) throw new errorList.InvalidInput("Genre name must not be empty!")
        await checkUserIsAdmin(res);
        let result = await genreModel.addGenre(req.body.name);
        if(!result.name) throw new errorList.DatabaseError("Database error when adding genre name")
        else {
            logger.info("Genre added successfully");
            let options = await genGenreOptions();
            res.render("genres", options);
        }
    } 
    catch (error) {
        displayError(res, error);
    }
}

/**
 * List all genres from database, then render them
 * @param {*} req  request object
 * @param {*} res  response object
 * @throws {DatabaseError} If there is a database error
 */
async function listGenres(req, res){
    try {
        let result = await genreModel.getGenresList();
        if(!result) throw new errorList.DatabaseError("Database error when getting list of genres")
        else {
            logger.info("Got genre list successfully");
            let options = await genGenreOptions();
            res.render("genres", options)
        }
    } 
    catch (error) {
        displayError(res, error);
    }
}
router.get('/', listGenres);

/**
 * Remove a specific genre from database and render
 * @param {*} req  request object
 * @param {*} res  response object
 * @throws {UnauthenticatedAccess} If the user is not logged in
 * @throws {UnauthorizedAccess} If the logged in user is not an admin
 * @throws {DatabaseError} If there is a database error
 */
async function removeGenre(req, res){
    try {
        await checkUserIsAdmin(res);
        let genre = await genreModel.getGenreById(req.body.id);
        let result = await genreModel.deleteGenre(req.body.id);
        if(!result) throw new errorList.DatabaseError("Error when deleting genre from database")
        else {
            logger.info("Genres removed successfully");
            let options = {success: true, successText: `${genre.name} Deleted.` }
            let opts = await genGenreOptions(options);
            res.render("genres", opts)
        }
    } 
    catch (error) {
        displayError(res, error);
    }
}
router.post('/delete', removeGenre);

/**
 * Edit a specific genre using id and name, and render the changes
 * @param {*} req  request object
 * @param {*} res  response object
 * @throws {UnauthenticatedAccess} If the user is not logged in
 * @throws {UnauthorizedAccess} If the logged in user is not an admin
 * @throws {DatabaseError} If there is a database error
 */
async function editGenre(req, res){
    try {
        await checkUserIsAdmin(res);
        let result = await genreModel.editGenre(req.body.id, req.body.name);
        if(!result.name) throw new errorList.DatabaseError(`Database error trying to edit genre ${res.body.name}`)
        else {
            logger.info("Genres edited successfully");
            let options = await genGenreOptions();
            res.render("genres", options)
        }
    } 
    catch (error) {
        displayError(res, error);
    }
}
router.post('/edit', editGenre);


async function getGenresFromPartialName(request, response) {
    try {
      if (!request.query.name) throw new errorList.InvalidGenre("Invalid genre name")
      else {
        let genreName = request.query.name;
        let genres = await genreModel.getGenresByPartialName(genreName);
        let opts = await genGenreOptions(null, genres);
        response.render("genres", opts);
      }
    } catch (err) { displayError(res, err) }
  }
  router.get("/name", getGenresFromPartialName);


async function genGenreOptions(options = null, genres = null) {
    if(options == null) {
        options = {};
    }
    options.active = {};
    options.active.genres = true;
    if(!genres) {
        try {
            genres = await genreModel.getGenresList();
        } 
        catch (error) {
            displayError(res, error, false);
        }
    }
    options.genres = genres;
    return options;
}

/**
 * Checks if the current user is an admin
 * @param {*} response 
 * @throws {UnauthenticatedAccess} If the user is not logged in
 * @throws {UnauthorizedAccess} If the user is not an admin
 */
let checkUserIsAdmin = async (response) => {
    if(!response.locals.partials.userContext.loggedIn)     throw new errorList.UnauthenticatedAccess("You do not have access to this page!")
    if(!response.locals.partials.userContext.user.IsAdmin) throw new errorList.UnauthorizedAccess("You do not have access to this page!")
  }
module.exports = {
    router,
    routeRoot
}
