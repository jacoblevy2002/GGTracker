
async function changeToLightModeCSS(request, res, next)  {
    let lightMode = false;
    if(request.cookies){ 
        if(request.cookies.LightTheme) {
            lightMode = request.cookies.LightTheme == "true" ? true : false;
        }
    }
    res.locals.partials.lightTheme = lightMode;
    next();
}

module.exports = changeToLightModeCSS;