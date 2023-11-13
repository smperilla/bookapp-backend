const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const mongoDBUri = process.env.DATABASE_URL;
const app = express();

app.use(cors());
app.use(express.json()); // For parsing application/json

mongoose
  .connect(mongoDBUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

// Define a schema for Favorites
const favoriteSchema = new mongoose.Schema({
  bookId: String,
  title: String,
  authors: [String],
  thumbnail: String,
});

const Favorite = mongoose.model("Favorite", favoriteSchema);

// Add a book to favorites
app.post("/api/favorites", async (req, res) => {
  const newFavorite = new Favorite({
    bookId: req.body.bookId,
    title: req.body.title,
    authors: req.body.authors,
    thumbnail: req.body.thumbnail,
  });

  try {
    const savedFavorite = await newFavorite.save();
    res.send(savedFavorite);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Retrieve all favorite books
app.get("/api/favorites", async (req, res) => {
  try {
    const favorites = await Favorite.find();
    res.send(favorites);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Delete a book from favorites
app.delete("/api/favorites/:bookId", async (req, res) => {
  try {
    const removedFavorite = await Favorite.findOneAndDelete({
      bookId: req.params.bookId,
    });
    if (!removedFavorite) {
      return res.status(404).send("Book not found.");
    }
    res.send(removedFavorite);
  } catch (err) {
    res.status(500).send(err);
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
