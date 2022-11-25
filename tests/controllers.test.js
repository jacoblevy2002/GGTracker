const dbName = "controller_test_db";
const model = require("../models/globalModel.js");
const userModel = require('../models/userModel')
const app = require("../app");
const supertest = require('supertest');
const { addGenre } = require("../models/genreModel.js");
const { addGame } = require("../models/gameModel.js");

var testRequest

const name = 'my_username'
const adminName = 'my_admin_username'
const pass = '!E7*Uoui^3D#rrgXxJ4SQnr4Kp@'
const bio = 'My bio'
const email = "my.email@example.com"
const adminEmail = "my.admin.email@example.com"
let PopulateUser = async () => await userModel.addEntry(name, pass, bio, false, email)
let PopulateAdmin = async () => await userModel.addEntry(adminName, pass, bio, true, adminEmail)

let BeforeEachFunction = async () => {
  await model.initialize(dbName, true)
  testRequest = supertest.agent(app)
}
let AfterEachFunction = async () => { if (model.getConnection()) await model.getConnection().end() }

describe('home tests', () => {
  beforeEach(BeforeEachFunction)
  afterEach(AfterEachFunction)

  test("GET / success case", async () => {

    let testResponse = await testRequest.get('/');
    expect(testResponse.status).toBe(200)
  })

  test("GET /home success case", async () => {
    let testResponse = await testRequest.get('/home');
    expect(testResponse.status).toBe(200)
  })

})

describe('game tests', () => {
  beforeEach(BeforeEachFunction)
  afterEach(AfterEachFunction)
  
  //success data
  const game = "skyrim";
  const description = "skyrim description";
  const genre = "Open World"
  let gameInfo;

  
   test("POST /games/add game success case", async () => {
     await PopulateAdmin()
     await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
     let testResponse = await testRequest.post('/games/add').send({
       name: game,
       description: description
     })  
     expect(testResponse.status).toBe(200)
   })

   test("POST /games/add game fail case", async () => {
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    let testResponse = await testRequest.post('/games/add').send({
      name: 234,
      description: 234
    })  
    expect(testResponse.status).toBe(500)
  })

  test("GET /games success case", async () => {
    gameInfo = await addGame(game, description)
    let testResponse = await testRequest.get(`/games?id=${gameInfo.id}`);
    expect(testResponse.status).toBe(200);
  })

  test("GET /games/id success case", async () => {
    gameInfo = await addGame(game, description)
    let testResponse = await testRequest.get(`/games/id?id=${gameInfo.id}`);
    expect(testResponse.status).toBe(200);
  })

  test("GET /games/id fail case", async () => {
    let testResponse = await testRequest.get(`/games/id?id=2`);
    expect(testResponse.status).toBe(500);
  })

  test("GET /games/genres success case", async () => {
    genreInfo = await addGenre(genre)
    let testResponse = await testRequest.get(`/games/genres?id=${genreInfo.id}`);
    expect(testResponse.status).toBe(200);
  })

  test("GET /games/genres fail case", async () => {
    let testResponse = await testRequest.get(`/games/genres?id=@`);
    expect(testResponse.status).toBe(400);
  })

  test("GET /games/name success case", async () => {
    gameInfo = await addGame(game, description)
    let testResponse = await testRequest.get(`/games/name?name=${gameInfo.name}`);
    expect(testResponse.status).toBe(200);
  })

  test("GET /games/name fail case", async () => {
    let testResponse = await testRequest.get(`/games/name`);
    expect(testResponse.status).toBe(400);
  })

})

describe('genre tests', () => {
  beforeEach(BeforeEachFunction)
  afterEach(AfterEachFunction)
  
  //success data
  const genre = "multiplayer";
  let genreInfo;

  //fail info
  const InvalidGenre = "@ Genre 123";

  test("POST /genres success case", async () => {
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    let testResponse = await testRequest.post('/genres').send({
      name: genre
    })  
    expect(testResponse.status).toBe(200);
  })

  test("POST /genres fail case", async () => {
    let testResponse = await testRequest.post('/genres').send({ /*nothing(null)*/ })  
    expect(testResponse.status).toBe(400);
  })

  test("GET /genres/name success case", async () => {
    let testResponse = await testRequest.get('/genres');
    expect(testResponse.status).toBe(200);
  })

  test("POST /genres/delete success case", async () => {
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    genreInfo = await addGenre(genre)
    let testResponse = await testRequest.post('/genres/delete').send({
      id: genreInfo.id
    })  
    expect(testResponse.status).toBe(200);
  })

  test("POST /genres/delete fail case", async () => {
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    let testResponse = await testRequest.post('/genres/delete').send({
      id: InvalidGenre
    })  
    expect(testResponse.status).toBe(400);
  })

  test("POST /genres/edit success case", async () => {
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    genreInfo = await addGenre(genre)
    let testResponse = await testRequest.post('/genres/edit').send({
      name: genreInfo.name,
      id: genreInfo.id
    })  
    expect(testResponse.status).toBe(200);
  })

  test("POST /genres/edit fail case", async () => {
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    let testResponse = await testRequest.post('/genres/edit').send({
      name: InvalidGenre,
      id: InvalidGenre
    })  
    expect(testResponse.status).toBe(400);
  })

})

 describe('user tests', () => {
  beforeEach(BeforeEachFunction)
  afterEach(AfterEachFunction)
  const gameName = "Minecraft";
  const gameDescription = "Mine & Craft";

  let PopulatePrivateUser = async () => await userModel.addEntry(name, pass, bio, false, email, false)
  let PopulateGame = async () => await addGame(gameName, gameDescription)

  // login page
  test("create valid user", async () => {
    await testRequest.post('/signup').send({
      name: name,
      password: pass,
      email: email,
      bio: bio
    }).expect(200)
  })

  // after login user gets redirected, therefore status of 302
  test("login to valid user with username", async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)  // expects 302 because logging in will redirect to home page
  })

  
  test("login to valid user with email", async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
  })

  test('login with invalid password', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: "notThePass" }).expect(400)
  })

  test('login to non-existent account', async () => await testRequest.post('/signup').send({ loginName: email, loginPassword: pass }).expect(400) )

  test('access signup/login page while logged in', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.get('/signup').send().expect(302)
  })

  test('access signup page with invalid login info', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass + "123" }).expect(400)
  })

  test('get users while not on admin account', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.get('/users').send().expect(403)
  })

  test('get users while on admin account', async () => {
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    await testRequest.get('/users').send().expect(200)
  })

  test('get users while not logged in', async () => await testRequest.get('/users').send().expect(401))

  test('view public user page', async () => {
    await PopulateUser()
    await testRequest.get('/user?name=' + name).send().expect(200)
  })

  test('view private user page', async () => {
    await PopulatePrivateUser()
    await testRequest.get('/user?name=' + name).send().expect(403)
  })

  test('view private user page as that user', async () => {
    await PopulatePrivateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.get('/user?name=' + name).send().expect(200)
  })

  test('view private user page as admin', async () => {
    await PopulatePrivateUser()
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    await testRequest.get('/user?name=' + name).send().expect(200)
  })

  test('view own profile', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.get('/user').send().expect(200)
  })

  test('edit own profile', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/user/edit').send({
      oldName: name,
      name: 'newName',
      bio: 'new Bio',
      email: email,
      public: true
    }).expect(302)
  })

  test('edit other profile', async () => {
    await PopulateAdmin()
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/user/edit').send({
      oldName: adminName,
      name: 'newName',
      bio: 'new Bio',
      email: email,
      public: true
    }).expect(403)
  })

  test('edit profile while logged out', async () => {
    await PopulateUser()
    await testRequest.post('/user/edit').send({
      oldName: name,
      name: 'newName',
      bio: 'new Bio',
      email: email,
      public: true
    }).expect(401)
  })

  test('delete user while not logged in', async () => await testRequest.post('/users/delete').send({ name: name }).expect(401) )

  test('delete user while not on admin account', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/users/delete').send({ name: name }).expect(403)
  })

  test('delete user while on admin account', async () => {
    await PopulateAdmin()
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    await testRequest.post('/users/delete').send({ name: name }).expect(200)
  })

  test('delete self when not logged in', async () => await testRequest.post('/user/delete').send({ confirmDelete: true }).expect(401) )

  test('delete self on GET request (isnt allowed)', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.get('/user/delete?confirmDelete=true').send().expect(400)
  })

  test('delete self on POST request without required param', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/user/delete').send().expect(400)
  })

  test('delete self', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/user/delete').send({ confirmDelete: true }).expect(302)
  })

  test('logout while not logged in', async () => await testRequest.get('/logout').send().expect(302) )  // logging out while not signed in should just redirect to home

  test('logout', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/logout').send().expect(302)
  })

  test('add game to collection while not logged in', async () => await testRequest.post('/users/games').send({ addGameID: 1, hours: 12, liked: false }).expect(401))

  test('add game to collection while logged in', async () => {
    await PopulateUser()
    await PopulateGame()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/users/games').send({ addGameID: 1, hours: 12, liked: false }).expect(200)
  })

  test('view public user collection', async () => {
    await PopulateUser()
    await testRequest.get('/users/games?name=' + name).send().expect(200)
  })

  test('view private user collection', async () => {
    await PopulatePrivateUser()
    await testRequest.get('/users/games?name=' + name).send().expect(403)
  })

  test('view private user collection as that user', async () => {
    await PopulatePrivateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.get('/users/games?name=' + name).send().expect(200)
  })

  test('view private user collection as admin', async () => {
    await PopulatePrivateUser()
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    await testRequest.get('/users/games?name=' + name).send().expect(200)
  })

  test('view own collection', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.get('/users/games').send().expect(200)
  })

  test('remove game from collection while not logged in', async () => await testRequest.post('/users/games/remove').send({ removeGameID: 1 }).expect(401))

  test('remove game from collection while logged in', async () => {
    await PopulateUser()
    await PopulateGame()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/users/games/remove').send({ Username: name, removeGameID: 1 }).expect(200)
  })

  test('update game in collection while not logged in', async () => await testRequest.post('/users/games/edit').send({ game: 1, hours: 10, liked: true }).expect(401))

  test('update game in collection while logged in', async () => {
    await PopulateUser()
    await PopulateGame()
    await userModel.addGameToUser(name, 1, 9, false)
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/users/games/edit').send({ game: 1, hours: 10, liked: true }).expect(200)
  })

  test('promote user while not logged in', async () => await testRequest.post('/users/promote').send({ name: name }).expect(401))

  test('promote user as non admin', async () => {
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/users/promote').send({ name: name }).expect(403)
  })

  test('promote user as admin', async () => {
    await PopulateAdmin()
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    await testRequest.post('/users/promote').send({ name: name }).expect(200)
  })

  test('promote admin', async () => {
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    await testRequest.post('/users/promote').send({ name: adminName }).expect(400)
  })

  test('demote admin while not logged in', async () => await testRequest.post('/users/demote').send({ name: adminName }).expect(401))

  test('demote admin as non admin', async () => {
    await PopulateUser()
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: name, loginPassword: pass }).expect(302)
    await testRequest.post('/users/demote').send({ name: adminName }).expect(403)
  })

  test('demote admin as admin', async () => {
    await PopulateAdmin()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    await testRequest.post('/users/demote').send({ name: adminName }).expect(200)
  })

  test('demote user', async () => {
    await PopulateAdmin()
    await PopulateUser()
    await testRequest.post('/signup').send({ loginName: adminName, loginPassword: pass }).expect(302)
    await testRequest.post('/users/demote').send({ name: name }).expect(400)
  })
})
