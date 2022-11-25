const express = require("express");
const router = express.Router();
const routeRoot = "/games";
const gameModel = require("../models/gameModel");
const errors = require("../errorContainer");
const pino = require("pino");
const logger = pino(pino.destination("logs/controllers/games-log.log"));
const genreModel = require("../models/genreModel");
const userModel = require('../models/userModel');

//#region error handler
/**
 * Handle an error gracefully, by logging it and rendering it on the current page, or a fallback page if impossible.
 * @param {Error} err The error to handle
 * @param {*} response The current response object
 * @param {*} request The current request object
 * @param {*} over An override to not address the page if that is causing the error.
 * 
 */
async function handleGameError(err, response, request, over = false) {
  logger.error(err);
  let options = {};
  if (!over) options = await genGameListOptions(response, request);

  if (err instanceof errors.UnauthorizedAccess) response.status(403)
  else if (err instanceof errors.UnauthenticatedAccess) response.status(401)
  else if (err instanceof errors.UserError) response.status(400)
  else response.status(500)

  if (err instanceof errors.DatabaseError ||
    err instanceof errors.UnauthenticatedAccess ||
    err instanceof errors.UnauthorizedAccess) {
    options.error = true;
    options.errorText = err.message;
  } else if (
    err instanceof errors.InvalidInput ||
    err instanceof errors.GameNotFound
  ) {
    options.warning = true;
    options.warningText = err.message;
  } else {
    options.error = true;
    options.errorText = "Unexpected error - " + err.message;
  }

  if (!over) response.render("games", options)
  else response.render("genericError", options)
}

//#endregion

//#region posts
/**
 * Add a new game to the database, then load the user back to the game list.
 * @param {*} request
 * @param {*} response
 */
async function addGame(request, response) {
  try {
    await checkUserIsAdmin(response)
    if (!request.body.name) throw new errors.InvalidGameName("Invalid game name")
    let gameName = request.body.name;
    let description = request.body.description;
    let res = await gameModel.addGame(gameName, description);

    if (!res) throw new errors.DatabaseError("Unexpected database error when adding game")
    else {
      logger.info(`Game ${gameName} added`);
      let options = await genGameListOptions(response, request);
      response.render("games", options);
    }
  } catch (err) { await handleGameError(err, response, request) }
}
router.post("/add", addGame);

async function addGenreToGame(request, response) {
  try {
    await checkUserIsAdmin(response)
    if (!request.body.genre || !request.body.id) throw new errors.InvalidInput("Invalid input parameters")
    else {
      let gameId = request.body.id;
      let genreId = request.body.genre;
      let res = await gameModel.addGenreToGame(gameId, genreId);
      if (!res) throw new errors.DatabaseError("Unexpected database error when adding genre to game")
      else {
        logger.info(`Genre ${genreId} added to game ${gameId}`);
        response.redirect(`/games/id?id=${gameId}`);
      }
    }
  } catch (err) { await handleGameError(err, response, request) }
}
router.post("/genres", addGenreToGame);

async function deleteGenreFromGame(request, response) {
  try {
    await checkUserIsAdmin(response)
    if (!request.body.genre || !request.body.id) throw new errors.InvalidInput("Invalid input parameters")
    else {
      let gameId = request.body.id;
      let genreId = request.body.genre;

      let res = await gameModel.deleteGenreFromGame(gameId, genreId);
      if (!res) throw new errors.DatabaseError("Unexpected database error when removing genre from game")
      else {
        logger.info(`Genre ${genreId} deleted from game ${gameId}`);
        response.redirect(`/games/id?id=${gameId}`);
      }
    }
  } catch (err) { await handleGameError(err, response, request) }
}
router.post("/genres/delete", deleteGenreFromGame);

//edit game
async function editGame(request, response) {
  try {
    await checkUserIsAdmin(response)
    if (!request.body.id || !request.body.name || !request.body.description) throw new errors.InvalidInput("Invalid input parameters")
    else {
      let gameId = request.body.id;
      let gameName = request.body.name;
      let description = request.body.description;
      let res = await gameModel.updateGame(gameId, gameName, description);
      if (!res) throw new errors.DatabaseError("Unexpected database error when editing genre")
      else {
        logger.info(`Game ${gameId} edited`);
        response.redirect(`/games/id?id=${gameId}`);
      }
    }
  } catch (err) { await handleGameError(err, response, request) }
}
router.post("/edit", editGame);
//delete game 
async function deleteGame(request, response) {
  try {
    await checkUserIsAdmin(response)
    if (!request.body.id) throw new errors.InvalidId("Invalid Game ID")
    else {
      let gameId = request.body.id;
      let res = await gameModel.deleteGame(gameId);
      if (!res) throw new errors.DatabaseError("Unexpected database error when deleting game")
      else {
        logger.info(`Game ${gameId} deleted`);
        response.redirect("/games");
      }
    }
  } catch (err) { await handleGameError(err, response, request) }
}
router.post("/delete", deleteGame);


//#endregion

//#region gets
async function gameListMenu(request, response) {
  let opts = await genGameListOptions(response, request);
  response.render("games", opts);
}
router.get("/", gameListMenu);

async function getGame(request, response) {
  try {
    //check if the request is valid
    if (!request.query.id) throw new errors.InvalidId("Invalid Game ID")
    else {
      let gameId = request.query.id;
      let game = await gameModel.getGameById(gameId);
      let opts = await genSingleGameOptions(response, game);
      if (response.locals.partials.userContext.loggedIn) {
        opts.admin = await userModel.isAdmin(response.locals.partials.userContext.user.Username)
        opts.canAddGame = await userModel.canUserAddGame(response.locals.partials.userContext.user.Username, request.query.id)
        if (!opts.canAddGame) {
          opts.editStarting = await userModel.getUserGameStats(response.locals.partials.userContext.user.Username, gameId)
        }
      }
      
      response.render("singleGame", opts);
    }
  } catch (err) { await handleGameError(err, response, request) }
}
router.get("/id", getGame);

async function getGamesFromGenre(request, response) {
  try {
    if (!request.query.id) throw new errors.InvalidId("Invalid genre ID")
    else {
      let genreId = request.query.id;
      let games = await gameModel.getGamesFromGenre(genreId);

      let opts = await genGameListOptions(response, request, games, null, genreId);
      response.render("games", opts);
    }
  } catch (err) { await handleGameError(err, response, request) }
}
router.get("/genres", getGamesFromGenre);

async function getGamesFromPartialName(request, response) {
  try {
    if (!request.query.name) throw new errors.InvalidGameName("Invalid game name")
    else {
      let gameName = request.query.name;
      let games = await gameModel.getGamesByPartialName(gameName);
      let opts = await genGameListOptions(response, request, games);
      response.render("games", opts);
    }
  } catch (err) {await  handleGameError(err, response, request) }
}
router.get("/name", getGamesFromPartialName);

async function genSingleGameOptions(response, game) {
  //todo: get genres from
  try {
    let options = {
      active: {
        games: true
      },
      game: game
    };
    options.genres = await genreModel.getGenresList();
    return options;
  } catch (err) {
    await handleGameError(err, response, request, true);
  }
}

/**
 * Generates the relevant options for the contextual rendering of games.hbs
 * @param {*} response the response in case we error
 * @param {int} genreId the ID of the genre to filter by, if null, no filter
 * @param {*} request the request to be used for cookies
 * @param {object} games if searching for specific games, pass them into this 
 * @param {object} options the options to pass to the template
 * @param {int} genre If searching by a genre, the id of that genre.
 * @returns
 */
async function genGameListOptions(response, request, games = null, options = null, genre = null) {
  try {
    if (options == null) {
      options = {};
    }
    options.active = { games: true }
    
    let allgenres = await genreModel.getGenresList();
    let genreHistory = [];
    if(!request.cookies || !request.cookies.genreSearchHistory) {

    } else {
      genreHistory = JSON.parse(request.cookies.genreSearchHistory);
    }
    //filter out anything from genreHistory that may already allgenders;
    
    if(genre) {
      //remove the serached genre from genre history, if its present
      genreHistory = genreHistory.filter(g => g != genre);
      //add the serached genre to the front of the genre history
      genreHistory.unshift(genre);
    }
    //remove any genres that are already in the allgenres list
    
    //now, add the recent genres to a genre list 
    let genreList = [];
    for(let i = 0; i < genreHistory.length; i++) {
      //should this be handled differently.. maybe get it from allgenres? for less queries.
      try {
        let genre = await genreModel.getGenreById(genreHistory[i]);
      
        genreList.push(genre);
      } catch(err) {
          
      }

    }
    //now add all the genres that where not in history
    let filteredgenres = allgenres.filter(g => !genreHistory.includes(g.id.toString()));
    for(let i = 0; i < filteredgenres.length; i++) {
      genreList.push(filteredgenres[i]);
    }
    //add the genre list to the options
    options.genres = genreList;
    //finally, add the cookies to the response
    response.cookie("genreSearchHistory", JSON.stringify(genreHistory));
    if (games == null) {
      //todo: make it work
      games = await gameModel.getAllGames();
    }

    //let games = await model.getAllGames();
    //let genres = await gameModel.getAllGenres();
    //options.genres = genres;
    //loop through games
    if(response.locals.partials.userContext.loggedIn) {
        for (let i = 0; i < games.length; i++) {
            //opts.admin = await userModel.isAdmin(response.locals.partials.userContext.user.Username)
            games[i].canAddGame = await userModel.canUserAddGame(response.locals.partials.userContext.user.Username, games[i].id)
        }

    }
    options.games = games;
    return options;
  } catch (err) {
    await handleGameError(err, response, request, !(err instanceof errors.GenreNotFoundException));
  }
}
//#endregion

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
  genGameListOptions,
  genSingleGameOptions
};
