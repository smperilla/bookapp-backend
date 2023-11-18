const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); 
require("dotenv").config();

const mongoDBUri = process.env.DATABASE_URL;
const secretKey = process.env.SECRET_KEY;

const app = express();

app.use(cors());
app.use(express.json()); 

mongoose
  .connect(mongoDBUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));


const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  bookId: String,
  title: String,
  authors: [String],
  thumbnail: String,
});

const Favorite = mongoose.model("Favorite", favoriteSchema);


const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});


const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Note = mongoose.model("Note", noteSchema);


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User", userSchema);


app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new User({ username, password });
    await user.save();
    res.status(201).send("User registered successfully");
  } catch (error) {
    res.status(400).send("Registration failed. Username may be taken.");
  }
});


app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send("Invalid credentials");
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).send("Invalid credentials");
    }
    const token = jwt.sign({ userId: user._id }, secretKey, {
      expiresIn: "1h", 
    });
    res.json({ token });
  } catch (error) {
    res.status(500).send("Login failed");
  }
});


const verifyToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).send("Access denied");
  try {
    const decoded = jwt.verify(token, secretKey);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).send("Invalid token");
  }
};



app.post("/api/notes", verifyToken, async (req, res) => {
  const newNote = new Note({
    userId: req.userId,
    content: req.body.content
  });

  try {
    const savedNote = await newNote.save();
    res.status(201).send(savedNote);
  } catch (err) {
    res.status(500).send(err);
  }
});


app.get("/api/notes", verifyToken, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId });
    res.send(notes);
  } catch (err) {
    res.status(500).send(err);
  }
});


app.put("/api/notes/:noteId", verifyToken, async (req, res) => {
  try {
    const updatedNote = await Note.findOneAndUpdate(
      { _id: req.params.noteId, userId: req.userId },
      { content: req.body.content, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).send("Note not found.");
    }
    res.send(updatedNote);
  } catch (err) {
    res.status(500).send(err);
  }
});


app.delete("/api/notes/:noteId", verifyToken, async (req, res) => {
  try {
    const deletedNote = await Note.findOneAndDelete({
      _id: req.params.noteId,
      userId: req.userId
    });

    if (!deletedNote) {
      return res.status(404).send("Note not found.");
    }
    res.send(deletedNote);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/api/favorites", verifyToken, async (req, res) => {
  const newFavorite = new Favorite({
    userId: req.userId,
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


app.get("/api/favorites", verifyToken, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.userId });
    res.send(favorites);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.delete("/api/favorites/:bookId", verifyToken, async (req, res) => {
  try {
    const removedFavorite = await Favorite.findOneAndDelete({
      userId: req.userId,
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
