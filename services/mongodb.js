const { MongoClient } = require("mongodb");

const mongoUri = "mongodb://localhost:27017";
let mongodbCollection;

async function connectToMongoDB() {
  const client = new MongoClient(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const database = client.db("FST3");
    mongodbCollection = database.collection("BOOKS"); // Replace 'books' with your actual collection name
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

module.exports = {
  connectToMongoDB,
  mongodbCollection, // You can export this if you need it for external usage
};
