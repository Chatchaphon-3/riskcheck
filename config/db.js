const mongoose = require('mongoose');

const connectDB = async ()=> {
    mongoose.set('strictQuery' , true);   // set ให้ strict query เพื่อลดข้อผิดพลาดของการเขียน query ไม่ตรงกับ schema 
    const conn = await mongoose.connect(process.env.MONGO_URI);  //connect DB





    console.log(`MongoDB Connect: ${conn.connection.host}`);   // execute after await line 
}

module.exports = connectDB;   // export function !!!!!