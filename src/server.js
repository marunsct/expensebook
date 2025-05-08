const express = require('express');
const { connectToDatabase } = require('./db');
const{seedLargeDataset} = require('./db/seedLargeDataset');
const userRoutes = require('./routes');
const i18n = require('./i18n/i18n');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());
app.use(i18n.init);
app.use((req, res, next) => {
    const lang = req.headers['accept-language'] || 'en';
    i18n.setLocale(req, lang);
    next();
});
connectToDatabase();
//seedLargeDataset()
//    .then(() => console.log('Seeding completed.'))
//    .catch((error) => console.error('Seeding failed:', error));// Seed the database with initial data

app.use('/', userRoutes);

// Middleware to handle errors
app.get('/1', (req, res) => {
    res.send('Hello from the mobile backend service!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});