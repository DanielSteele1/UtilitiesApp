const express = require('express');
const session = require('express-session');

require('dotenv').config();
const cors = require('cors');
const bcrypt = require('bcrypt');

const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5000;
const bodyParser = require('body-parser');
const { LocalConvenienceStoreOutlined } = require('@mui/icons-material');

app.use(cors());
app.use(express.json());
// connect to MongoDB

app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from React frontend
  credentials: true 
}));

app.use(session({
  secret: process.env.secretsession,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true }
}));


// get URI from the env file.
const uri = process.env.uri;
const saltrounds = 10;

const client = new MongoClient(uri);

async function run() {

  try {
    // connect to server
    await client.connect();

    // confirm connection with a ping
    await client.db("admin").command({ ping: 1 });

    console.log("Pinged you're deployment. You have successfully connected to MongoDB!");
    db = client.db("FocusDev");

  } catch (error) {

    console.error("Failed to connect to MongoDB", error);

  }
}
run().catch(console.dir);

// get QOTD
app.get('/api/qotd', async (req, res) => {
  try {
    const response = await fetch('https://favqs.com/api/qotd');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// get status of the user. are they logged in or not?
// this can then be sent to the frontend, enabling me to effect elements there.
app.get('/auth/status', async (req, res) => {
  if(req.session.user) {
    console.log("Session:", req.session);  // Debugging session
    res.json({ loggedIn: true, user: req.session.user});
  } else {
    res.json({ loggedIn: false });
  }
});

// signup
app.post('/signup', async (req, res) => {
  try {

    const { email, password } = req.body;
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ email });

    // checks for existing users - returns an error
    if(existingUser) {

      console.log("Email is already in use, please user an alternitive email address.");
      return res.status(400).json({ message: 'Email is already in use, please use an alternitive email address.'});

    }

    // hash password so we don't store in plaintext
    const hash = await bcrypt.hash(password, saltrounds);

    // insert entered password and email.
    const insertResult = await usersCollection.insertOne({

      email: email,
      password: hash,

    });
    console.log(insertResult);
    res.status(200).json('User signed up!');
    console.log(email, "- signed up!");


  } catch (error) {
    res.status(500).json({ error: 'Failed to Sign up' });
    console.log("Failed to sign up", error);
  }
});

//login

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usersCollection = db.collection('users');
    // make the email field a unique input - important
    await usersCollection.createIndex({ email: 1}, {unique:true});

    // Check if a user exists with the provided email
    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      // If the user doesn't exist
      console.log("User not found");
      return res.status(400).json({ message: "User not found. This could be because of an incorrect email or password. Please try again." });
    }

    // If user exists, validate the password
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      // If password is valid, log the user in and store the user in the session
      req.session.user = user;
      console.log(email, "is logged in!");
      return res.status(200).json({ message: "Login successful!" });
    } else {
      // If password is invalid, return an error
      console.log("Incorrect password");
      return res.status(400).json({ message: "Incorrect email or password. Please try again." });
    }

  } catch (error) {
    console.error("Error in login route", error);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});