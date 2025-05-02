const express = require('express');
const { Client } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect();

app.get('/', (req, res) => {
    res.send('Hello from Node.js and PostgreSQL!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
