const express = require("express");
const router = express.Router();
const routeRoot = "/";
const userController = require("./userController");
const reccomendationModel = require("../models/reccomendationModel");

async function handleHomeError(err, response) {
  //do a better job later!
  let options = {
    active: {
      home: true
    },
    error: true,
    errorText: err.message
  };
  response.render("home.hbs", options);
}

async function showHome(request, response) {
    try {
        await userController.refreshSession(request, response)
        let options =  {active: {home: true}}
        if(response.locals.partials.userContext.loggedIn) {
            //
            // get the recommendations for the user
            reccomendationModel.generateWeights(response.locals.partials.userContext.user.Username);
            let toPlay = await reccomendationModel.getAddedSuggestions(response.locals.partials.userContext.user.Username);
            let toShow = await reccomendationModel.getPendingSuggestion(response.locals.partials.userContext.user.Username);
    
            options.toPlayList = toPlay;
            options.rec = toShow;
            if(toShow != null){
                options.hasRec = true;
            }
            options.loggedIn = true;
        } else {
            options.loggedIn = false;
        }
        
        response.render('home.hbs',options);
        } catch (err) {
            handleHomeError(err, response)
        }
}

router.get("/", showHome);
router.get("/home", showHome);
router.post("/theme", checkTheme);

function checkTheme(request, response) {
  if (request.body.theme) {
    const theme = request.body.theme;
    let res = theme == "true" ? true : false;
    response.cookie("LightTheme", res);
  }
  response.redirect("/");
}

async function addReccomenation(request, response) {
  try {
    await userController.refreshSession(request, response);
    if (response.locals.partials.userContext.loggedIn) {
      let gameId = request.body.gameID;
      await reccomendationModel.addSuggestion(
        response.locals.partials.userContext.user.Username,
        gameId
      );
      response.redirect("/home");
    } else {
      let options = {
        active: {
          home: true
        },
        errorText: "You must be logged in to add a recommendation",
        error: true
      };
    }
  } catch (err) {
    await handleHomeError(err, response);
  }
}
router.post("/reccomendations/add", addReccomenation);

async function dismissReccomendation(request, response) {
  try {
    await userController.refreshSession(request, response);
    if (response.locals.partials.userContext.loggedIn) {
      let gameId = request.body.gameID;
      await reccomendationModel.dismissSuggestion(
        response.locals.partials.userContext.user.Username,
        gameId
      );
      response.redirect("/home");
    } else {
      let options = {
        active: {
          home: true
        },
        errorText: "You must be logged in to add a recommendation",
        error: true
      };
    }
  } catch (err) {
    await handleHomeError(err, response);
  }
}
router.post("/reccomendations/dismiss", dismissReccomendation);

async function deleteReccomednation(request, response) {
  try {
    await userController.refreshSession(request, response);
    if (response.locals.partials.userContext.loggedIn) {
      let gameId = request.body.gameID;
      await reccomendationModel.deleteSuggestion(
        response.locals.partials.userContext.user.Username,
        gameId
      );
      response.redirect("/home");
    } else {
      let options = {
        active: {
          home: true
        },
        errorText: "You must be logged in to delete a recommendation",
        error: true
      };
    }
  } catch (err) {
    await handleHomeError(err, response);
  }
}
router.post("/reccomendations/delete", deleteReccomednation);


async function aboutUs(request, response) {
    response.render("aboutus.hbs", response);
}
router.get("/about", aboutUs);
//simple page to give an empty home screen, useful for testing header and footer.
module.exports = {
  showHome,
  router,
  routeRoot
};
