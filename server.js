'use strict'

const app = require("./app.js");
const model = require("./models/globalModel");
const fs = require("fs");
var port = process.env.PORT || 8080;
let dbName = process.argv[2];
if(!dbName) dbName = "gametracker_db";



model.initialize(dbName, false).then(app.listen(port))