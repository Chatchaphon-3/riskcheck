const multer = require('multer'); // สำหรับการจัดการไฟล์
const { S3Client } = require('@aws-sdk/client-s3'); // สำหรับ MinIO
require('dotenv').config(); // โหลดตัวแปรจาก config.env หรือ .env (สำคัญ!)
// Config Multer สำหรับการรับไฟล์
const upload = multer({
    dest: 'uploads/', // เก็บไฟล์ชั่วคราวในโฟลเดอร์นี้
});

// เชื่อมต่อ miniO
const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: 'https://eventual-cathie-ninecorps-b2b2dd48.koyeb.app',
  credentials: {
    accessKeyId: 'admin',
    secretAccessKey: 'password123',
  },
  forcePathStyle: true,
});
const s3Public = new S3Client({
  region: 'us-east-1',
  endpoint: 'https://eventual-cathie-ninecorps-b2b2dd48.koyeb.app',  // หรือใส่ domain จริงเลย
  credentials: {
    accessKeyId: 'admin',
    secretAccessKey: 'password123',
  },
  forcePathStyle: true,
});




module.exports = { upload, s3 , s3Public };
