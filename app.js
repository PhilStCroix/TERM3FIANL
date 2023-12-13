const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { Pool } = require("pg");

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
  database: "Login",
  password: "Keyin2021",
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
  res.render("index");
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

    res.render("search", {
      keyword: keyword,
      postgresResults: postgresResults,
      // mongodbResults: mongodbResults,
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
    const user = await pool.query("SELECT * FROM logins WHERE email = $1", [
      email,
    ]);

    if (user.rows.length > 0) {
      const hashedPassword = user.rows[0].password;
      const passwordMatch = await bcrypt.compare(password, hashedPassword);

      if (passwordMatch) {
        req.session.user = user.rows[0];
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

  let postgresResults = [];
  // let mongodbResults = [];

  // Search in PostgreSQL
  if (selectedDatabase === "postgres" || selectedDatabase === "both") {
    postgresResults = await searchInPostgres(keyword);
  }

  // Search in MongoDB
  if (selectedDatabase === "mongodb" || selectedDatabase === "both") {
    mongodbResults = await searchInMongoDB(keyword);
  }

  res.render("search", {
    postgresResults: postgresResults,
    // mongodbResults: mongodbResults,
    keyword: keyword,
  });
});

async function searchInPostgres(keyword) {
  const query = "SELECT * FROM books WHERE LOWER(title) LIKE LOWER($1)";
  const result = await pool.query(query, [`%${keyword}%`]);
  return result.rows;
}

// async function searchInMongoDB(keyword) {
//   // Assuming you have a 'books' collection in MongoDB
//   const mongodbResults = await mongodbCollection
//     .find({ title: { $regex: new RegExp(keyword, "i") } })
//     .toArray();
//   return mongodbResults;
// }

function checkAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/");
}

// Connect to MongoDB
// mongodb.connectToMongoDB().catch(console.error);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
