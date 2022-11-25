//This model handles genres
const database = require ("./globalModel.js");
const validator = require ("validator");
const errors = require ("../errorContainer");
const pino = require ("pino")
const logger = pino(pino.destination("logs/models/genresLogs.log"))


/**
 * Validate a genre name
 * @param {string} genreName genre name to be added to the genre table
 * @returns id of added genre
 * @throws {InvalidGenre} if genre name is valid
 * @throws {DatabaseError} if database error occurs
 */
async function addGenre(genreName){
    if(!validateGenre(genreName)){
        logger.error({level: "error", message:"Genre name is not valid"});
        throw new errors.InvalidGenre("Error genre doesn't meet criteria");   
    }
    try {
        //let conn = database.getConnection(); //get connection

        let duplicatesQuery = 'SELECT name FROM Genres WHERE name=?';
        let [rows, fields] = await database.getConnection().execute(duplicatesQuery, [genreName]) //execute query checking for rows with the name passed in.

        if(rows.length > 0){ //check if there is a row with the name
            logger.error({level: "error", message:"Genres name already in the database"})
            throw new errors.InvalidGeDuplicateName("Genres name already in the database");
        }
        else{
            let SQLQuery = 'INSERT INTO Genres(name) VALUES(?)';
            await database.getConnection().execute(SQLQuery, [genreName]) //inserting the genre name into the database
            logger.info({level: "info", message:"genres "+genreName +" added to database"})
            let [rows, fields] = await database.getConnection().execute('SELECT LAST_INSERT_ID();');
            //Get what the id is.
            let id = rows[0]["LAST_INSERT_ID()"];
            return await getGenreById(id);
        }
    }
    catch(err){
        logger.error({level: "error", message: err.message}) //some kind of database error.
        throw new errors.DatabaseError("Error adding new genre")
    }
}

/**
 * Validate a genre name
 * @param {number} genreId ID of genre to be deleted from the genre table
 * @returns success string if added successfully, else return null (nothing)
 * @throws {InvalidGenre} if genre name is valid
 * @throws {DatabaseError} if database error occurs
 */
async function deleteGenre(genreId){
    
    if(!validateId(genreId)){
        logger.error({level: "error", message:"Genre ID is not valid"});
        throw new errors.InvalidGenre("Error genre ID is invalid");   
    }
    //let connection = await database.getConnection();
    try {
        
        let res = await getGenreById(genreId);
        if(res != false) {
            let SQLQuery = 'DELETE FROM Genres where id=?';
            //console.log(connection)
            //console.log(await database.getConnection())
            let relationQuery = 'DELETE FROM GamesGenres WHERE genreId=?';
            await database.getConnection().execute(relationQuery, [genreId]);
            logger.info({level: "info", message: "Successfully deleted genre relations: " +res.name});
            await database.getConnection().execute(SQLQuery, [genreId]);
            logger.info({level: "info", message: "Successfully deleted genre: " +res.name});
            return res.name
        } else {
            logger.error({level: "error", message: `Tried to delete genre ${genreId}, but it did not exist.`});
            throw new errors.GenreNotFoundException(`Genre of id ${genreId} does not exist`)
        }

    } 
    catch (error) {
        //console.log(connection)
        logger.error({level:"error", message: error.message});
        throw new errors.DatabaseError("Error deleting genre from database");
    }

}
/**
 * Validate a genre name
 * @param {string} name current genre name to be changed
 * @param {string} newname The name to change the genre name to
 * @returns success string if added successfully, else return null (nothing)
 * @throws {InvalidGenre} if name or new name is not valid
 * @throws {DatabaseError} if database error occurs
 */
async function editGenre(id, name){
    if(!validateId(id) && !validateGenre(name)){
        logger.error({level: "error", message:"Update Genre id or name is not valid"});
        throw new errors.InvalidGenre("Error update genre id doesn't meet criteria");   
    }
    try {
        let conn = database.getConnection(); //get connection

        let SQLQuery = `UPDATE Genres SET name="${name}" WHERE id=${id}`
        await conn.execute(SQLQuery);
        logger.info({level: "info", message: "genre successfully updated"})
        return getGenreById(id);
    } 
    catch (error) {
        logger.error({level: "error", message: error.message});
        throw new errors.DatabaseError("Error editing genre");
    }
}

/**
 * Validate a genre name
 * @returns list of Genres or returns null (nothing)
 * @throws {DatabaseError} if database error occurs
 */
async function getGenresList(){


    const sqlQuery = 'SELECT id, name FROM Genres';
    let genresList = []

    try {
        let [rows, fields] = await database.getConnection().execute(sqlQuery);
        for (let i = 0; i < rows.length; i++) {
            genresList.push({id:rows[i].id, name:rows[i].name})
            
        }
        logger.info({level:"info", message: "Genre list returned successfully"})
        return genresList;

    } catch (error) {
        logger.error({level:"error", message:"Error getting genres list" + error.message});
        throw new errors.DatabaseError("Error getting genres list");
    }


}

/**
 * Validate a genre name
 * @param {string} genreName The description to validate
 * @returns true if the name is valid, otherwise returns false
 * @throws {InvalidGenre} if name is not valid
 * @throws {DatabaseError} if database error occurs
 */
async function getGenreById(id){
    if(!validateId(id)){
        logger.error({level: "error", message:"Genre id is not a valid number"});
        throw new errors.InvalidGenre("Error genre id doesn't meet criteria");
    }
        const SQLQuery = 'SELECT * FROM Genres WHERE id=?';
        let [rows, fields] = await database.getConnection().execute(SQLQuery, [id]).catch((error) => { logger.error(error); throw new errors.DatabaseError("Database error")});
        if(rows.length == 0)
            throw new errors.GenreNotFoundException("Genre not found");
        logger.info({level: "info", message: "Successfully received genre at id"})
        return {id:rows[0].id, name:rows[0].name};
}

/**
 * Validate a genre name
 * @param {string} genreName The description to validate
 * @returns true if the name is valid, otherwise returns false
 * @throws {InvalidGenre} if name is not valid
 * @throws {DatabaseError} if database error occurs
 */
async function getGenreByName(genreName){
    if(!validateGenre(genreName)){
        logger.error({level: "error", message:"Genre name is not a valid"});
        throw new errors.InvalidGenre("Error genre name doesn't meet criteria");
    }
    try {
        let SQLQuery = 'select id, name FROM Genres WHERE name=?'
        let [row, fields] = await database.getConnection().execute(SQLQuery, [genreName]);
        if(row.length > 0){
            logger.info({level: "info", message: "Successfully received genre by name"})
            return {id: row[0].id, name: row[0].name};
        } else {
            return false;
        }

    } 
    catch (error) {
        logger.error({level: "error", message: error.message});
        throw new errors.DatabaseError("Error getting genre by name");
    }
}
/**
 * Search for a list of genres based off a part of their names
 * @param {string} name
 * @returns an array of genre containing the inputted name
 * @throws {DatabaseError} if there is a database error
 * @throws {invalidGenre} if the genre name is invalid
 * @throws {GenreNotFoundException} if no genres are found
 */
 async function getGenresByPartialName(name) {
    if (!validateGenre(name)) {
        logger.error({level: "error", message:"Genre name is not a valid"});
        throw new errors.InvalidGenre("Error genre name doesn't meet criteria");
    } else {
      try {
        let query = `SELECT id, name FROM Genres WHERE name LIKE ?`;
        let [rows, fields] = await database.getConnection().execute(query, [`%${name}%`]);
        if (rows.length == 0) {
          throw new Errors.GenreNotFoundException("Could not find any genre results"); // or throw an error?
        } else {
          let arr = [];
          for (let i = 0; i < rows.length; i++) {
            arr.push({
              id: rows[i].id,
              name: rows[i].name,
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
 * Validate a genre name
 * @param {string} name The description to validate
 * @returns true if the name is valid, otherwise returns false
 */
function validateGenre(name) {
    if (name == "" || name == null || name == undefined || !validator.isAlphanumeric(name, "en-US", {ignore:" "}))
        return false;
    else
        return true;
}

/**
 * Validate a genre id
 * @param {Integer} id The description to validate
 * @returns true if the id is valid, otherwise returns false
 */
function validateId(id){
    let ID =id.toString();
    if(id == null || id == undefined || !validator.isNumeric(ID))
        return false;
    else
        return true;
}

module.exports ={
    addGenre,
    deleteGenre,
    editGenre,
    getGenresList,
    getGenreByName,
    getGenreById,
    getGenresByPartialName
}