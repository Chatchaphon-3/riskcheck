const Project = require('../../models/Project');
const districtData = require('../../info/district_sub.json');
//path : api/v1/project/summary
exports.summaryInfo = async (req,res,next)=>{   //
    
    try{   //ce เห็นได้ว่าแต่ละเขตมีกี่ project , ในเขตนั้นมี project ที่มีสถานะต่างๆกี่อันบ้าง 
        const projects = await Project.find();
        const summaryDistrict = {};

        for(const districtName in districtData){

            // filter เขต
            const allProjectInDistrict = projects.filter(p=>p.district === districtName);
            
            //จำนวนของทุก project ในเขต
            const allproject = allProjectInDistrict.length;

            //จำนวนของ project ที่ผ่านแล้ว
            const finished = allProjectInDistrict.filter(p=>p.projectStatus === 'Completed').length;

            //จำนวนของ project ที่ยังไม่ผ่าน
            const pending =  allProjectInDistrict.filter(p=>p.projectStatus !== 'Completed').length;

            summaryDistrict[districtName] ={
                total : allproject , 
                finishedProject : finished , 
                pendingProject : pending
            };
            
        }

        return res.status(200).json({success :true , data : summaryDistrict});
    }catch(errror){
        console.log(error);
        return res.status(400).json({success : false , message : 'เกิดข้อผิดพลาดทางฝั่งเซิร์ฟเวอร์'});
    }

    
    
};