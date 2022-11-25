const model = require("../models/globalModel.js");
const gameModel = require("../models/gameModel.js");
const genreModel = require("../models/genreModel.js");
const reccomendationModel = require("../models/reccomendationModel.js");
const mysql = require("mysql2/promise");
const userModel = require("../models/userModel");
const errors = require("../errorContainer");
const dbName = "test_db";
const uuid = require('uuid')

let BeforeEachFunction = async () => await model.initialize(dbName, true);
let AfterEachFunction = async () => {
  if (await model.getConnection()) await model.getConnection().end();
};

describe("Test gameModel", () => {
  beforeEach(BeforeEachFunction);
  afterEach(AfterEachFunction);

  let gameData = [
    { name: "Pokemon", description: "Pocket monsters", image: null },
    { name: "Outlast", description: "Spooky horror game oo", image: null },
    {
      name: "The Last of Us",
      description: "Cool Narrative zombie game",
      image: null
    },
    {
      name: "The Witcher 2",
      description: "Hot wolf man goes to kill monsters the second time",
      image: null
    },
    {
      name: "The Witcher",
      description: "Hot wolrf man goes to kill monsters the first time",
      image: null
    },
    {
      name: "The Witcher 3 Wild Hunt",
      description: "Hot wolf man goes to kill monsters the third time",
      image: null
    },
    {
      name: "Undertale",
      description: "Sad rpg where you have choice to not kill",
      image: null
    },
    {
      name: "Uncharted 4 A Thiefs End",
      description: "Thief steal stuff ",
      image: null
    },
    {
      name: "Metal Gear Rising Revengeance",
      description: "Hot cyborg fights america",
      image: null
    },
    { name: "Pokemon 2", description: "Pocket monsters", image: null },
    { name: "Outlast 2", description: "Spooky horror game oo", image: null },
    {
      name: "The Last of Us 2",
      description: "Cool Narrative zombie game",
      image: null
    },
    { name: "The Witcher 2 2", description: "Hot wolf", image: null },
    {
      name: "Undertale 2",
      description: "Sad rpg where you have choice to not kill",
      image: null
    },
    {
      name: "Uncharted 4 A Thiefs End 2",
      description: "Thief steal stuff ",
      image: null
    },
    {
      name: "Metal Gear Rising Revengeance 2",
      description: "Hot cyborg fights america",
      image: null
    }
  ];

  async function fillGames() {
    for (let i = 0; i < gameData.length; i++) {
      const element = gameData[i];
      await gameModel.addGame(element.name, element.description);
    }
  }

  test("Test addGame", async () => {
    let gameName = "test game";
    let gameDescription = "test description";
    let gameImage = null;
    let game = await gameModel.addGame(gameName, gameDescription, gameImage);
    expect(game.name).toBe(gameName);
    expect(game.description).toBe(gameDescription);
    expect(game.image).toBe(gameImage);
  });

  test("Test addGame failure", async () => {
    let gameName =
      "f839 h49flo .4eiwakfal jhksl;kfjdg;skldfk;jlfgjdkl;gfsklj;sgdfj;klfgj;kldsfgj;klsdfgjkl;sdfg;jlkdfgj;kldfjg;kldfjgk;ljkdfgl;jkl;sdfgdnfgame";
    let gameDescription = "test asd";
    let gameImage = null;
    await expect(async () => {
      await gameModel.addGame(gameName, gameDescription, gameImage);
    }).rejects.toThrow();
  });

  test("Test getGameById", async () => {
    let gameName = "test game";
    let gameDescription = "test description";
    let gameImage = null;
    await gameModel.addGame(gameName, gameDescription, gameImage);
    let game = await gameModel.getGameById(1);
    expect(game.name).toBe(gameName);
    expect(game.description).toBe(gameDescription);
    expect(game.image).toBe(gameImage);

    expect(game.id).toBe(1);
  });

  test("Test getGameById failure", async () => {
    await expect(async () => {
      await gameModel.getGameById(341);
    }).rejects.toThrow();
  });

  test("Test getGameByName", async () => {
    await fillGames();
    let games = await gameModel.getGameByName("Pokemon");
    let game = games[0];
    expect(game.name).toBe("Pokemon");
    expect(game.description).toBe("Pocket monsters");
    expect(game.image).toBe(null);
  });

  test("Test getGameByName failure", async () => {
    await fillGames();
    await expect(async () => {
      await gameModel.getGameByName("test");
    }).rejects.toThrow();
  });

  test("Test getGamesByPartialName", async () => {
    await fillGames();
    let games = await gameModel.getGamesByPartialName("Witcher");
    expect(games.length).toBe(4);
  });

  test("Test getGamesByPartialName failure", async () => {
    await fillGames();
    await expect(async () => {
      await gameModel.getGamesByPartialName("test");
    }).rejects.toThrow();
  });

  test("Test updateGame", async () => {
    await fillGames();
    let game = await gameModel.getGameById(1);
    game.name = "test game";
    game.description = "test description";
    game.image = null;
    await gameModel.updateGame(game.id, game.name, game.description);
    game = await gameModel.getGameById(1);
    expect(game.name).toBe("test game");
    expect(game.description).toBe("test description");
    expect(game.image).toBe(null);
  });

  test("Test updateGame failure", async () => {
    await fillGames();
    let game = await gameModel.getGameById(1);
    game.name =
      "f839 h49flo .4eiwakfal jhksl;kfjdg;skldfk;jlfgjdkl;gfsklj;sgdfj;klfgj;kldsfgj;klsdfgjkl;sdfg;jlkdfgj;kldfjg;kldfjgk;ljkdfgl;jkl;sdfgdnfgame";
    game.description = "test asd";
    game.image = null;
    await expect(async () => {
      await gameModel.updateGame(game.id, game.name, game.description);
    }).rejects.toThrow();
  });

  test("Test getAllGames", async () => {
    await fillGames();
    let games = await gameModel.getAllGames();
    expect(games.length).toBe(gameData.length);
    for (let i = 0; i < gameData.length; i++) {
      const element = gameData[i];
      expect(games[i].name).toBe(element.name);
      expect(games[i].description).toBe(element.description);
      expect(games[i].image).toBe(element.image);
    }
  });

  test("Test addGame", async () => {
    let genre = "testGenre";
    let genreAdded = await genreModel.addGenre(genre);
    expect(genreAdded.name).toBe(genre);
    // :c expect(await genreModel.getGenreByName(genre).name).toBe(genre);
  });

  test("Test adding genre to game", async () => {
    await fillGames();
    let genre = await genreModel.addGenre("Action");
    let genre2 = await genreModel.addGenre("Adventure");
    let genre3 = await genreModel.addGenre("RPG");
    await gameModel.addGenreToGame(1, 1);
    await gameModel.addGenreToGame(1, 2);
    await gameModel.addGenreToGame(1, 3);
    let game = await gameModel.getGameById(1);
    expect(game.genres.length).toBe(3);
    expect(game.genres[0].id).toBe(1);
    expect(game.genres[1].id).toBe(2);
    expect(game.genres[2].id).toBe(3);
    expect(game.genres[0].name).toBe("Action");
    expect(game.genres[1].name).toBe("Adventure");
    expect(game.genres[2].name).toBe("RPG");
  });
  test("Test getting games from genre", async () => {
    await fillGames();
    let genre = await genreModel.addGenre("Action");
    await gameModel.addGenreToGame(1, 1);
    await gameModel.addGenreToGame(2, 1);
    let games = await gameModel.getGamesFromGenre(1);
    expect(games.length).toBe(2);
    expect(games[0].id).toBe(1);
    expect(games[1].id).toBe(2);

  })
  test("Test getting genre from game", async () => {
    await fillGames();
    let genre = await genreModel.addGenre("Action");
    let genre2 = await genreModel.addGenre("Adventure");
    let genre3 = await genreModel.addGenre("RPG");
    await gameModel.addGenreToGame(1, 1);
    await gameModel.addGenreToGame(1, 2);
    await gameModel.addGenreToGame(1, 3);
    let game = await gameModel.getGameById(1);
    expect(game.genres.length).toBe(3);
    expect(game.genres[0].id).toBe(1);
    expect(game.genres[1].id).toBe(2);
    expect(game.genres[2].id).toBe(3);
    expect(game.genres[0].name).toBe("Action");
    expect(game.genres[1].name).toBe("Adventure");
    expect(game.genres[2].name).toBe("RPG");
    let genresSpecific = await gameModel.getGenresFromGame(1);
    expect(genresSpecific.length).toBe(3);
    expect(genresSpecific[0].id).toBe(1);
    expect(genresSpecific[1].id).toBe(2);
    expect(genresSpecific[2].id).toBe(3);
    expect(genresSpecific[0].name).toBe("Action");
    expect(genresSpecific[1].name).toBe("Adventure");
    expect(genresSpecific[2].name).toBe("RPG");
  });
  test("Test deleting a genre a game", async () => {
    await fillGames();
    let genre = await genreModel.addGenre("Action");
    let genre2 = await genreModel.addGenre("Adventure");
    let genre3 = await genreModel.addGenre("RPG");
    await gameModel.addGenreToGame(1, 1);
    await gameModel.addGenreToGame(1, 2);
    await gameModel.addGenreToGame(1, 3);
    let game = await gameModel.getGameById(1);
    expect(game.genres.length).toBe(3);
    let newGame = await gameModel.deleteGenreFromGame(1, 1);
    expect(newGame.genres.length).toBe(2);
    expect(newGame.genres[0].id).toBe(2);


  })
  test("Test deleting a game", async () => {
    await fillGames();
    let game = await gameModel.getGameById(1);
    expect(game.id).toBe(1);
    await gameModel.deleteGame(1);
    expect(async () => {
      await genreModel.deleteGenre(game.id);
    }).rejects.toThrow();


  })
});
describe("Test genre model", () => {

  let BeforeEachFunction = async () => await model.initialize(dbName, true);
  let AfterEachFunction = async () => {
    if (model.getConnection()) await model.getConnection().end();
  };

  beforeEach(BeforeEachFunction);
  afterEach(AfterEachFunction);

  const validGenres = [
    "sandbox",
    "shooter",
    "multiplayer",
    "role playing",
    "simulation",
    "puzzler",
    "survival",
    "platformer"
  ];

  async function fillGenres() {
    for (let i = 0; i < validGenres.length; i++) {
      await genreModel.addGenre(validGenres[i]);
    }
  }

  test("Test fail add genre", async () => {
    let genreName = "12345 genre! @#$%^&*";
    await expect(async () => {
      await genreModel.addGenre(genreName);
    }).rejects.toThrow();
  });

  test("test remove genre", async () => {
    await genreModel.addGenre("testone");
    await genreModel.addGenre("testtwo");
    await genreModel.addGenre("testTjree");
    let genreID = 2;
    let genre = await genreModel.getGenreById(genreID);
    expect(await genreModel.deleteGenre(genreID)).toBe(genre.name);
    //expect(await genreModel.getGenreById(genreID)).toBe(false);
    //expect(await genreModel.getGenreByName(genre.name)).toBe(false);
  });

  test("test get all genres", async () => {
    await fillGenres();
    let genreList = await genreModel.getGenresList();
    for (let i = 0; i < genreList.length; i++) {
      let elm = validGenres[i];
      expect(genreList[i].name).toBe(validGenres[i]);
    }
  });

  test("test fail remove genre", async () => {
    let invalidGenre = 999;
    await genreModel.addGenre("testone");
    await genreModel.addGenre("testtwo");
    await genreModel.addGenre("testTjree");
    expect(async () => {
      await genreModel.deleteGenre(invalidGenre);
    }).rejects.toThrow();
  });
});

describe("user model tests", () => {
  beforeEach(BeforeEachFunction);
  afterEach(AfterEachFunction);

  const name = "my_username";
  const pass = "!E7*Uoui^3D#rrgXxJ4SQnr4Kp@";
  const bio = "My bio";
  const email = "my.email@example.com";
  const admin = false;
  const table = "Users";
  const gameTable = "UsersGames";
  const gameName = "Minecraft";
  const gameDescription = "Mine & Craft";
  const playtime = 10;
  const rating = true;

  async function PopulateUser() {
    await userModel.addEntry(name, pass, bio, admin, email);
    await gameModel.addGame(gameName, gameDescription, null);
  }

  // Add
  test("add valid entry", async () => {
    let result = await userModel.addEntry(name, pass, bio, admin, email);

    expect(result.Username).toBe(name);
    expect(result.Bio).toBe(bio);
    expect(result.IsAdmin).toEqual(admin);
    expect(result.Email).toBe(email);
    expect(result.Public).toBeTruthy();

    let testAdd = (await model.getConnection().execute(`SELECT username, bio, admin, email, joinDate, public from ${table} where username = ?`, [name]))[0][0];

    expect(testAdd.username).toBe(name);
    expect(testAdd.bio).toBe(bio);
    expect(testAdd.admin).toBeFalsy();
    expect(testAdd.email).toBe(email);
    expect(testAdd.joinDate.toISOString().split('T')[0]).toBe(new Date(Date.now()).toISOString().split('T')[0]);
    expect(testAdd.public).toBeTruthy();
  });

  test("add invalid email", async () => await expect(async () => await userModel.addEntry(name, pass, bio, admin, "not an email")).rejects.toThrow(errors.InvalidEmail));
  
  test("add invalid name", async () => await expect(async () => await userModel.addEntry("invalid username", pass, bio, admin, email)).rejects.toThrow(errors.InvalidUsername));
  
  test("add invalid password", async () => await expect(async () => await userModel.addEntry(name, "insecurePassword", bio, admin, email)).rejects.toThrow(errors.InvalidPassword));
  
  test("add invalid bio", async () => await expect(async () => await userModel.addEntry(name, pass, "this bio is too long yvyghbyvdyavdwaydvwayudvawudbsadwdawbdgawdvawdiawrctfvgbhvcfxedrcfgvhbvftcrdftvgbhdvawdiywadvawidvawdiawdvawdiawd", admin, email)).rejects.toThrow(errors.InvalidInput));

  test("add duplicate user", async () => {
    await PopulateUser()
    await expect(async () => await userModel.addEntry(name, pass, bio, admin, email)).rejects.toThrow(errors.DuplicateUsernameError)
  })

  // Promote & Demote
  test("promote to admin", async () => {
    await PopulateUser();

    await userModel.promoteUser(name);

    let conn = model.getConnection();
    let testState = (await conn.execute( `SELECT admin from ${table} where username = ?`, [name] ))[0][0];

    expect(testState.admin).toBeTruthy();
  });

  test("promote to admin already admin", async () => {
    await userModel.addEntry(name, pass, bio, true, email);

    await expect(async () => await userModel.promoteUser(name)).rejects.toThrow(errors.InvalidAdminChange);
  });

  test("demote from admin", async () => {
    await userModel.addEntry(name, pass, bio, true, email);

    await userModel.demoteUser(name);

    let conn = model.getConnection();
    let testState = (await conn.execute(`SELECT admin from ${table} where username = ?`, [name] ))[0][0];

    expect(testState.admin).toBeFalsy();
  });

  test("demote from admin not an admin", async () => {
    await PopulateUser();

    await expect(async () => await userModel.demoteUser(name)).rejects.toThrow(errors.InvalidAdminChange);
  });

  test("isAdmin", async () => {
    await PopulateUser();

    expect(await userModel.isAdmin(name)).toBeFalsy();

    await userModel.promoteUser(name);

    expect(await userModel.isAdmin(name)).toBeTruthy();
  });

  // Add game to user
  test("add valid game to valid user", async () => {
    await PopulateUser();

    let result = await userModel.addGameToUser(name, 1, playtime, rating);

    expect(result.user).toBe(name);
    expect(result.gameID).toBe(1);
    expect(result.playtime).toBe(playtime);
    expect(result.rating).toEqual(rating);

    let testAdd = (await model.getConnection().execute(`SELECT user, gameID, playtime, rating from ${gameTable} where user = ? and gameID = ?`, [name, 1]))[0][0];

    expect(testAdd.user).toBe(name);
    expect(testAdd.gameID).toBe(1);
    expect(testAdd.playtime).toBe(parseInt(playtime));
    expect(testAdd.rating).toBeTruthy();
  });

  test("add invalid game to valid user", async () => {
    await PopulateUser();

    await expect(async () => await userModel.addGameToUser(name, "not an id", playtime, rating)).rejects.toThrow(errors.InvalidId);
  });

  test("add valid game to invalid user", async () => {
    await PopulateUser();

    await expect(async () => await userModel.addGameToUser("not a name", 1, playtime, rating)).rejects.toThrow(errors.InvalidUsername);
  });

  test("add valid game to valid user with invalid playtime", async () => {
    await PopulateUser()

    await expect(async () => await userModel.addGameToUser(name, 1, "not a playtime", rating)).rejects.toThrow(errors.InvalidPlaytime)
  })

  // Remove game from user
  test("remove valid game from valid user", async () => {
    await PopulateUser();

    await userModel.addGameToUser(name, 1, playtime, rating);

    await userModel.removeGameFromUser(name, 1)

    let testAdd = (await model.getConnection().execute(`SELECT user, gameID, playtime, rating from ${gameTable} where user = ? and gameID = ?`, [name, 1]))[0];
    expect(testAdd.length).toBe(0)
  });

  test("remove invalid game from valid user", async () => {
    await PopulateUser();

    await userModel.addGameToUser(name, 1, playtime, rating);
    await expect(async () => await userModel.removeGameFromUser(name, "not an id")).rejects.toThrow(errors.InvalidId);
  });

  test("remove valid game from invalid user", async () => {
    await PopulateUser();

    await userModel.addGameToUser(name, 1, playtime, rating);
    await expect(async () => await userModel.addGameToUser("not a name", 1)).rejects.toThrow(errors.InvalidUsername);
  });

  // Can user add game
  test("can user add game - yes", async () => {
    await PopulateUser()
    let result = await userModel.canUserAddGame(name, 1)
    expect(result).toBeTruthy()
  })

  test("can user add game - no", async () => {
    await PopulateUser()
    await userModel.addGameToUser(name, 1, playtime, rating);
    let result = await userModel.canUserAddGame(name, 1)
    expect(result).toBeFalsy()
  })

  test("can user add game - invalid game", async () => {
    await PopulateUser()
    await userModel.addGameToUser(name, 1, playtime, rating);
    await expect(async () => await userModel.canUserAddGame(name, "not a game")).rejects.toThrow(errors.InvalidId);
  })
  
  test("can user add game - invalid name", async () => {
    await PopulateUser()
    await userModel.addGameToUser(name, 1, playtime, rating);    
    await expect(async () => await userModel.canUserAddGame("not a name", 1)).rejects.toThrow(errors.InvalidUsername);
  })

  // Update user's game
  test("update user game - valid", async () => {
    await PopulateUser()
    await userModel.addGameToUser(name, 1, playtime, rating)

    await userModel.updateUserGame(name, 1, playtime + 1, !rating)
    let testAdd = (await model.getConnection().execute(`SELECT user, gameID, playtime, rating from ${gameTable} where user = ? and gameID = ?`, [name, 1]))[0][0];

    expect(testAdd.user).toBe(name);
    expect(testAdd.gameID).toBe(1);
    expect(testAdd.playtime).toBe(playtime + 1);
    expect(testAdd.rating).toBeFalsy();
  })

  test("update user game - they don't own", async () => {
    await PopulateUser()

    await expect(async () => await userModel.updateUserGame(name, 1, playtime + 1, !rating)).rejects.toThrow(errors.GameNotFound)
  })

  test("update user game - invalid game", async () => {
    await PopulateUser()

    await expect(async () => await userModel.updateUserGame(name, "not a game", playtime + 1, !rating)).rejects.toThrow(errors.InvalidId)
  })

  test("update user game - invalid username", async () => {
    await PopulateUser()

    await expect(async () => await userModel.updateUserGame("not a name", 1, playtime + 1, !rating)).rejects.toThrow(errors.InvalidUsername)
  })

  test("update user game - invalid playtime", async () => {
    await PopulateUser()
    await userModel.addGameToUser(name, 1, playtime, rating)

    await expect(async () => await userModel.updateUserGame(name, 1, "not a playtime", !rating)).rejects.toThrow(errors.InvalidPlaytime)
  })

  // Get user game stats
  test('get stats valid', async () => {
    await PopulateUser()

    await userModel.addGameToUser(name, 1, playtime, rating)
    let result = await userModel.getUserGameStats(name, 1)
    let testAdd = (await model.getConnection().execute(`SELECT playtime, rating from ${gameTable} where user = ? and gameID = ?`, [name, 1]))[0][0];

    expect(testAdd.playtime).toBe(result.Playtime);
    expect(testAdd.rating).toBe(result.Rating);
  })

  test('get stats dont own', async () => {
    await PopulateUser()

    await expect(async () => await userModel.getUserGameStats(name, 1)).rejects.toThrow(errors.GameNotFound)
  })

  test('get stats invalid username', async () => {
    await PopulateUser()

    await expect(async () => await userModel.getUserGameStats("not a name", 1)).rejects.toThrow(errors.InvalidUsername)
  })

  test('get stats invalid game', async () => {
    await PopulateUser()

    await expect(async () => await userModel.getUserGameStats(name, "not a game")).rejects.toThrow(errors.InvalidId)
  })

  // Delete User
  test("delete user valid", async () => {
    await PopulateUser();

    await userModel.deleteUser(name);

    let conn = model.getConnection();
    let testAdd = (await conn.execute("SELECT * from " + table))[0];
    expect(testAdd.length).toBe(0);

    testAdd = (await conn.execute("SELECT * from " + gameTable))[0];
    expect(testAdd.length).toBe(0);
  });

  test('delete user invalid', async () => await expect(async () => await userModel.deleteUser("not a name")).rejects.toThrow(errors.InvalidUsername))

  // Get games from user
  test("get games from user", async () => {
    await PopulateUser();

    await userModel.addGameToUser(name, 1, playtime, rating);

    let r = await userModel.getUsersGames(name);

    expect(r[0].name).toBe(gameName)
    expect(r[0].description).toBe(gameDescription)
    expect(r[0].image).toBe(null)
    expect(r[0].playtime).toBe(playtime)
    expect(r[0].rating).toBeTruthy()
  })

  // checkLogin
  test("login valid username", async () => {
    await PopulateUser();

    let r = await userModel.checkLogin(name, pass)
    expect(r).toBeTruthy()
    expect(r).toBe(name)
  })

  test('login valid email', async () => {
    await PopulateUser()

    let r = await userModel.checkLogin(email, pass)
    expect(r).toBeTruthy()
    expect(r).toBe(name)
  })

  test("login invalid username", async () => {
    await PopulateUser();

    await expect( async () => await userModel.checkLogin("not a name", pass) ).rejects.toThrow(errors.InvalidUsername);
  });

  test("login invalid email", async () => {
    await PopulateUser();

    await expect( async () => await userModel.checkLogin("notanemail@example.com", pass) ).rejects.toThrow(errors.InvalidUsername);
  });

  test("login invalid password", async () => {
    await PopulateUser();
    await expect(async () => await userModel.checkLogin(name, 'not a password')).rejects.toThrow(errors.InvalidLogin)
  })

  // getAllUsers
  test('get all users', async () => {
    await PopulateUser()
    await userModel.addEntry(name + "2", pass, bio, true, "myemail@example.com")

    let r = await userModel.getAllUsers()

     expect(r.length).toBe(2)

    expect(r[0].Username).toBe(name)
    expect(r[0].Email).toBe(email)
    expect(r[0].IsAdmin).toBeFalsy()
    expect(r[0].JoinDate.toISOString().split('T')[0]).toBe(new Date(Date.now()).toISOString().split('T')[0])

    expect(r[1].Username).toBe(name + "2")
    expect(r[1].Email).toBe("myemail@example.com")
    expect(r[1].IsAdmin).toBeTruthy()
    expect(r[1].JoinDate.toISOString().split('T')[0]).toBe(new Date(Date.now()).toISOString().split('T')[0])
  })

  // get user
  test('get user valid', async () => {
    await PopulateUser()

    let r = await userModel.getUser(name)

    expect(r.Username).toBe(name)
    expect(r.Bio).toBe(bio)
    expect(r.IsPublic).toBeTruthy()
    expect(r.Email).toBe(email)
    expect(r.JoinDate.toISOString().split('T')[0]).toBe(new Date(Date.now()).toISOString().split('T')[0])
    expect(r.IsAdmin).toBeFalsy()
  })

  test('get user invalid', async () => await expect(async () => await userModel.getUser('not a name')).rejects.toThrow(errors.InvalidUsername))

  // isPublic
  test('isPublic valid user', async () => {
    await PopulateUser()
    let r = await userModel.isPublic(name)
    expect(r).toBeTruthy()
  })

  test('isPublic invalid user', async () => await expect(async () => await userModel.isPublic('not a name')).rejects.toThrow(errors.InvalidUsername))

  // updateBio
  test('update bio valid', async () => {
    await PopulateUser()
    await userModel.updateBio(name, bio + " new bio")
    let testAdd = (await model.getConnection().execute(`SELECT bio from ${table} where username = ?`, [name]))[0][0];
    expect(testAdd.bio).toBe(bio + " new bio")
  })

  test('update bio invalid username', async () => await expect(async () => await userModel.updateBio("not a name", bio)).rejects.toThrow(errors.InvalidUsername))

  test('update bio invalid bio', async () => {
    await PopulateUser()
    await expect(async () => await userModel.updateBio(name, "this bio is too long yvyghbyvdyavdwaydvwayudvawudbsadwdawbdgawdvawdiawrctfvgbhvcfxedrcfgvhbvftcrdftvgbhdvawdiywadvawidvawdiawdvawdiawd")).rejects.toThrow(errors.InvalidInput)
  })

  // Update user
  test('update user valid', async () => {
    await PopulateUser()

    await userModel.updateUser(name, name + "2", bio + " new bio", "example@example.com", false)
    let testAdd = (await model.getConnection().execute(`SELECT username, bio, email, public from ${table} where username = ?`, [name + "2"]))[0][0];

    expect(testAdd.username).toBe(name + "2")
    expect(testAdd.bio).toBe(bio + " new bio")
    expect(testAdd.email).toBe("example@example.com")
    expect(testAdd.public).toBeFalsy()
  })

  test('update user invalid new name', async () => {
    await PopulateUser()
    await expect(async () => await userModel.updateUser(name, "invalid name", bio, email, true)).rejects.toThrow(errors.InvalidUsername)
  })

  test('update user invalid old name', async () => {
    await PopulateUser()
    await expect(async () => await userModel.updateUser("invalid name", name, bio, email, true)).rejects.toThrow(errors.InvalidUsername)
  })

  test('update user invalid bio', async () => {
    await PopulateUser()
    await expect(async () => await userModel.updateUser(name, name, "this bio is too long yvyghbyvdyavdwaydvwayudvawudbsadwdawbdgawdvawdiawdvawdiywadvawidvawdiawdvawdiawdawddddddddddddddddwadadsadwdefgrgawd", email, true)).rejects.toThrow(errors.InvalidInput)
  })

  test('update user invalid email', async () => {
    await PopulateUser()
    await expect(async () => await userModel.updateUser(name, name, bio, "thisEmailIsTooLongSoItWillFail123456789123456789123456789@example.com", true)).rejects.toThrow(errors.InvalidEmail)
  })

  // validation functions
  test('validateInfo all valid', async () => expect(await userModel.validateInfo(name, pass, email, bio)).toBeTruthy())

  test('validateInfo invalid name', async () => await expect(async () => await userModel.validateInfo('invalid name', pass, email, bio)).rejects.toThrow(errors.InvalidUsername))

  test('validateInfo invalid email', async () => await expect(async () => await userModel.validateInfo(name, pass, "not an email", bio)).rejects.toThrow(errors.InvalidEmail))

  test('validateInfo invalid email', async () => await expect(async () => await userModel.validateInfo(name, "insecurePassword", email, bio)).rejects.toThrow(errors.InvalidPassword))

  test('validateInfo invalid email', async () => await expect(async () => await userModel.validateInfo(name, pass, email, "this bio is too long yvyghbyvdyavdwaydvwayudvawudbsadwdawbdgawdvawdiawdvawdiywadvawidvawdiawdvawdiawdawddddddddddddddddwadadsadwdefgrgawd")).rejects.toThrow(errors.InvalidInput))

  test('validatePlaytime valid', async () => expect(await userModel.validatePlaytime(playtime)).toBeTruthy())

  test('validatePlaytime invalid', async () => await expect(async () => await userModel.validatePlaytime("invalid playtime")).rejects.toThrow(errors.InvalidPlaytime))

  test('validateEmail valid', async () => expect(await userModel.validateEmail(email)).toBeTruthy())

  test('validateEmail invalid', async () => await expect(async () => await userModel.validateEmail("invalid email")).rejects.toThrow(errors.InvalidEmail))

  test('validatePassword valid', async () => expect(await userModel.validatePassword(pass)).toBeTruthy())

  test('validatePassword invalid', async () => await expect(async () => await userModel.validatePassword("insecure password")).rejects.toThrow(errors.InvalidPassword))

  test('validateBio valid', async () => expect(await userModel.validateBio(bio)).toBeTruthy())

  test('validateBio invalid', async () => await expect(async () => await userModel.validateBio("this bio is too long yvyghbyvdyavdwaydvwayudvawudbsadwdawbdgawdvawdiawdvawdiywadvawidvawdiawdvawdiawdawddddddddddddddddwadadsadwdefgrgawd")).rejects.toThrow(errors.InvalidInput))

  test('validateName valid - must exist, no emails', async () => {
    await PopulateUser()

    expect(await userModel.validateName(name)).toBeTruthy()
  })

  test('validateName invalid - must exist, no emails', async () => await expect(async () => await userModel.validateName(name)).rejects.toThrow(errors.InvalidUsername))

  test('validateName valid - cannot exist, no emails', async () => {
    expect(await userModel.validateName(name, {DoesntExist: true})).toBeTruthy()
  })

  test('validateName invalid - cannot exist, no emails', async () => {
    await PopulateUser()

    await expect(async () => await userModel.validateName(name, {DoesntExist: true})).rejects.toThrow(errors.DuplicateUsernameError)
  })

  test('validateName invalid format', async () => {
    await expect(async () => await userModel.validateName("invalid name")).rejects.toThrow(errors.InvalidUsername)
    await expect(async () => await userModel.validateName("invalidname@example.com")).rejects.toThrow(errors.InvalidUsername)
    await expect(async () => await userModel.validateName("thisNameIsTooLongSoItWillFail")).rejects.toThrow(errors.InvalidUsername)
  })

  test('validateName valid - must exist, emails', async () => {
    await PopulateUser()

    expect(await userModel.validateName(email, {AllowEmails: true})).toBeTruthy()
  })

  test('validateName invalid - must exist, emails', async () => {
    await expect(async () => await userModel.validateName(email, {AllowEmails: true})).rejects.toThrow(errors.InvalidUsername)
  })

  test('validateName valid - cannot exist, emails', async () => {
    expect(await userModel.validateName(email, {DoesntExist: true, AllowEmails: true})).toBeTruthy()
  })

  test('validateName invalid - cannot exist, emails', async () => {
    await PopulateUser()

    await expect(async () => await userModel.validateName(email, {DoesntExist: true, AllowEmails: true})).rejects.toThrow(errors.DuplicateUsernameError)
  })

  test('validateName invalid email format', async () => {
    await expect(async () => await userModel.validateName("not an email", {DoesntExist: true, AllowEmails: true})).rejects.toThrow(errors.InvalidUsername)
    await expect(async () => await userModel.validateName("thisEmailIsTooLongSoItWillFail123456789123456789123456789@example.com", {DoesntExist: true, AllowEmails: true})).rejects.toThrow(errors.InvalidEmail)
  })

})

describe("session model tests", () => {
  beforeEach(BeforeEachFunction);
  afterEach(AfterEachFunction);

  const name = "my_username";
  const pass = "!E7*Uoui^3D#rrgXxJ4SQnr4Kp@";
  const bio = "My bio";
  const email = "my.email@example.com";
  const admin = false;
  const expiresAt = new Date(2022, 12, 31, 6, 54, 45)
  const table = "Sessions"

  async function PopulateUser() {
    await userModel.addEntry(name, pass, bio, admin, email);
  }

  // UUIDs aren't checked in the model - they have no relevance to the user so will just throw a DatabaseError due to invalid SQL

  // add session
  test('add session valid', async () => {
    await PopulateUser()
    let sessionUUID = uuid.v4()

    await userModel.addSession(sessionUUID, name, expiresAt)
    let testAdd = (await model.getConnection().execute(`SELECT uuid, username, expiresAt from ${table} where uuid = ?`, [sessionUUID]))[0][0];

    expect(testAdd.uuid).toBe(sessionUUID)
    expect(testAdd.username).toBe(name)
  })

  test('add session invalid username', async () => await expect(async () => await userModel.addSession(uuid.v4(), 'not a name', expiresAt)).rejects.toThrow(errors.InvalidUsername))

  // get session
  test('get valid session', async () => {
    await PopulateUser()
    let sessionUUID = uuid.v4()

    await userModel.addSession(sessionUUID, name, expiresAt)
    let testAdd = await userModel.getSession(sessionUUID)

    expect(testAdd.UUID).toBe(sessionUUID)
    expect(testAdd.Username).toBe(name)
  })

  test('get invalid session', async () => {
    let testAdd = await userModel.getSession(uuid.v4())
    expect(testAdd).toBe(null)
  })

  // delete session
  test('delete valid session', async () => {
    await PopulateUser()
    let sessionUUID = uuid.v4()

    await userModel.addSession(sessionUUID, name, expiresAt)
    await userModel.deleteSession(sessionUUID)
    let testAdd = (await model.getConnection().execute(`SELECT uuid, username, expiresAt from ${table} where uuid = ?`, [sessionUUID]))[0]
    expect(testAdd.length).toBe(0)
  })
})

describe("recommendation model tests", () => {
  //this model is very closely tied to user and game and genre models, so we need their utility functions
  //#region util functions
  const username = "my_username";
  const pass = "!E7*Uoui^3D#rrgXxJ4SQnr4Kp@";
  const bio = "My bio";
  const email = "my.email@example.com";
  const admin = false;
  //const table = "Users";
  //const gameTable = "UsersGames";
  //const gameName = "Minecraft";
  //const gameDescription = "Mine & Craft";
  //const playtime = "120";
  //const rating = true;

  async function PopulateUser() {
    await userModel.addEntry(username, pass, bio, admin, email);
  }
  const validGenres = [
    "sandbox",
    "shooter",
    "multiplayer",
    "role playing",
    "simulation",
    "puzzler",
    "survival",
    "platformer"
  ];

  async function fillGenres() {
    for (let i = 0; i < validGenres.length; i++) {
      await genreModel.addGenre(validGenres[i]);
    }
  }
  let gameData = [
    {
      name: "Pokemon",
      description: "Pocket monsters",
      image: null,
      genres: [1, 2, 3]
    },
    {
      name: "Outlast",
      description: "Spooky horror game oo",
      image: null,
      genres: [1, 2, 3]
    },
    {
      name: "The Last of Us",
      description: "Cool Narrative zombie game",
      image: null,
      genres: [1, 2, 3]
    },
    {
      name: "The Witcher 2",
      description: "Hot wolf man goes to kill monsters the second time",
      image: null,
      genres: [1, 2, 3]
    },
    {
      name: "The Witcher",
      description: "Hot wolrf man goes to kill monsters the first time",
      image: null,
      genres: [1, 2, 3]
    },
    {
      name: "The Witcher 3 Wild Hunt",
      description: "Hot wolf man goes to kill monsters the third time",
      image: null,
      genres: [1, 4, 5]
    },
    {
      name: "Undertale",
      description: "Sad rpg where you have choice to not kill",
      image: null,
      genres: [1, 4, 5]
    },
    {
      name: "Uncharted 4 A Thiefs End",
      description: "Thief steal stuff ",
      image: null,
      genres: [1, 4, 5]
    },
    {
      name: "Metal Gear Rising Revengeance",
      description: "Hot cyborg fights america",
      image: null,
      genres: [1, 4, 5]
    },
    {
      name: "Pokemon 2",
      description: "Pocket monsters",
      image: null,
      genres: [4, 5]
    },
    {
      name: "Outlast 2",
      description: "Spooky horror game oo",
      image: null,
      genres: [4, 5]
    },
    {
      name: "The Last of Us 2",
      description: "Cool Narrative zombie game",
      image: null,
      genres: [4, 5]
    },
    {
      name: "The Witcher 2 2",
      description: "Hot wolf",
      image: null,
      genres: [4, 5]
    },
    {
      name: "Undertale 2",
      description: "Sad rpg where you have choice to not kill",
      image: null,
      genres: [4, 5]
    },
    {
      name: "Uncharted 4 A Thiefs End 2",
      description: "Thief steal stuff ",
      image: null,
      genres: [4, 5]
    },
    {
      name: "Metal Gear Rising Revengeance 2",
      description: "Hot cyborg fights america",
      image: null,
      genres: [4, 5]
    }
  ];
  let genreCombos = [[1, 2, 3], [1, 4, 5], [4, 5]];
  async function fillGames() {
    for (let i = 0; i < gameData.length; i++) {
      const element = gameData[i];
      let game = await gameModel.addGame(element.name, element.description);
      element.id = game.id;
    }
  }

  async function fillAll() {
    await PopulateUser();
    await fillGenres();

    //fill games with genres
    for (let i = 0; i < gameData.length; i++) {
      let element = gameData[i];
      let game = await gameModel.addGame(
        element.name,
        element.description,
        null
      );
      gameData[i].id = game.id;
      //await gameModel.addGame(element.name, element.description, null);
      for (let j = 0; j < element.genres.length; j++) {
        await gameModel.addGenreToGame(element.id, element.genres[j]);
      }
    }
  }
  let BeforeEachFunction = async () => {
    await model.initialize(dbName, true);
    await fillAll();
  };
  let AfterEachFunction = async () => {
    if (model.getConnection()) await model.getConnection().end();
  };

  beforeEach(BeforeEachFunction);
  afterEach(AfterEachFunction);
  //#endregion

  test("getting rec failed", async () => {
    await expect(
      reccomendationModel.getPendingSuggestion("username")
    ).rejects.toThrow();
  });
  test("get recc", async () => {
    let gamesOfGenreCombo1 = gameData.filter(game => {
      if ((game.genres = genreCombos[0])) return true;
    });
    //add half of the games to the user
    for (let i = 0; i < gamesOfGenreCombo1.length / 2; i++) {
      await userModel.addGameToUser(username, gamesOfGenreCombo1[i].id, "100", 1);
    }
    await reccomendationModel.generateWeights(username);
    //get pending suggestions, should match with other half of the games!
    let possibleSuggestions = [];
    for (
      let i = gamesOfGenreCombo1.length / 2;
      i < gamesOfGenreCombo1.length;
      i++
    ) {
      possibleSuggestions.push(gamesOfGenreCombo1[i].id);
    }
    for (
      let i = gamesOfGenreCombo1.length / 2;
      i < gamesOfGenreCombo1.length;
      i++
    ) {
      let suggestion = await reccomendationModel.getPendingSuggestion(username);
      expect(possibleSuggestions).toContain(suggestion.gameID);
      reccomendationModel.dismissSuggestion(username, suggestion.gameID);
    }
  });

  test("get to play, add suggestions", async () => {
    let gamesOfGenreCombo1 = gameData.filter(game => {
      if ((game.genres = genreCombos[0])) return true;
    });
    //add half of the games to the user
    for (let i = 0; i < gamesOfGenreCombo1.length / 2; i++) {
      await userModel.addGameToUser(username, gamesOfGenreCombo1[i].id, "100", 1);
    }
    await reccomendationModel.generateWeights(username);
    //get pending suggestions, should match with other half of the games!
    let possibleSuggestions = [];
    for (
      let i = gamesOfGenreCombo1.length / 2;
      i < gamesOfGenreCombo1.length;
      i++
    ) {
      possibleSuggestions.push(gamesOfGenreCombo1[i].id);
    }
    let added = [];
    for (
      let i = gamesOfGenreCombo1.length / 2;
      i < gamesOfGenreCombo1.length;
      i++
    ) {
      let suggestion = await reccomendationModel.getPendingSuggestion(username);
      expect(possibleSuggestions).toContain(suggestion.gameID);
      reccomendationModel.addSuggestion(username, suggestion.gameID);
      added.push(suggestion.gameID);
    }
    let toplay = await reccomendationModel.getAddedSuggestions(username);
    for (let i = 0; i < toplay.length; i++) {
      expect(added).toContain(toplay[i].gameID);
    }
  });

  test("test all possible suggestions", async () => {
    for (let i = 0; i < gameData.length; i++) {
      await reccomendationModel.generateWeights(username);
      let suggest = await reccomendationModel.getPendingSuggestion(username);
      if (suggest != null) {
        await reccomendationModel.addSuggestion(username, suggest.gameID);
      }
    }
    let suggest = await reccomendationModel.getPendingSuggestion(username);
    expect(suggest).toBe(null);
  });
  test("delete suggestion", async () => {
    let suggest;
    for (let i = 0; i < gameData.length; i++) {
      await reccomendationModel.generateWeights(username);
      let preSuggest = await reccomendationModel.getPendingSuggestion(username);
      if (preSuggest != null) {
        await reccomendationModel.addSuggestion(username, preSuggest.gameID);
        suggest = preSuggest;
      }
    }
    let suggest2 = await reccomendationModel.getPendingSuggestion(username);
    expect(suggest2).toBe(null);
    await reccomendationModel.deleteSuggestion(username, suggest.gameID);
    await reccomendationModel.generateWeights(username);
    let suggest3 = await reccomendationModel.getPendingSuggestion(username);
    expect(suggest3.gameID).toBe(suggest.gameID);
  });
  test("clear Pending", async () => {
    let gamesOfGenreCombo1 = gameData.filter(game => {
      if ((game.genres = genreCombos[0])) return true;
    });
    //add first game to the user
    await userModel.addGameToUser(username, gamesOfGenreCombo1[0].id, "100", 1);
    await reccomendationModel.generateWeights(username);
    //generate suggestion
    let suggest = await reccomendationModel.getPendingSuggestion(username);
    //add the suggestion and then clear it
    await userModel.addGameToUser(username, suggest.gameID, "100", 1);
    //clear
    let res = await reccomendationModel.clearPendingSuggestions(username);
    expect(res).toBe(true);
    //get pending suggestion, should NOT equal the previous
    await reccomendationModel.generateWeights(username);
    let suggest2 = await reccomendationModel.getPendingSuggestion(username);
    expect(suggest2.gameID).not.toBe(suggest.gameID);
  });

});