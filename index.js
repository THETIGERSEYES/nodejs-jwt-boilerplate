const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connection = require('./database');
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');



const { SERVER_PORT, CLIENT_URL, JWT_SECRET } = process.env;

const app = express();

app.use(
  cors({
    origin: CLIENT_URL,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400)
    .json({ errorMessage: 'Svp veuillez renseigner votre mail ET votre mot de passe'})
  } else {
    const hash = bcrypt.hashSync(password, 10);
    connection.query(
      'INSERT INTO user(email, password) VALUES (?, ?)',
      [email, hash],
      (error, result) => {
        if (error) {
          res.status(500).json({ errorMessage: error.message});
        } else {
          res.status(201).json({
            id: result.insertId,
            email,
            password: 'hidden'
          })
        }
      }
    )
  }
})

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res
      .status(400)
      .json({ errorMessage: 'Please specify both email and password' });
  } else {
    connection.query(
      `SELECT * FROM user WHERE email=?`,
      [email],
      (error, result) => {
        if (error) {
          res.status(500).json({ errorMessage: error.message });
        } else if (result.length === 0) {
          res.status(403).json({ errorMessage: 'Invalid email' });
        } else if (bcrypt.compareSync(password, result[0].password)) {
          // Passwords match
          const user = {
            id: result[0].id,
            email,
            password: 'hidden',
          };
          const token = jwt.sign({ id: user.id }, JWT_SECRET, {
            expiresIn: '1h',
          });
          res.status(200).json({ user, token });
        } else {
          // Passwords don't match
          res.status(403).json({ errorMessage: 'Invalid password' });
        }
      }
    );
  }
});

const authenticateWithJsonWebToken = (req, res, next) => {
  if (req.headers.authorization !== undefined) {
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err) => {
      if(err) {
        res.status(401).json({ errorMessage: "You don't have the authorization to access data" })
      } else {
        next();
      }
    });
  } else {
    res.status(401).json({errorMessage: "You don't have the authorization to access this data"})
  }
}

app.get('/users', authenticateWithJsonWebToken, (req, res) => {
  connection.query('SELECT * FROM user', (error, result) => {
    if (error) {
    res.status(500).json({ errorMessage: error.message });
  } else {
    res.status(200).json(
      result.map((user) => {
        return {...user, password: 'hidden'}
      })
    )
  }})
});








// Don't write anything below this line!
app.listen(SERVER_PORT, () => {
  console.log(`Server is running on port ${SERVER_PORT}.`);
});
