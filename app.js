const express = require('express');
const Handlebars = require("handlebars");
const app = express();
app.use(express.json())
const {engine} = require('express-handlebars');
const bodyParser = require('body-parser')
const expressListRoutes = require('express-list-routes');
const cookieParser = require('cookie-parser')
const headerMiddleware = require('./middleware/headerAuthMiddleware')
const lightMiddleware = require('./middleware/lightModeMiddleware')

//Tell the app to use handlebars
app.engine('hbs', engine({extname:'.hbs'}));
app.set('view engine', 'hbs');
app.set('views', './views');
//add form support
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended:true
}))
app.use(express.static('public'))
app.use(cookieParser())
//Auth helper.

app.use(headerMiddleware);
app.use(lightMiddleware);

//a nice helper function
Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});


//a nice helper function
Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});


const controllers = ['homeController', 'gameController', 'genreController', 'userController', 'errorController'];

controllers.forEach((controllerName) => {

    try {
        const controllerRoutes = require('./controllers/' + controllerName);
        //console.log(controllerRoutes.routeRoot)
        app.use(controllerRoutes.routeRoot, controllerRoutes.router);
    } catch (err) {
        //fail gracefully if no routes for this controller
        console.error(err);
    }
});
expressListRoutes(app, { prefix: '/' });
module.exports = app;