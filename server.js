const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const axios = require('axios'); // ดึง APIs จากแหล่งอื่น 
const auth = require('./routes/auth');
const project = require('./routes/project');
const cors = require('cors');
const helmet = require('helmet');  // กัน header injection
const { exec } = require('child_process');

dotenv.config({path: './config/config.env'});  // load all variables from file config.env

connectDB();  //connect Database

const app = express(); //เรียกใช้ framework express.js
app.use(express.json()); // แปลงข้อมูลใน req.body ที่เข้ามาแบบ json ให้เป็น javascript object store in req.body 
app.use(cookieParser());  // แปลง cookie ที่เข้ามาให้เป็น object ให้ใช้ง่ายๆ
app.use(helmet());

//Cors 
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));


const PORT = process.env.PORT || 5000;  // set port variable 

const server = app.listen(PORT,console.log('server are running',process.env.NODE_ENV,'mode , on PORT : ',PORT));

process.on('unhandledRejection',(err,promise)=>{
    console.log(`Error : ${err.message}`);
    //close
    server.close(()=> process.exit(1));
});


// app.post('/api/v1/auth/register',register);

app.use('/api/v1/auth',auth);
app.use('/api/v1/project',project);
const { exec } = require('child_process');

app.get('/check-chromium-path', (req, res) => {
  exec('which chromium-browser', (err, stdout, stderr) => {
    if (err || !stdout) {
      exec('which chromium', (err2, stdout2, stderr2) => {
        if (err2 || !stdout2) {
          exec('which google-chrome', (err3, stdout3, stderr3) => {
            if (err3 || !stdout3) {
              res.send('No chromium or google-chrome found');
            } else {
              res.send(`google-chrome: ${stdout3.trim()}`);
            }
          });
        } else {
          res.send(`chromium: ${stdout2.trim()}`);
        }
      });
    } else {
      res.send(`chromium-browser: ${stdout.trim()}`);
    }
  });
});



