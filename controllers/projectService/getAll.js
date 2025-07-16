const Project = require('../../models/Project');
const mongoSanitize = require('express-mongo-sanitize');
const districtData = require('../../info/district_sub.json');

// path : GET /api/v1/project
exports.getAllProjects = async (req,res,next)=>{
    try{
    let queryObj = {};
    let url = mongoSanitize.sanitize(req.query); // NoSQL injection 

    //Searching (เดี๋ยวค่อย optimized)
    if(url.projectName){   //หาชื่อ 
        if(typeof url.projectName !== 'string') throw {code :550  , status :400 , message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'};
        // console.log(req.query.projectName);
        queryObj.projectName = {$regex : req.query.projectName , $options : "i"};  // regex = ให้หาคำคล้าย , option i = ไม่แคร์พิมใหญ่-เล็ก
    }
    if(url.district){
        if(typeof url.district !== 'string') throw {code :550  , status :400 , message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'};
        let temp = url.district.split(',').map(d=>d.trim()).filter(Boolean);
        // console.log(temp.length);
        if(temp.length === 1){
            queryObj.district = temp[0];
            // console.log('here1' , temp);
        }
        else if(temp.length > 1)queryObj.district = {$in : temp};
        // console.log('here2' , temp);
    }
    if(url.subDistrict){
        if(typeof url.subDistrict !== 'string') throw {code :550  , status :400 , message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'};
        queryObj.subDistrict = url.subDistrict;
    }
    if(url.status){
        if(['Completed' , 'รอเจ้าของโครงการ' , 'รอผู้ตรวจสอบ'].includes(url.status) === false ) throw {code :550  , status :400 , message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'};
        else queryObj.projectStatus = url.status;
    }


    //Filter Role 
    if(req.user.role === 'user'){
        queryObj.userID = req.user._id;   // หาแค่ project ที่มี userID ตรงกับ req.user._id
    }
    else if(req.user.role === 'evaluator'){
        queryObj.district = req.user.district; // หาแค่ project ที่มี district ตรงกับของ req.user.role -> evaluator 
        queryObj.evaluatorID = req.user._id;  // หาแค่ project ที่เป็นของ evaluator คนนั้น 
    }
    //Sorting
    let sortBy = url.sort ? url.sort.split(',').join(' ') : '-updatedAt createdAt';   // Ternary Operator  , default : สร้างล่าสุด-> เก่าสุด

    const populateObj = {
        path : 'userID evaluatorID',
        select : 'username email role'
    };



        const projects = await Project.find(queryObj).populate(populateObj)
            .sort(sortBy)
            .select('projectName projectNum  projectStatus updatedAt district');
            // console.log('Projects here');
            // console.log(projects);
        if(req.user.role === 'evaluator' || req.user.role === 'ce'){
            const totalFinished = projects.filter(p=>p.projectStatus === 'Completed').length;
            const totalWaitingEva = projects.filter(p=>p.projectStatus === 'รอผู้ตรวจสอบ').length;
            const totalWaitingUser = projects.filter(p=>p.projectStatus === 'รอเจ้าของโครงการ').length;
            if(req.user.role === 'evaluator'){
                return res.status(200).json({success : true , 
                                    total : projects.length, 
                                    totalFinishedProject : totalFinished , 
                                    totalWaitingForEvaluator : totalWaitingEva ,
                                    totalWaitingForUser : totalWaitingUser,
                                    data : projects });
            }else{
                // total projct are projects.length
                let summaryData = {};
                let all,done, waitingEva , waitingUser ;
                for(let eachDistrict in districtData){
                    all = projects.filter(p=>p.district === eachDistrict);
                    done = all.filter(p=>p.projectStatus === 'Completed');
                    waitingEva = all.filter(p=>p.projectStatus === 'รอผู้ตรวจสอบ');
                    waitingUser = all.length - (waitingEva.length + done.length);

                    summaryData[eachDistrict] = {
                        total : all.length , 
                        finished : done.length , 
                        waitingForEvaluator : waitingEva.length , 
                        waitingForUser : waitingUser
                    };
                }
                return res.status(200).json({success : true ,
                    total : projects.length , 
                    totalFinishedProject : totalFinished , 
                    totalWaitingForEvaluator : totalWaitingEva ,
                    totalWaitingForUser : totalWaitingUser,
                    data : projects ,
                    summary : summaryData });
            }
        }
        if(projects.length === 0) return res.status(200).json({success : true ,message : 'ไม่พบข้อมูลโครงการ'});
        return res.status(200).json({success : true ,total : projects.length ,data : projects});
    }catch(err){
        // console.log('Here');
        // console.log('Here' , err);
        if(err.code === 550 ) return res.status(err.status).json({success : false , message : err.message});
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }   
    
};