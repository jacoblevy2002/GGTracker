//This model will handle games and relation actions on games (like adding a genre to a game)
const database = require("./globalModel.js");
const validator = require("validator");
const Errors = require("../errorContainer");
const pino = require("pino");
const logger = pino(pino.destination("logs/models/games-log.log"));
const gameGenreTableName = "GamesGenres";
const gameTableName = "Games";
const userGameGable =  "UsersGames";

const genreModel = require("./genreModel");

//#region  Update/Add
//TODO: Implement uploading of game image and saving it. Filtering..?
/**
 * Add a game to the database and return the game object
 * @param {string} gameName
 * @param {string} gameDescription
 * @param {*} gameImage
 * @returns {object} the game object
 * @throws {InvalidGameName} if the game name is invalid
 * @throws {InvalidGameDescription} if the game description is invalid
 * @throws {DatabaseError} if there is a database error
 */
async function addGame(gameName, gameDescription = null, gameImage = null) {
  if (!validateGameName(gameName)) {
    logger.error({ level: "error", message: "Invalid game name" });
    throw new Errors.InvalidGameName("The game name is invalid");
  }
  if (gameDescription != null) {
    if (!validateGameDesc(gameDescription)) {
      logger.error({ level: "error", message: "Invalid game description" });
      throw new Errors.InvalidGameDescription(
        "The game description is invalid"
      );
    }
  }
  let query = `INSERT INTO ${gameTableName} (name, description, image) VALUES (?, ?, ?);`;
  try {
    await database
      .getConnection()
      .execute(query, [gameName, gameDescription, gameImage]);
    logger.info(`Added game ${gameName}`);
    let [rows, fields] = await database
      .getConnection()
      .execute(`SELECT LAST_INSERT_ID();`);
    //Get what the id is.
    let id = rows[0]["LAST_INSERT_ID()"];
    //return what we just added
    return await getGameById(id);
  } catch (error) {
    logger.error(error);
    throw new Errors.DatabaseError("Database error");
  }
}

async function deleteGame(gameId) {
  if (!validateId(gameId)) {
    logger.error({ level: "error", message: "Invalid game id" });
    throw new Errors.InvalidGameId("The game id is invalid");
  } else {
    //check if game exists
    let query = `SELECT id FROM ${gameTableName} WHERE id = ?`;
    try {
      let [rows, fields] = await database
        .getConnection()
        .execute(query, [gameId]);
      if (rows.length === 0) {
        logger.error({ level: "error", message: "Game does not exist" });
        throw new Errors.GameDoesNotExist("The game does not exist");
      } else {
        //delete game from users
        query = `DELETE FROM ${userGameGable} WHERE gameID = ?`;
        await database.getConnection().execute(query, [gameId]);
        //delete game genres
        query = `DELETE FROM ${gameGenreTableName} WHERE gameID = ?`;
        await database.getConnection().execute(query, [gameId]);
        //delete game
        query = `DELETE FROM ${gameTableName} WHERE id = ?`;
        await database.getConnection().execute(query, [gameId]);
        logger.info(`Deleted game ${gameId}`);

        logger.info(`Deleted game genres for game ${gameId}`);
        return true;
      }
    } catch (error) {
      logger.error("Error deleting game:" + error.message);
      throw new Errors.DatabaseError("Database error");
    }
  }
}
/**
 * Update a games details based off its id.
 * @param {*} id
 * @param {*} gameName
 * @param {*} gameDescription
 * @param {*} gameImage
 * @returns the new game object
 * @throws {InvalidGameId} if the id is invalid
 * @throws {InvalidGameName} if the game name is invalid
 * @throws {InvalidGameDescription} if the game description is invalid
 * @throws {DatabaseError} if there is a database error
 *
 */
async function updateGame(
  id,
  gameName = null,
  gameDescription = null,
  gameImage = null
) {
  if (!validateId(id)) {
    throw new Errors.InvalidId("The game id is invalid");
  }
  let query = `UPDATE ${gameTableName} SET `;
  let values = [];
  if (gameName != null) {
    if (!validateGameName(gameName)) {
      throw new Errors.InvalidGameName("The game name is invalid");
    }
    query += "name = ?, ";
    values.push(gameName);
  }
  if (gameDescription != null) {
    if (!validateGameDesc(gameDescription)) {
      throw new Errors.InvalidGameDescription(
        "The game description is invalid"
      );
    }
    query += "description = ?, ";
    values.push(gameDescription);
  }
  if (gameImage != null) {
    //more validation and stuff TODO
    query += "image = ?, ";
    values.push(gameImage);
  }
  query = query.slice(0, -2); //remove the last comma and space
  query += " WHERE id = ?";
  values.push(id);
  try {
    await database.getConnection().execute(query, values);
    logger.info(`Updated game ${gameName}`);
    return await getGameById(id);
  } catch (error) {
    logger.error(error);
    throw new Errors.DatabaseError("Database error");
  }
}

//#endregion

//#region Gets
/**
 * Get a game object by its id
 * @param {*} id
 * @returns Game object
 * @throws {InvalidGameId} if the id is invalid
 * @throws {DatabaseError} if there is a database error
 * @throws {GameNotFound} if the game is not found
 */
async function getGameById(id) {
  if (!validateId(id)) {
    throw new Errors.InvalidId("The game id is invalid");
  } else {
    let query = `SELECT id, name, description, image FROM ${gameTableName} WHERE id = ?`;
    try {
      let [rows, fields] = await database.getConnection().execute(query, [id]);
      if (rows.length == 0) {
        throw Errors.GameNotFound; // or throw an error?
      } else {
        //now get genres
        let game = {
          id: rows[0].id,
          name: rows[0].name,
          description: rows[0].description,
          image: rows[0].image
        };
        game = await attachGenresToGame(game);
        return game;
      }
    } catch (error) {
      logger.error(error);
      throw new Errors.DatabaseError("Database error");
    }
  }
}
async function attachGenresToGame(game) {
  let query = `SELECT genreId FROM ${gameGenreTableName} WHERE gameID = ?`;
  try {
    let [rows, fields] = await database
      .getConnection()
      .execute(query, [game.id]);
    let genres = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        let genre = await genreModel.getGenreById(rows[i].genreId);
        genres.push(genre);
      } catch (error) {
        throw new Errors.DatabaseError("Database error");
      }
    }
    game.genres = genres;
    return game;
  } catch (error) {
    logger.error(error);
    throw new Errors.DatabaseError("Database error");
  }
}
/**
 * get an array of any games with a name
 * @param {string} gameName
 * @returns an array of games with the name
 * @throws {DatabaseError} if there is a database error
 * @throws {InvalidGameName} if the game name is invalid
 * @throws {GameNotFound} if no games are found
 */
async function getGameByName(gameName) {
  if (!validateGameName(gameName)) {
    throw new Errors.InvalidGameName("The game name is invalid");
  } else {
    let query = `SELECT id, name, description, image FROM ${gameTableName} WHERE name = ?`;
    try {
      let [rows, fields] = await database
        .getConnection()
        .execute(query, [gameName]);
      if (rows.length == 0) {
        throw Errors.GameNotFound; // or throw an error?
      } else {
        let arr = [];
        for (let i = 0; i < rows.length; i++) {
          arr.push({
            id: rows[i].id,
            name: rows[i].name,
            description: rows[i].description,
            image: rows[i].image
          });
        }
        return arr;
      }
    } catch (error) {
      logger.error(error);
      throw new Errors.DatabaseError("Database error");
    }
  }
}

/**
 * Search for a list of games based off a part of their names
 * @param {string} name
 * @returns an array of games containing the inputted name
 * @throws {DatabaseError} if there is a database error
 * @throws {InvalidGameName} if the game name is invalid
 * @throws {GameNotFound} if no games are found
 */
async function getGamesByPartialName(name) {
  if (!validateGameName(name)) {
    throw new Errors.InvalidGameName("The game name is invalid");
  } else {
    let query = `SELECT id, name, description, image FROM ${gameTableName} WHERE name LIKE ?`;
    try {
      let [rows, fields] = await database
        .getConnection()
        .execute(query, [`%${name}%`]);
      if (rows.length == 0) {
        throw Errors.GameNotFound; // or throw an error?
      } else {
        let arr = [];
        for (let i = 0; i < rows.length; i++) {
          arr.push({
            id: rows[i].id,
            name: rows[i].name,
            description: rows[i].description,
            image: rows[i].image
          });
        }
        return arr;
      }
    } catch (error) {
      logger.error(error);
      throw new Errors.DatabaseError("Database error");
    }
  }
}

/**
 * Get an array of all games
 * @returns an array of all games
 * @throws {DatabaseError} if there is a database error
 */
async function getAllGames() {
  let query = `SELECT id, name, description, image FROM ${gameTableName}`;
  try {
    let [rows, fields] = await database.getConnection().execute(query);
    let arr = [];
    for (let i = 0; i < rows.length; i++) {
      arr.push({
        id: rows[i].id,
        name: rows[i].name,
        description: rows[i].description,
        image: rows[i].image
      });
    }
    return arr;
  } catch (error) {
    logger.error(error);
    throw new Errors.DatabaseError("Database error");
  }
}

/**
 * Get all the games that have a genre attached to them
 * @param {*} genreId 
 * @returns array of game objects.
 */
async function getGamesFromGenre(genreId) {
  if (!validateId(genreId)) {
    throw new Errors.InvalidId("The genre id is invalid");
  }
  //TODO: check if genre exists
  //check if genre exists... later. TODO
  let query = `SELECT gameId FROM ${gameGenreTableName} WHERE genreId = ?`;
  try {
    let [rows, fields] = await database.getConnection().execute(query, [genreId]);
    let arr = [];
    for (let i = 0; i < rows.length; i++) {
      arr.push(await getGameById(rows[i].gameId));
    }
    return arr;
  } catch (error) {
    logger.error(error);
    throw new Errors.DatabaseError("Database error");
  }

}

//#endregion

//#region relational, add and remove genres, etc

/**
 * Add a genre to the game id given.
 * @param {*} gameId
 * @param {*} genreId
 * @returns Game object
 */
async function addGenreToGame(gameId, genreId) {
  let game = await getGameById(gameId); //if it throws it should handle fine
  let genre = await genreModel.getGenreById(genreId); //if it throws it should handle fine
  //check if the genre is already assigned
  let query = `SELECT * FROM ${gameGenreTableName} WHERE gameID = ? AND genreID = ?`;
  try {
    let [rows, fields] = await database
      .getConnection()
      .execute(query, [gameId, genreId]);
    if (rows.length != 0) {
      throw new Errors.GameGenreAlreadyExists("The game genre already exists");
    } else {
      let inQuery = `INSERT INTO ${gameGenreTableName} (gameID, genreID) VALUES (?, ?)`;
      try {
        await database.getConnection().execute(inQuery, [gameId, genreId]);
        logger.info(`Added game ${game.name} to genre ${genre.name}`);
        return getGameById(gameId);
      } catch (error) {
        logger.error(error);
        throw new Errors.DatabaseError("Database error");
      }
    }
  } catch (error) {
    logger.error(error);
    throw new Errors.DatabaseError("Database error");
  }
}

/**
 * Remove a genre from a game
 * @param {*} gameId The game to remove the genre from
 * @param {*} genreId The genre to remove from the game
 * @returns
 */
async function deleteGenreFromGame(gameId, genreId) {
  let game = await getGameById(gameId); //if it throws it should handle fine
  let genre = await genreModel.getGenreById(genreId); //if it throws it should handle fine
  //check if the genre is there
  let query = `SELECT * FROM ${gameGenreTableName} WHERE gameID = ? AND genreID = ?`;
  try {
    let [rows, fields] = await database
      .getConnection()
      .execute(query, [gameId, genreId]);
    if (rows.length == 0) {
      throw new Errors.GameGenreNotFound("The game genre does not exist");
    } else {
      let delQuery = `DELETE FROM ${gameGenreTableName} WHERE gameID = ? AND genreID = ?`;
      try {
        await database.getConnection().execute(delQuery, [gameId, genreId]);
        logger.info(`Removed game ${game.name} from genre ${genre.name}`);
        return getGameById(gameId);
      } catch (error) {
        logger.error(error);
        throw new Errors.DatabaseError("Database error");
      }
    }
  } catch (error) {
    logger.error(error);
    throw new Errors.DatabaseError("Database error");
  }
}

/**
 * Get all genre objects attached to a game.
 * @param {*} gameId The game to get the genres from
 * @returns The game object
 */
async function getGenresFromGame(gameId) {
  if (!validateId(gameId)) {
    throw new Errors.InvalidId("The game id is invalid");
  } else {
    let query = `SELECT genreId FROM ${gameGenreTableName} WHERE gameID = ?`;
    try {
      let [rows, fields] = await database
        .getConnection()
        .execute(query, [gameId]);
      let genres = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          let genre = await genreModel.getGenreById(rows[i].genreId);
          genres.push(genre);
        } catch (error) {
          logger.error(error.message);
          throw new Errors.DatabaseError("Database error");
        }
      }
      return genres;
    } catch (error) {
      logger.error(error.message);
      throw new Errors.DatabaseError("Database error");
    }
  }
}


//#endregion

//#region validation
/**
 * Validate a game description
 * @param {string} description The description to validate
 * @returns true if the description is valid, false otherwise
 */
function validateGameDesc(desc) {
  if (desc == null || desc == "" || desc == undefined) {
    return false;
  } else {
    return true;
  }
}

/**
 * Validate a game title
 * @param {string} name
 * @returns true if the name is valid, false otherwise
 */
function validateGameName(name) {
  if (name == null || name == "" || name == undefined) {
    return false;
  } else {
    //we may not want this step after all... we will want it for genres tho
    if (validator.isAlphanumeric(name, "en-US", { ignore: " -.," })) {
      return true;
    }
  }
}
/**
 * Validate a game id
 * @param {*} id
 * @returns true if the id is valid, false otherwise
 */
function validateId(id) {
  if (validator.isInt(id.toString(), { min: 1 })) {
    return true;
  } else {
    return false;
  }
}
//#endregion
module.exports = {
  addGame,
  getGameById,
  getGameByName,
  getGamesByPartialName,
  updateGame,
  getAllGames,
  validateId,
  addGenreToGame,
  getGenresFromGame,
  deleteGenreFromGame,
  getGamesFromGenre,
  deleteGame
};
