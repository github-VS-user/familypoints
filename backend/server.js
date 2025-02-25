const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = "db.json";

// Load database
function loadDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

// Save database
function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Get points
app.get("/points/:person", (req, res) => {
    const db = loadDB();
    const person = req.params.person;
    res.json(db[person]);
});

// Update points
app.post("/update/:person", (req, res) => {
    const db = loadDB();
    const person = req.params.person;
    const { amount, reason } = req.body;

    db[person].points += parseInt(amount);
    const timestamp = new Date().toLocaleString();
    db[person].history.unshift(`${timestamp} - ${amount} points: ${reason}`);

    saveDB(db);
    res.json(db[person]);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
