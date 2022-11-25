const mysql = require('mysql2/promise')
const pino = require("pino");
const logger = pino(pino.destination("logs/models/global-log.log"));
const errors = require("../errorContainer.js")

// lists tables + info needed for creation command. wasnt sure the best way to do this but decided with this over having 5 handwritten creation commands - looks nicer imo
// "ON UPDATE CASCADE" means that if the PK changes, the FK will change as well. Should only come into effect for username changes, but better safe than sorry
const tables = [
    {
        name: "Games",
        details: [
            "name varchar(100) not null",
            "id int AUTO_INCREMENT",
            "description varchar(32766)",
            "image varchar(30)",
            "PRIMARY KEY (id)"
        ]
    }, {
        name: "Users",
        details: [
            "username varchar(20)",
            "password char(60) not null",    // will be hashed
            "bio varchar(100)",
            "admin boolean not null",
            "joinDate date not null",
            "email varchar(50) not null unique",    // unique - only 1 of each entry, but not a PK
            "public boolean not null",
            "PRIMARY KEY (username)"
        ]
    }, {
        name: "Genres",
        details: [
            "id int AUTO_INCREMENT",
            "name varchar(30) not null",
            "PRIMARY KEY (id)"
        ]
    }, {
        name: "UsersGames",
        details: [
            "user varchar(20) not null",
            "gameID int not null",
            "playtime int",
            "rating boolean",   // ie true represents positive and false represents negative
            "FOREIGN KEY (user) REFERENCES Users(username) ON UPDATE CASCADE",
            "FOREIGN KEY (gameID) REFERENCES Games(id) ON UPDATE CASCADE",
            "PRIMARY KEY (user, gameID)"
        ]
    }, {
        name: "GamesGenres",
        details: [
            "gameID int not null",
            "genreID int not null",
            "FOREIGN KEY (gameID) REFERENCES Games(id) ON UPDATE CASCADE",
            "FOREIGN KEY (genreID) REFERENCES Genres(id) ON UPDATE CASCADE"
        ]
    }, {
        name: "Sessions",
        details: [
            "uuid char(36) not null",
            "username varchar(20) not null",
            "expiresAt datetime not null",
            "PRIMARY KEY (uuid)",
            "FOREIGN KEY (username) REFERENCES Users(username) ON UPDATE CASCADE"
        ]
    }, {
        name: "UserGenreWeights",
        details: [
            "user varchar(20) not null",
            "genreID int not null",
            "weight float not null",
            "FOREIGN KEY (user) REFERENCES Users(username) ON UPDATE CASCADE",
            "FOREIGN KEY (genreID) REFERENCES Genres(id) ON UPDATE CASCADE",
            "PRIMARY KEY (user, genreID)"
        ]
    }, {
        name: "Suggestions", 
        details: [
            "user varchar(20) not null",
            "gameID int not null",
            "score float not null",
            "status ENUM('pending', 'added', 'dismissed') not null",
            "FOREIGN KEY (user) REFERENCES Users(username) ON UPDATE CASCADE",
            "FOREIGN KEY (gameID) REFERENCES Games(id) ON UPDATE CASCADE",
            "PRIMARY KEY (user, gameID)"
        ]
    }
]



var conn
var db

async function initialize(dbName = "GGTracker_db", reset) {
    db = dbName
    conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'pass',
        port: '10010',
        waitForConnections: true, 
        connectionLimit: 10,
        queueLimit: 0
    })
    
    if (reset) await conn.query("drop database if exists " + db)
    await conn.query("create database if not exists " + db)
    await conn.query("use " + db)

    // create tables
    tables.forEach(async x =>
        await conn.execute("create table if not exists " + x.name + " (" + x.details.join(", ") + ")")
            .then(logger.info("Table " + x.name + " created/exists"))
            .catch((error) => {
                if (error) {
                    logger.error(error)
                    throw new errors.DatabaseError()
                }
            })
    )
}

let getConnection = () => conn

module.exports = {
    initialize,
    getConnection
}