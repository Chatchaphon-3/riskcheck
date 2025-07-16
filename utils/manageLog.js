const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname,'../log/combined.json');   
const emailToDelete = "chatchaphon2555@gmail.com";

function deleteLogByEmail(logFilePath, emailToDelete) {
    // อ่านไฟล์ combined.json
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading log file:", err);
            return;
        }

        // แปลง log เป็น Array ของ JSON objects (แยกแต่ละบรรทัด)
        const logs = data.trim().split('\n').map(line => JSON.parse(line));
        console.log(logs.length);
        // กรอง log ออก (ลบ log ที่มี email ตรงกับที่ระบุ)
        const filteredLogs = logs.filter(log => log.email !== emailToDelete);

        // เขียน log ที่กรองแล้วกลับลงไฟล์เดิม
        const updatedLogs = filteredLogs.map(log => JSON.stringify(log)).join('\n');
        fs.writeFile(logFilePath, updatedLogs, 'utf8', err => {
            if (err) {
                console.error("Error writing updated log file:", err);
            } else {
                console.log(`Logs with email "${emailToDelete}" have been removed.`);
            }
        });
    });
}

// เรียกใช้งานฟังก์ชัน
deleteLogByEmail(logFilePath, emailToDelete);



