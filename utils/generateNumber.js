const mongoose = require('mongoose');

const genNum = async () => {
    let projectNum;
    let isUnique = false;

    // ใช้ mongoose.model แทนการ require โมเดลโดยตรงเพื่อหลีกเลี่ยง Circular Dependency
    const Project = mongoose.model('Project');

    while (!isUnique) {
        projectNum = Math.floor(100000 + Math.random() * 900000); // สุ่มเลข 6 หลัก
        const existProjectNum = await Project.findOne({ projectNum });
        if (!existProjectNum) isUnique = true;
    }
    return projectNum;
};
// Export function
module.exports = genNum;
