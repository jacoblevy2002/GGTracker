//This class contains and holds all error classes

class ServerError extends Error {}
class UserError extends Error {}
class InvalidInput extends UserError {} // used to convey to the controller that the input was invalid

class DatabaseError extends ServerError {} // used to convey to the controller that there was a database error

class InvalidGameName extends InvalidInput {}  // used to convey to the controller that the game name was invalid
class InvalidGameDescription extends InvalidInput {}  // used to convey to the controller that the game description was invalid
class InvalidId extends InvalidInput {} // used to convey to the controller that the id was invalid
class InvalidUsername extends InvalidInput {}
class InvalidAdminChange extends InvalidInput {}
class InvalidPlaytime extends InvalidInput {}
class InvalidEmail extends InvalidInput {}
class InvalidLogin extends InvalidInput {}
class InvalidPassword extends InvalidInput {}

class GameNotFound extends UserError {} // used to convey to the controller that the game could not be found
class DuplicateUsernameError extends UserError {}
class UnauthorizedAccess extends UserError {}
class UnauthenticatedAccess extends UserError {}
class DuplicateGame extends UserError {}    // signifies that a user already owns a game

class InvalidGenre extends UserError {}
class InvalidGeDuplicateName extends UserError { }
class GenreNotFoundException extends UserError { }



module.exports = {
    ServerError,
    UserError,
    InvalidInput,
    DuplicateUsernameError,
    InvalidGameName,
    InvalidGameDescription,
    DatabaseError,
    InvalidId,
    GameNotFound,
    InvalidGenre,
    InvalidGeDuplicateName,
    GenreNotFoundException,
    InvalidUsername,
    InvalidAdminChange,
    InvalidPlaytime,
    InvalidEmail,
    InvalidLogin,
    InvalidPassword,
    UnauthorizedAccess,
    DuplicateGame,
    InvalidInput,
    UnauthenticatedAccess
}