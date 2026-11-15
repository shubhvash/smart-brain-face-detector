//Configure .env (load before anything reads process.env)
require('dotenv').config();

const express = require('express');
const path = require('path');
var genuuid = require('uuid').v4;
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// Render (and most PaaS) terminate TLS at a proxy in front of the app
app.set('trust proxy', 1);

const api = require('./server/api');
const db = require('./server/db');

//Set port as process.env.PORT if it is present otherwise set it to 4000
const port = process.env.PORT || 4000;

//Initiate connection with database
db.connect({
    uri: process.env.MONGODB_URI,
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
}).then(() => {
    //Handle /api with the api middleware
    app.use('/api', session({
        genid() {
            return genuuid() // use UUIDs for session IDs
        },
        store: MongoStore.create({ client: db.getClient() }),
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: false
    }), api);

    //Handle non-api routes with static build folder
    app.use(express.static(path.join(__dirname, 'build')));

    //Return index.html for routes not handled by build folder
    app.get('*', function (req, res) {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });

    //Start listening on port
    app.listen(port, () => {
        console.log(`Server listening at port: ${port}`);
    });
}).catch(() => {
    console.error('Startup aborted: could not connect to MongoDB. Check MONGODB_URI and the database network access list.');
    process.exit(1);
});
