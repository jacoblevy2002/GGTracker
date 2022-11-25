# GGTracker
 
**GGTracker** is a game collection tracking website, designed and created by me, Rea Koehler, and Nathan Batten as a final project for a Web Programming class. The website is set up to run in tandem with a Docker container, where the database for users, games, and more is stored. The Docker container is defined below.

## Dependencies

### Docker Container
Below is the command to generate the Docker container used by the GGTracker website. It's creation is required for the website to run.
docker run -p 10010:3306 --name GGTracker -e MYSQL_ROOT_PASSWORD=pass -d mysql:5.7

### List of npm packages used: (In the case of brackets being present, that is the name needed for npm installing)
All dependencies are included in the package.json, and a single "npm i" command should automatically install them all
- File System (fs)
- Pino and pino-http
- Express
- Handlebars (express-handlebars)
- Express POST Body Parsing (body-parser)
- Express Route Listing (express-list-routes)
- Cookie Parsing (cookie-parser)
- Validator
- MySQL (mysql2/promise)
- BCrypt
- UUID
- Jest
- SuperTest