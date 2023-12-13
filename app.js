const express = require("express");
const logger = require('./logger');
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { Pool } = require("pg");
const { MongoClient } = require('mongodb');


const app = express();

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(
  session({
    secret: "keyboardcat",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
const flash = require("express-flash");
app.use(flash());

// Database connections
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "FST3",
  password: "Olivia2021",
  port: 5432,
});

const dal = require("./services/p.logins.dal");
// const mongodb = require("./services/mongodb");

// Passport local strategy setup
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      const user = await dal.getLoginByEmail(email);
      if (user == null) {
        return done(null, false, { message: "No user with that email." });
      }
      try {
        if (await bcrypt.compare(password, user.password)) {
          return done(null, user);
        } else {
          return done(null, false, { message: "Incorrect password." });
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await dal.getLoginById(id);
  done(null, user);
});

// Routes
app.get("/", (req, res) => {
  res.render("login", { messages: {} });
});

app.get("/index", checkAuthenticated, (req, res) => {
  const userName = req.session.user.name;
  res.render("index", { userName: userName });
});

app.get("/register", (req, res) => {
  res.render("register", { messages: {} });
});

app.get("/login", (req, res) => {
  res.render("login", { messages: {} });
});

app.get("/search", checkAuthenticated, async (req, res) => {
  try {
    const keyword = req.query.keyword;    

    const postgresResults = await searchInPostgres(keyword);
    const mongodbResults = await searchInMongoDB(keyword);

    console.log("PostgreSQL Results:", postgresResults);
    console.log("MongoDB Results:", mongodbResults);   


    res.render("search", {
      keyword: keyword,
      postgresResults: postgresResults,
      mongodbResults: mongodbResults,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query("SELECT id, name, email, password FROM logins WHERE email = $1", [
      email,
    ]);

    if (user.rows.length > 0) {
      const hashedPassword = user.rows[0].password;
      const passwordMatch = await bcrypt.compare(password, hashedPassword);

      if (passwordMatch) {
        req.session.user = {
          id: user.rows[0].id,
          name: user.rows[0].name,
          email: user.rows[0].email,
        };

        req.flash("success", "Login successful")
        res.redirect("/index");
      } else {
        // Incorrect password
        res.render("login", { messages: { error: "Incorrect password" } });
      }
    } else {
      // No user found
      res.render("login", { messages: { error: "No user with that email" } });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});


app.post("/register", async (req, res) => {
  console.log("Inside /register POST route");
  try {
    const { name, email, password } = req.body;

    const existingUser = await pool.query(
      "SELECT * FROM logins WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      req.flash("error", "User already exists");
      return res.redirect("/register");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO logins (name, email, password) VALUES ($1, $2, $3)",
      [name, email, hashedPassword]
    );

    req.flash("success", "Registration successful");
    console.log("Redirecting to login page");
    res.redirect("/login"); // Redirect to the login page after successful registration
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

app.post("/search", checkAuthenticated, async (req, res) => {
  const keyword = req.body.keyword;
  const selectedDatabase = req.body.database;
  const userId = req.session.id;
  const userName = req.session.name;

  console.log('Search keyword:', keyword);
  logger.logSearchAction(keyword, userId, userName);

  let postgresResults = [];
  let mongodbResults = [];

  // Check if the keyword is "all" to retrieve all books
  if (keyword.toLowerCase() === 'all') {
    // Retrieve all books without applying the keyword filter
    postgresResults = await searchInPostgres('');
    const mongodbCollection = await connectToMongoDB();
    mongodbResults = await searchInMongoDB(mongodbCollection, '');
  } else {
    // Search in PostgreSQL
    if (selectedDatabase === "postgres" || selectedDatabase === "both") {
      postgresResults = await searchInPostgres(keyword);
    }

    // Search in MongoDB
    if (selectedDatabase === "mongodb" || selectedDatabase === "both") {
      const mongodbCollection = await connectToMongoDB();
      mongodbResults = await searchInMongoDB(mongodbCollection, keyword);
    }
  }

    res.render("search", {
    postgresResults: postgresResults,
    mongodbResults: mongodbResults,
    keyword: keyword,
  });
});



// Route for displaying book details
app.get('/books/:id', async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const bookDetails = await getBookbyId(bookId);

    if (bookDetails) {
      res.render('bookDetails', { book: bookDetails });
    } else {
      res.status(404).send('Book not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



async function searchInPostgres(keyword) {
  const query = "SELECT * FROM books WHERE LOWER(title) LIKE LOWER($1)";
  const result = await pool.query(query, [`%${keyword}%`]);
  return result.rows;
}

async function searchInMongoDB(keyword) {
  try {
    console.log('Keyword:', keyword);

    const result = await mongodbCollection.find({ title: { $regex: new RegExp(keyword, "i") } }).toArray();
    return result;
  } catch (error) {
    console.error('Error searching in MongoDB:', error);
    return [];
  }
}

function checkAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/");
}

let mongodbCollection;

async function connectToMongoDB() {
  const client = new MongoClient('mongodb://localhost:27017', {
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('FST3');
    mongodbCollection = db.collection('BOOKS'); 
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

async function searchInMongoDB(collection, keyword) {
  try {
    const result = await mongodbCollection.find({title: {$regex: new RegExp(keyword, "i") } }).toArray();
    return result;
  } catch (error) {
    console.error('Error searching in MongoDB:', error);
    return[];
  }
}

connectToMongoDB().catch(console.error);

// Function to get book details from PostgreSQL
async function getBookDetailsFromPostgres(bookId) {
  const query = "SELECT * FROM books WHERE id = $1";
  const result = await pool.query(query, [bookId]);

  if (result.rows.length > 0) {
    return result.rows[0];
  } else {
    return null;
  }
}

// Function to get book details from MongoDB
async function getBookDetailsFromMongoDB(bookId) {
  try {
    const result = await mongodbCollection.findOne({ _id: bookId });

    if (result) {
      return result;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting book details from MongoDB:', error);
    return null;
  }
}

async function getBookDetails(bookId) {
  // Implement the logic to retrieve book details from your database
  // For PostgreSQL
  const query = 'SELECT * FROM books WHERE id = $1';
  const result = await pool.query(query, [bookId]);

  // For MongoDB
  // const result = await mongodbCollection.findOne({ _id: new ObjectId(bookId) });

  // Check if a book was found
  if (result.rows.length > 0) {
    return result.rows[0];
  } else {
    return null; // Return null if no book is found
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Connected to PostgreSQL');
});
