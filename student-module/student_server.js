const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port1 = 3080;
const port2 = 3081;
const port3 = 3082;
const port4 = 3083;
const port5 = 3084;
const port6 = 3085;
const port7 = 3086;
const port8 = 3088;

//importing nodemailer to send the emails
const nodemailer = require('nodemailer');
require('dotenv').config();

//generating random string for the session:
const crypto = require('crypto');
const generateRandomSecret = () => {
    return crypto.randomBytes(32).toString('hex'); 
    // Generate a 32-byte (256-bit) random string
};
const secret = generateRandomSecret();
console.log(secret); // Print the random secret

 //importing library uuid for unique id generation
const { v4: uuidv4 } = require('uuid');

// Middleware

app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: true
}));
// Middleware to check session state
const checkSession = (req, res, next) => {
    // If session exists and user is authenticated (you need to define isAuthenticated function)
    if (req.session && req.session.isAuthenticated) {
        return next(); // Proceed to next middleware
    } else {
        res.redirect('/login'); // Redirect to login page if session is not valid
    }
};

// Apply checkSession middleware to routes that require authentication
app.get('/protected-page', checkSession, (req, res) => {
    // Render protected page
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files (like CSS files)
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sh@1210520',
    database: 'shms'
});

// Connect to MySQL
connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

//---------------login server-------------------
app.get('/login', (req, res) => {
    console.log('GET request received at /');
    res.sendFile(__dirname + '/index_login.html');
});

// Route to handle Student login
app.post('/student-module/index_login.html/submit', (req, res) => {
    console.log('POST request received at /student-login/index_login.html/submit');
    const {loginId, password } = req.body;
    console.log('Received loginId:', loginId); console.log('Received password:', password);
    const sql = 'SELECT username,pswd FROM user_master_tbl WHERE username = ? and u_type="student"';
    console.log(sql);
    connection.query(sql, [loginId], (err, result) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        if (result.length === 1 && result[0].pswd === password) {
            // Successful login
            req.session.loginId = loginId; //stored loginid in session
            console.log('Login successful. Session loginId:', req.session.loginId);
            return res.status(200).json({ message: 'Login successful' });
            
        } 
        else {
            // Incorrect credentials
            return res.status(401).json({ message: 'Incorrect username or password' });
        }
    });
});

//-----------student page server----------
app.get('/page', (req, res) => {
    console.log('GET request received at /');
    res.sendFile(__dirname + '/index_spage.html');
});

// Route to handle form submission and update data
app.post('/student-module/index_spage.html/submit', (req, res) => {
    console.log('POST request received at /student-pagee/index_spage.html/submit');
    const { d_type, current, d_new } = req.body;
    const userId = req.session.loginId;
    const request_id =  generateRequestId();  //Generate a unique request ID
    const sql = `INSERT INTO shms.update_requests_tbl (request_id, s_id, d_type, d_current,sts, d_new) VALUES (?, ?, ?, ?,'pending',?)`;
    connection.query(sql, [request_id, userId, d_type, current, d_new], (err, result) => {
        if (err) {
            console.error('Error submitting update request:', err);
            res.status(500).send('Error submitting update request');
        } else {
            console.log('Update request submitted');
            res.send('Update request submitted');
        }
    });
});


//route to handle feedbacks and complaints
app.post('/student-module/index_spage.html/send', (req, res) => {
    console.log('POST request received at /student-module/index_spage.html/send');
    const userId = req.session.loginId;
    const {complain} = req.body;
    
    const sql = `INSERT INTO shms.feedback_tbl (username,feedback) VALUES (?,?)`;
    connection.query(sql, [userId,complain], (err, result) => {
        if (err) {
            console.error('Error registering feedback:', err);
            res.status(500).send('Error registering feedback');
        } else {
            console.log('feedback registered');
            res.send('feedback registered');
        }
    });
});

//------------student form server----------------


// Route to serve HTML form
app.get('/form', (req, res) => {
    console.log('GET request received at /form');
    res.sendFile(__dirname + '/index_sform.html');
});
 
// Route to handle form submission and update data
app.post('/student-module/index_sform.html/submit', (req, res) => {
    console.log('POST request received at /student-module/index_sform.html/submit');
    const {smartId, rollNo, name, dob, program, subject, year, fatherName, motherName, email, phone, parentPhone, 
        address, city, state, pincode } = req.body;
    //console.log('ID:', smartId);
    //console.log('Name:', name);
    const sql = `INSERT INTO shms.student_master_tbl (st_id,st_roll,st_name,dob,program,sub,yr,st_phno,email,f_name,m_name,
        f_phno,address,city,state,pincode) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    connection.query(sql, [smartId, rollNo, name, dob, program, subject, year, phone, email, fatherName, motherName, parentPhone, 
        address, city, state, pincode], (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
            res.status(500).send('Error inserting data');
        } else {
            console.log('Data inserted successfully');
            res.send('Data inserted successfully');
        }
    });
});

//---------------room server-------------

// Set EJS as the view engine
app.set('view engine', 'ejs');

// viewing available room from room_master_tbl
app.get('/room', (req, res) => {
    const sql = 'SELECT * FROM  room_master_tbl where vaccant > 0 ORDER BY floor_no, room_no'; // Change this to your table name
    connection.query(sql, (err, rows) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).send('Error fetching data');
        } else {
            res.render('index_rpage', { data: rows });
        }
    });
});

//allocating rooms
app.post('/student-module/index_rpage.ejs/submit', (req, res) => {
    const { hostel, room_num } = req.body;
    const user_id = req.session.loginId;
    const request_id =  generateRequestId();  //Generate a unique request ID
    const room_alloc = `INSERT INTO shms.room_allocation_requests (request_id, h_id, s_id, room_no, sts) VALUES (?,?,?,?,'pending')`;
    connection.query(room_alloc, [request_id, hostel, user_id, room_num], (err, results) => {
        if (err) 
        {
          console.log("login id",user_id);
          console.error('Error allocating room: ' + err);
          return res.status(500).json({ error: 'Internal server error' });
        }
         
        return res.status(200).json({ message: "Room allocation request sent successfully"});
    
    });
});

function generateRequestId() {
    // Generate a unique UUID (version 4) as the request ID
    return uuidv4();
}

//--------------------PROFILE-------------------------------------------
//viewing profile of a student using student_master_tbl
app.get('/profile', (req, res) => {
    const userId = req.session.loginId;
    const sql = 'SELECT st_name,st_id,st_roll,program,sub,email FROM  student_master_tbl where email=?'; 
    connection.query(sql,[userId],(err, rows) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).send('Error fetching data');
        } else {
            res.render('index_profile', { data: rows });
        }
    });
});

//-----------------------logout--------------------------------------


app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        // Redirect to the login page
        res.redirect('/login');
    });
});

//------------------------forgot password mail------------------------

//host and port provided by node mailer to help send emails
const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

// Route to serve HTML form
app.get('/forgotPassword', (req, res) => {
console.log('GET request received at /');
res.sendFile(__dirname + '/index_forgotp.html');
});

app.post('/student-module/index_forgotp/send', (req, res) => {
const {emailu} = req.body;
console.log('Received username:', emailu);
// console.log('Received password:', password);
const sql = 'SELECT username,pswd FROM user_master_tbl WHERE username = ?';
console.log(sql);
connection.query(sql, [emailu], (err, result) => {
    if (err) 
    {
        console.error('Error executing MySQL query:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }

    if (result.length === 1) 
    {
        // Successful entry
       // req.session.loginId = loginId; //stored loginid in session
       // return res.status(200).json({ message: 'Login successful' });
        const mailOptions = {
            from: process.env.EMAIL,
            to: result[0].username,
            subject: 'Password by Shree Shanta Hostel Accomodations',
            html: '<p><b>Your login details for Shree Shanta Hostel Accomodations</b><br><b>Email:</b>' 
            + result[0].username + '<br><b>Password: </b>' + result[0].pswd + '<br><a href="http://localhost:3080/login">Click here to login</a></p>'
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ message: 'Error sending email' });
            } else {
                console.log('Email sent:', info.response);
                return res.status(200).json({ message: "Password sent successfully to your email." });
            }
        });
       
    } 
    
    else 
    {
        // Incorrect credentials
        return res.status(401).json({ message: 'Incorrect username' });
    }
});
});
           

//-------------------------------------------------------------------------

// Start server_login
app.listen(port1, () => {
    console.log(`Server is running on http://localhost:${port1}/login`);
});

// Start server_page
app.listen(port2, () => {
    console.log(`Server is running on http://localhost:${port2}/page`);
});

// Start server_form
app.listen(port3, () => {
    console.log(`Server is running on http://localhost:${port3}/form`);
});

// Start server_room
app.listen(port4, () => {
    console.log(`Server is running on http://localhost:${port4}/room`);
});

// Start server
// app.listen(port5, () => {
//     console.log(`Server is running on http://localhost:${port5}/room_form`);
// });

//Start profile server
app.listen(port6, () => {
    console.log(`Server is running on http://localhost:${port6}/profile`);
});

//logout 
app.listen(port8, () => {
    console.log(`Server is running on http://localhost:${port8}/logout`);
});

//Start server
app.listen(port7, () => {
    console.log(`Server is running on http://localhost:${port7}/forgotPassword`);
});