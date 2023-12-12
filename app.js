// app.js
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const app = express();
const { MongoClient } = require('mongodb');
const mongoUri = 'mongodb://localhost:27017';
let mongodbCollection;


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'FST3',
  password: 'Olivia2021',
  port: 5432, // Default PostgreSQL port
});

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// app.js
app.post('/search', async (req, res) => {
    const keyword = req.body.keyword;
    const selectedDatabase = req.body.database;
  
    let postgresResults = [];
    let mongodbResults = [];
  
    // Search in PostgreSQL
    if (selectedDatabase === 'postgres' || selectedDatabase === 'both') {
      postgresResults = await searchInPostgres(keyword);
    }
  
    // Search in MongoDB
    if (selectedDatabase === 'mongodb' || selectedDatabase === 'both') {
      mongodbResults = await searchInMongoDB(keyword);
    }
  
    res.render('search', {
      postgresResults: postgresResults,
      mongodbResults: mongodbResults,
      keyword: keyword,
    });
  });
  
  async function searchInPostgres(keyword) {
    const query = 'SELECT * FROM books WHERE LOWER(title) LIKE LOWER($1)';
    const result = await pool.query(query, [`%${keyword}%`]);
    return result.rows;
  }
  
  async function searchInMongoDB(keyword) {
    // Implement MongoDB query logic here
    // Example: Assuming you have a 'books' collection in MongoDB
    const mongodbResults = await mongodbCollection.find({ title: { $regex: new RegExp(keyword, 'i') } }).toArray();
    return mongodbResults;
  }

  async function connectToMongoDB() {
    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  
    try {
      await client.connect();
      console.log('Connected to MongoDB');
  
      const database = client.db('FST3');
      mongodbCollection = database.collection('BOOKS'); // Replace 'books' with your actual collection name
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }
  connectToMongoDB().catch(console.error);
  

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
