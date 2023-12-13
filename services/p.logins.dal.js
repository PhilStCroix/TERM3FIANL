const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "FST3",
  password: "Olivia2021",
  port: 5432,
});

async function getLogins() {
  let SQL = `SELECT id AS _id, name, email, password FROM logins`;
  try {
    let results = await pool.query(SQL, []);
    return results.rows;
  } catch (error) {
    console.log(error);
  }
}

async function getLoginByEmail(email) {
  try {
    const query = "SELECT * FROM logins WHERE email = $1";
    const { rows } = await pool.query(query, [email]);
    return rows[0];
  } catch (error) {
    console.error("Error retrieving user by email:", error);
    throw error;
  }
}

async function getLoginById(id) {
  let SQL = `SELECT id AS _id, name, email, password FROM logins WHERE id = $1`;
  try {
    let results = await pool.query(SQL, [id]);
    return results.rows[0];
  } catch (error) {
    console.log(error);
  }
}

async function addLogin(name, email, password) {
  let SQL = `INSERT INTO logins (name, email, password)
    VALUES ($1, $2, $3) RETURNING *;`;
  try {
    let results = await pool.query(SQL, [name, email, password]);
    return results.rows[0];
  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  getLogins,
  addLogin,
  getLoginByEmail,
  getLoginById,
};
