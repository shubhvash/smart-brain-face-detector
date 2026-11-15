const mongoose = require("mongoose");

// Builds the MongoDB connection string.
// Priority:
//   1. MONGODB_URI (full connection string, e.g. mongodb://127.0.0.1:27017/smart-brain)
//   2. DB_HOST / DB_USER / DB_PASS / DB_NAME (MongoDB Atlas, mongodb+srv)
//   3. Local default: mongodb://127.0.0.1:27017/smart-brain
const buildMongoUri = (dbConfig) => {
    const { uri, host, username, password, database } = dbConfig;

    if (uri) {
        return uri;
    }

    if (host) {
        let absoluteHostName = host;
        if (username) {
            const user = encodeURIComponent(username);
            absoluteHostName = password !== undefined
                ? `${user}:${encodeURIComponent(password)}@${absoluteHostName}`
                : `${user}@${absoluteHostName}`;
        }
        return `mongodb+srv://${absoluteHostName}/${database}?retryWrites=true&w=majority`;
    }

    return `mongodb://127.0.0.1:27017/${database || 'smart-brain'}`;
};

const connect = (dbConfig) => {
    const mongoUri = buildMongoUri(dbConfig);

    return mongoose
        .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
        .catch(err => {
            console.error(`Error connecting to MongoDB: ${err.message}`);
            throw err;
        });
};

const getClient = () => {
    return mongoose.connection.getClient();
}

module.exports = {
    connect,
    getClient
};
