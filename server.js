const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const axios = require('axios'); // ดึง APIs จากแหล่งอื่น 
const auth = require('./routes/auth');
const project = require('./routes/project');
const cors = require('cors');
const helmet = require('helmet');  // กัน header injection

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


