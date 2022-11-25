const express = require('express');
const router = express.Router();
const routeRoot = '/';
//generic 404 controller.
function notfound(req, res) {
    res.status(404);
    res.render('genericError', {error:true, errorText:"Page not found"});

    
}
router.all("*", notfound);

module.exports = {
    router,
    routeRoot,
}
