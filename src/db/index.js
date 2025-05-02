const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('Connecting to the database...', process.env.DATABASE_URL);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Explicitly allow self-signed certificates
    },
});

const connectToDatabase = async () => {
    try {
        await pool.connect();
        console.log('Database connected.');

        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('Schema applied.');
    } catch (error) {
        console.error('Error connecting to the database:', error);
        process.exit(1);
    }
};

module.exports = {
    pool,
    connectToDatabase,
};

