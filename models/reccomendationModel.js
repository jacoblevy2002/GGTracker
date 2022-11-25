const database = require("./globalModel.js");
const genreModel = require("./genreModel");
const gameModel = require("./gameModel");
const validator = require("validator");
const Errors = require("../errorContainer");
const pino = require("pino");
const logger = pino(pino.destination("logs/models/recc-logs.log"));
const gameGenreTableName = "GamesGenres";
const gameTableName = "Games";
const userTable = "Users";
const userGameTable = "UsersGames";
const suggestionTable = "Suggestions";
const userGenreWeightTable = "UserGenreWeights";
//VALUES FOR THINGS. THESE THE IMPORTANT!!!!!!!!
const HOUR_MULT_FOR_LIKED = 2;
const HOUR_MULT_FOR_DISLIKED = 0.75;
const HOUR_REMOVED_FOR_DISMISSED_RECCOMENDATION = -1;

//BIG FAT TODO!!!! MAKE THIS USE OTHER MODEL FUNCTIONS INSTEAD!!

/**
 * Clear all the current, and then generate new weights for a user.
 * @param {*} username the user to gen the weights
 */
async function generateWeights(username) {
  try {
    let gamesQuery = `SELECT gameID, playtime, rating from ${userGameTable} WHERE user = ?`;
    let [gameRows, gameFields] = await database
      .getConnection()
      .execute(gamesQuery, [username]);
    let genreWeights = {};
    for (let i = 0; i < gameRows.length; i++) {
      //get genres for each game
      let gameGenresQuery = `SELECT genreID from ${gameGenreTableName} WHERE gameID = ?`;
      let [genreRows, genreFields] = await database
        .getConnection()
        .execute(gameGenresQuery, [gameRows[i].gameID]);

      //Calculate weights
      let weightMult = gameRows[i].rating ? gameRows[i].rating : 0;
      let playtime = gameRows[i].playtime;

      let gameWeight = weightMult * playtime;

      //Add weights to genres
      for (let j = 0; j < genreRows.length; j++) {
        if (!genreWeights[genreRows[j].genreID]) {
          genreWeights[genreRows[j].genreID] = 0;
        }
        genreWeights[genreRows[j].genreID] += gameWeight;
      }
    }
    //calculate suggesition weights.
    let suggestionQuery = `SELECT gameID, status from ${suggestionTable} WHERE user = ? AND status != "pending"`;
    let [
      suggestionRows,
      suggestionFields
    ] = await database.getConnection().execute(suggestionQuery, [username]);
    for (let i = 0; i < suggestionRows.length; i++) {
      //get genres from this suggestion
      let suggestionGenresQuery = `SELECT genreID from ${gameGenreTableName} WHERE gameID = ?`;
      let [genreRows, genreFields] = await database
        .getConnection()
        .execute(suggestionGenresQuery, [suggestionRows[i].gameID]);

      //calculate weights
      let weightMult =
        suggestionRows[i].status == "added"
          ? HOUR_MULT_FOR_LIKED
          : HOUR_REMOVED_FOR_DISMISSED_RECCOMENDATION;
      let suggestionWeight = weightMult * 1;
      //add weights for suggestions
      for (let j = 0; j < genreRows.length; j++) {
        if (!genreWeights[genreRows[j].genreID]) {
          genreWeights[genreRows[j].genreID] = 0;
        }
        genreWeights[genreRows[j].genreID] += suggestionWeight;
      }
    }
    //Clear out old weights
    let deleteQuery = `DELETE FROM ${userGenreWeightTable} WHERE user = ?`;
    await database.getConnection().execute(deleteQuery, [username]);
    //Insert new weightsd
    let insertQuery = `INSERT INTO ${userGenreWeightTable} (user, genreID, weight) VALUES (?, ?, ?)`;
    for (let genre in genreWeights) {
      await database
        .getConnection()
        .execute(insertQuery, [username, genre, genreWeights[genre]]);
    }
  } catch (err) {
    logger.error({ level: "error", message: err.message });
    throw new Errors.DatabaseError("Error generating weights");
  }
}
/**
 * Clear all current suggestion values. Useful if we're out of possible things.
 * @param {*} username ther username of the user to clear the suggestions from
 * @returns true if successful, errors if not
 */
async function clearSuggestions(username) {
  try {
    let deleteQuery = `DELETE FROM ${suggestionTable} WHERE user = ?`;
    await database.getConnection().execute(deleteQuery, [username]);
    return true;
  } catch (err) {
    logger.error({ level: "error", message: err.message });
    throw new Errors.DatabaseError("Error clearing suggestions");
  }
}

/**
 * Delete a suggestion entirely.
 * @param {*} username the username of the user to delete the suggestion from 
 * @param {*} gameID the suggested game
 * @returns true if successful, errors if not
 */
async function deleteSuggestion(username, gameID) {
  try {
    let deleteQuery = `DELETE FROM ${suggestionTable} WHERE user = ? AND gameID = ?`;
    await database.getConnection().execute(deleteQuery, [username, gameID]);
    return true;
  } catch (err) {
    logger.error({ level: "error", message: err.message });
    throw new Errors.DatabaseError("Error deleting suggestion");
  }
}

/**
 * Clear the current pending suggestions.
 * @param {*} username the username of the user to clear pending suggestions from;
 * @returns true if successful, errors if not
 */
async function clearPendingSuggestions(username) {
  try {
    let deleteQuery = `DELETE FROM ${suggestionTable} WHERE user = ? AND status = "pending"`;
    await database.getConnection().execute(deleteQuery, [username]);
    return true;
  } catch (err) {
    logger.error({ level: "error", message: err.message });
    throw new Errors.DatabaseError("Error clearing pending suggestions");
  }
}
/**
 * Get a new suggestion for the user, or the past pending one if it exists
 * @param {*} username The user to get a suggestion for
 * @returns suggestion object
 */
async function getPendingSuggestion(username) {
  //check if there is a pending suggestion
  try {
    let suggestionQuery = `SELECT * from ${suggestionTable} WHERE user = ? AND status = "pending"`;
    let [
      suggestionRows,
      suggestionFields
    ] = await database.getConnection().execute(suggestionQuery, [username]);
    if (suggestionRows.length > 0) {
      let suggestion = {
        user: suggestionRows[0].user,
        gameID: suggestionRows[0].gameID,
        score: suggestionRows[0].score,
        status: suggestionRows[0].status
      };
      suggestion.game = await gameModel.getGameById(suggestion.gameID);
      return suggestion;
    } else {
      //create weights for games not yet suggested.
      let getNonSuggestedGames = `SELECT id from ${gameTableName} WHERE id NOT IN (SELECT gameID from ${suggestionTable} WHERE user = ?) AND id NOT IN (SELECT gameID from ${userGameTable} WHERE user = ?)`;
      let [gameRows, gameFields] = await database
        .getConnection()
        .execute(getNonSuggestedGames, [username, username]);
      let gameWeights = {};
      if (gameRows.length < 1) {
        return null;
      }
      for (let i = 0; i < gameRows.length; i++) {
        let gameId = gameRows[i].id;
        gameWeights[gameId] = 0;

        //get genres from this game
        let gameGenresQuery = `SELECT genreID from ${gameGenreTableName} WHERE gameID = ?`;
        let [genreRows, genreFields] = await database
          .getConnection()
          .execute(gameGenresQuery, [gameId]);

        //get weights for genres
        for (let j = 0; j < genreRows.length; j++) {
          let genreId = genreRows[j].genreID;
          let genreWeightQuery = `SELECT weight from ${userGenreWeightTable} WHERE user = ? AND genreID = ?`;
          let [
            genreWeightRows,
            genreWeightFields
          ] = await database
            .getConnection()
            .execute(genreWeightQuery, [username, genreId]);
          if (genreWeightRows.length > 0) {
            gameWeights[gameId] += genreWeightRows[0].weight;
          }
        }
        //average it out by dividing by the number of genres
        gameWeights[gameId] = gameWeights[gameId] / genreRows.length;
      }
      //get the game with the highest weight
      let maxWeight = 0;
      let maxGameId = 1;
      for (let gameId in gameWeights) {
        if (gameWeights[gameId] > maxWeight) {
          maxWeight = gameWeights[gameId];
          maxGameId = gameId;
        }
      }

      //create a suggestion for this game
      let insertQuery = `INSERT INTO ${suggestionTable} (user, gameID, score, status) VALUES (?, ?,?, "pending")`;
      await database
        .getConnection()
        .execute(insertQuery, [username, maxGameId, gameWeights[maxGameId]]);
      //return the suggestion
      return getPendingSuggestion(username); //Recursion here may not be the best call... too tired to fix o(￣┰￣*)ゞ
    }
  } catch (err) {
    logger.error({ level: "error", message: err.message });
    throw new Errors.DatabaseError("Error getting pending suggestion");
  }
}
/**
 * Get all the currently added suggestions for a user. I.E. "To play"
 * @param {*} username The user to get suggestions for
 * @returns an array of suggestion objects
 */
async function getAddedSuggestions(username) {
  try {
    let suggestionQuery = `SELECT gameID, score, status from ${suggestionTable} WHERE user = ? AND status = "added"`;
    let [
      suggestionRows,
      suggestionFields
    ] = await database.getConnection().execute(suggestionQuery, [username]);
    let suggestions = [];
    for (let i = 0; i < suggestionRows.length; i++) {
      let suggestion = {
        gameID: suggestionRows[i].gameID,
        score: suggestionRows[i].score,
        status: suggestionRows[i].status
      };
      suggestion.game = await gameModel.getGameById(suggestion.gameID);
      suggestions.push(suggestion);
    }
    return suggestions;
  } catch (err) {
    logger.error({ level: "error", message: err.message });
    throw new Errors.DatabaseError("Error getting added suggestions");
  }
}

/**
 * Add a suggestion to the TO PLAY list.
 * @param {*} username the username of the user the suggestion is to;
 * @param {*} gameID the ID of the suggested game to add;
 * @returns
 */
async function addSuggestion(username, gameID) {
  try {
    let updateQuery = `UPDATE ${suggestionTable} SET status = "added" WHERE user = ? AND gameID = ?`;
    await database.getConnection().execute(updateQuery, [username, gameID]);
    return true;
  } catch (err) {
    logger.error({ level: "error", message: err.message });
    throw new Errors.DatabaseError("Error adding suggestion");
  }
}
/**
 * Dismiss a suggestion
 * @param {*} username the username of the user to dismiss the suggestion from
 * @param {*} gameID the gameID of the suggestion to dismiss
 * @returns true if successful
 */
async function dismissSuggestion(username, gameID) {
  try {
    let updateQuery = `UPDATE ${suggestionTable} SET status = "dismissed" WHERE user = ? AND gameID = ?`;
    await database.getConnection().execute(updateQuery, [username, gameID]);
    return true;
  } catch (err) {
    logger.error({ level: "error", message: err.message });
    throw new Errors.DatabaseError("Error dismissing suggestion");
  }
}

module.exports = {
  generateWeights,
  clearSuggestions,
  clearPendingSuggestions,
  getPendingSuggestion,
  getAddedSuggestions,
  addSuggestion,
  dismissSuggestion,
  deleteSuggestion
};
