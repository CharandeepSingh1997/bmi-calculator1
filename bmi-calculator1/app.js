const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const dbPath = './db/bmi_data.db';
const db = new sqlite3.Database(dbPath);

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Create the table if it doesn't exist
// ... (other code)

// Create the table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bmi_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      height REAL,
      weight REAL,
      bmi REAL,
      status TEXT,
      message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Calculate BMI and store data in the database
app.post('/calculate', (req, res) => {
  const { name, height, weight } = req.body;

  if (!name || isNaN(parseFloat(height)) || isNaN(parseFloat(weight)) || height <= 0 || weight <= 0) {
    return res.status(400).json({ error: 'Name, height, and weight must be valid numeric values and greater than 0.' });
  }

  const heightNum = parseFloat(height);
  const weightNum = parseFloat(weight);
  const bmi = weightNum / (heightNum * heightNum);
  
  // Define status and message based on the calculated BMI
  let status = '';
  let message = '';
  if (bmi < 18.5) {
    status = 'Underweight';
    message = 'You should eat a little more.';
  } else if (bmi >= 18.5 && bmi <= 24.9) {
    status = 'Normal';
    message = 'Keep doing what you are doing.';
  } else if (bmi >= 25 && bmi <= 29.9) {
    status = 'Overweight';
    message = 'You should cut a little bit of weight.';
  } else {
    status = 'Obese';
    message = 'You should really do something.';
  }

  db.run(
    'INSERT INTO bmi_records (name, height, weight, bmi, status, message) VALUES (?, ?, ?, ?, ?, ?)',
    [name, heightNum, weightNum, bmi, status, message],
    (err) => {
      if (err) {
        console.log('Error saving data to the database:', err);
        return res.status(500).json({ error: 'Failed to save data in the database.' });
      }

      console.log('Data saved successfully');

      return res.json({
        name,
        height: heightNum,
        weight: weightNum,
        bmi,
        status,
        message,
      });
    }
  );
});



// Get user's BMI data
app.get('/user-stats/:name', (req, res) => {
  const { name } = req.params;

  db.all(
    'SELECT * FROM bmi_records WHERE name = ?',
    [name],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch user stats from the database.' });
      }

      return res.json(rows);
    }
  );
});

// Get a list of users
app.get('/users', (req, res) => {
  db.all('SELECT DISTINCT name FROM bmi_records', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch users from the database.' });
    }

    const users = rows.map((row) => row.name);
    return res.json(users);
  });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
