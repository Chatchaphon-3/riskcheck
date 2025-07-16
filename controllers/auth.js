const User = require('../models/User');
const Project = require('../models/Project');
const Risk = require('../models/Risk');
const Unit = require('../models/Unit');
const validator = require('validator')
const xss = require('xss');
// const validator = require('validator');
const mongoSanitize = require('express-mongo-sanitize'); // protect NoSQL injection 
const { default: mongoose } = require('mongoose');
const districtData = require('../info/district_sub.json');
exports.register = async (req,res,next) =>{
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        // console.log(req.user.role);
        req.body = mongoSanitize.sanitize(req.body);
        let {username , email , password}  = req.body;
        // let role;
        //ป้องกัน xss
        // กัน username โล่ง
        
        //Protection พวก input
        if(!username || username.trim() === '') throw { code : 550 , status : 400 , message : 'กรุญากรอกชื่อผู้ใช้'};
        if(validator.escape(username) !== username) throw { code : 550 , status : 400 , message : 'ชื่อผู้ใช้ไม่สามารถมีอักขระอันตรายได้'};
        username = validator.escape(xss(username.trim()));
        //กัน email ผิด format 
        if(!validator.isEmail(email)) throw { code : 550 , status : 400 , message : 'กรุณากรอกอีเมลให้ถูกต้องตามรูปแบบของอีเมล'};
        email = validator.normalizeEmail(email.trim());

        if (!password || typeof password !== 'string' || password.trim().length < 8) {
            throw { code : 550 , status : 400 , message : 'รหัสผ่านควรมีจำนวนขั้นต่ำ 8 ตัวอักษร / ประเภทข้อมูลรหัสผ่านไม่ถูกต้อง / ไม่พบรหัสผ่าน'};
        }
        password = password.trim();

        //เช็ค email ซ้ำ   มี required : true
        const existingEmail = await User.findOne({email}).session(session);
        if(existingEmail){
            
            throw { code : 550 , status : 404 , message : 'อีเมลนี้ถูกใช้แล้วในระบบ'};
        }

        const user = await User.create([{
            username,
            email,
            password,
            role : 'user'
        }], {session});
    
        // logger.info('User registered successfully' , { username , email , role : 'user' });
        await session.commitTransaction();
        return res.status(201).json({success : true , data : user[0]});
        // sendTokenResponse(user,201,res);

    }catch(err){
        await session.abortTransaction();
        console.log(err);
        if(err.code === 550) {
            return res.status(err.status).json({success : false , message : err.message});
        }else if(err.name === 'ValidationError'){
            const errors = Object.values(err.errors).map((err)=>({
                field : err.properties.path, 
                message : err.properties.message,
                // type : err.properties.type,
            }));
            return res.status(400).json({success : false , message : errors[0].message});
        }
        return res.status(500).json({success : false , message : 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์'});
        
    }finally{
        session.endSession();
    }
}


exports.login = async (req,res,next)=>{
 
    try{
           let { email , password }  = req.body;
    // check email or password are exist in body
    if(!email || !password || (email.trim() === '') || (password.trim() === '')){
        // console.log('here');
        // console.log(password.trim() === '');
        // console.log(email );
       throw {code : 550 , status : 400 , message : 'กรุณากรอกข้อมูลอีเมลหรือรหัสผ่านให้ครบถ้วน'};
    }
    //Protect XSS 
    if(!validator.isEmail(email)) throw {code : 550 , status : 400 , message : 'รูปแบบอีเมลที่กรอกไม่ถูกต้อง'}
    email = validator.normalizeEmail(email.trim());
    
    //check email exist in db 
        const user = await User.findOne({email}).select('+password');
            if(!user){
                throw {code : 550 , status : 400 , message : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'};
            }

            //Check password 
            const isMatch = await user.checkPassword(password);
            if(!isMatch){
                throw {code : 550 , status : 400 , message : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'};
            }
            
            sendTokenResponse(user,200,res);
    }catch(error){
        console.log(error);
        if(error.code === 550){
            return res.status(error.status).json({success : false , message : error.message});
        }
        return res.status(500).json({success : false , message : 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์'});
    }
    

}

exports.MyProfile =  async (req,res,next)=>{
    try{
        if(!req.user || !req.user.id) throw {code : 550 , status : 401 , message : 'กรุณาเข้าสู่ระบบก่อนการดำเนินการ'};
        if(!mongoose.Types.ObjectId.isValid(req.user.id)) throw {code : 550 , status : 400 , message : 'รูปแบบไอดีที่ส่งเข้ามาในระบบ ไม่ถูกต้อง'};
        let query = User.findById(req.user.id);
        query = query.select('-workState'); // hidden 
        if(req.user.role !== 'evaluator'){
            query = query.select('-district'); //hidden
        }

        const user = await query;

        return res.status(200).json({success : true , message : 'ข้อมูลบัญชี' , data : user});
    }catch(error){
        console.log(error);
        if(error.code === 550){
            return res.status(error.status).json({success : false , message : error.message});
        }
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์' , message : error});
    }
};

exports.logout = async (req,res,next)=>{
    try{
        res.cookie('token' , '' , {
        expires : new Date(Date.now()) , 
        httpOnly : true 
    });

    return res.status(200).json({success : true , message : 'ออกจากระบบเสร็จสิ้น'});
    }catch(error){
        console.log(error);
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }
}

exports.protectRegister = async (req,res,next) => {
    const session = await mongoose.startSession();
    try{    
        session.startTransaction();
        //sanitize input 
        let total;
        req.body = mongoSanitize.sanitize(req.body);
        let {username , email , password , role , district}  = req.body;
        if(!username || username.trim() === '') throw {code : 550 , status : 400 , message : 'กรุณากรอกชื่อผู้ใช้'};
        if(validator.escape(username) !== username) throw {code : 550 , status : 400 , message : 'ชื่อผู้ใช้ไม่สามารถมีอักขระอันตรายได้'};
        username = validator.escape(xss(username.trim()));

        if(!validator.isEmail(email)) throw {code : 550 , status : 400 , message : 'กรุณากรอกอีเมลให้ถูกต้องตามรูปแบบของอีเมล'};
        email = validator.normalizeEmail(email.trim());

        if(!role || !['evaluator' , 'ce'].includes(role) ) throw {code : 550 , status : 400 , message : 'กรุณากรอกตำแหน่งของบัญชีที่ต้องการสร้างให้ถูกต้อง'};

        if(role === 'evaluator' && (!district || district.trim() === '')){   //เป็น eva แล้วไม่มี district
            throw {code : 550 , status : 400 , message : 'ในการสร้างผู้ตรวจสอบโครงการ จำเป็นต้องกรอกข้อมูลเขตของผู้ตรวจ'};
        }else if(role === 'evaluator' && district && ((validator.escape(district) !== district) || !(district in districtData) )){   // เป็น eva แล้ว district ไม่ถูกต้อง 
            throw {code : 550 , status : 400 , message : 'ข้อมูลเขตไม่สามารถมีอักขระพิเศษได้ หรือ ไม่พบชื่อเขตดังกล่าวในจังหวัดกรุงเทพมหานคร'};
        }
        if(district) district = validator.escape(xss(district.trim()));
        const existingEmail = await User.findOne({email}).session(session); // add session
        if(existingEmail){
            throw {code : 550 , status : 400 , message : 'อีเมลนี้ถูกใช้แล้วในระบบ'};
        }
        if (!password || typeof password !== 'string' ||password.trim().length < 8) {
            throw {code : 550 , status : 400 , message : 'เกิดข้อผิดพลาดที่ข้อมูลรหัสผ่าน โปรดตรวจสอบความยาวของรหัสผ่าน , เงื่อนไขรหัสผ่าน (ขั้นต่ำ 8 ตัวอักษรพร้อมกับตัวอักษรภาษาอังกฤษพิมพ์เล็กและพิมพ์ใหญ่ขั้นต่ำอย่างละ 1 ตัว ), ประเภทข้อมูลรหัสผ่านที่ส่งมา'};
        }
        password = password.trim();
        if(role === 'evaluator' && district){
            let evas = await User.find({district}).sort({createdAt : 1}).session(session);    //add session 
            total = evas;
        }
        const user = await User.create([{       //add session
            username,
            email,
            password,
            role,
            district
        }] , {session , runValidators: true});
        let targetProjectExisted = await Project.find({district}).sort({createdAt : -1}).session(session);
        targetProjectExisted = targetProjectExisted.filter(p=>p.projectStatus !== 'Completed');
        targetProjectExisted = targetProjectExisted.filter(p=>p.comment === null);
        //Logic แบ่งงาน targetProjectExisted = งานที่ิอยู่ใน district เดียวกัน + ยังไม่เสร็จ ดึงเอาที่ใหม่สุดมาก่อน
       if (role === 'evaluator' && targetProjectExisted.length !== 0) { // function แบ่งงาน ตอนมีคนใหม่เข้ามา
            let projectAssign = [];
            const projectByEva = new Map();  // ใช้ map 
            for (let p of targetProjectExisted) {
            const key = p.evaluatorID.toString();
            if (!projectByEva.has(key)) projectByEva.set(key, []);
            projectByEva.get(key).push(p);
            }
            
            let totalWork = Math.floor(targetProjectExisted.length / (total.length + 1)); // 
            let avg = totalWork;
            let i = 0;
            while (totalWork > 0) {
            let id = total[i % total.length]._id;
            let assignWork = projectByEva.get(id.toString());
            if (assignWork.length <= avg) {
                ++i;
                if (i === total.length) break;
                continue;
            }
            let amount = Math.min(assignWork.length - avg, totalWork);
            let finalProject = assignWork.slice(0, amount);
            finalProject.forEach(p => {
                projectAssign.push({
                updateOne: {
                    filter: { _id: p._id },
                    update: { evaluatorID: user[0].id }
                }
                });
            });

            totalWork -= amount;
            ++i;
            if (i === total.length) break;
            }

            if (projectAssign.length > 0) {
            await Project.bulkWrite(projectAssign, { session });
            }



        }
 

        await session.commitTransaction();
        return res.status(201).json({success : true , message : 'สร้างบัญชีเสร็จสิ้น'});

    }catch(error){
        await session.abortTransaction();
        console.log(error);
        if(error.code === 550){
            return res.status(error.status).json({success : false , message : error.message});
        }else if(error.name === 'ValidationError'){
            const errors = Object.values(error.errors).map((err)=>({
                field : err.properties.path, 
                message : err.properties.message,
                // type : err.properties.type,
            }));
            return res.status(400).json({success : false , message : errors[0].message});
        }
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }finally{
        session.endSession();
    }
}

//path : api/v1/auth/dl/:id 
//ทำเพิ่มมาเวลา eva ที่โดนลบมีงานที่เขากำลังตรวจ
exports.deleteAccount = async (req,res,next)=> {
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        req.params.id = mongoSanitize.sanitize(req.params.id);
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw {code : 550 , status : 400 , message : 'ข้อมูลบางฟิลด์ในparamsผิดแบบฟอร์มระบบ'};
        //check user existed
        let userExisted = await User.findById(req.params.id).session(session);
        if(!userExisted) throw {code : 550 , status : 404 , message : 'ไม่พบผู้ใช้ดังกล่าว'};
        if((userExisted.id !== req.user.id ) && req.user.role !== 'admin'){
            // console.log(userExisted.id !== req.user.id);
            // console.log(req.user);
            throw { code : 550 , status : 400 , message : 'ไม่สามารถลบบัญชีของผู้ใช้ท่านอื่นได้'};
        }
        if(userExisted.role === 'evaluator'){
            let projectExisted = await Project.find({evaluatorID : userExisted._id}).session(session);
            projectExisted = projectExisted.filter(p=>p.projectStatus !== 'Completed');
            // let projectExisted = allProject.filter(p=>p.projectStatus !== 'Completed');

            if(projectExisted.length > 0) {
                // ดึง evaluator ทุกคนในเขต, role, และเรียงตาม workState (index ช่วย)
                let evaData = await User.find({ district : userExisted.district , role : 'evaluator'}).sort({workState : 1}).session(session);
                // กรอง evaluator ที่จะถูกลบออก
                evaData = evaData.filter(p=>p.id !== req.params.id);
                if(evaData.length === 0) 
                    throw {code : 550 , status : 400 , message : 'ไม่สามารถลบบัญชีได้ในตอนนี้ , ยังไม่มีผู้ตรวจคนอื่นในเขตนี้ที่สามารถรับงานต่อได้'};
                let temp = 0;
                let all = evaData.length;
                // Prepare bulkPrject
                const bulkProject = projectExisted.map(project=>{
                    const assignedEva = evaData[temp%all].id;
                    ++temp;
                    return {
                        updateOne : {
                            filter : { _id : project._id} , 
                            update : {evaluatorID : assignedEva}
                        }
                    };
                });
                temp = 0;
                //Prepare bulk user(eva)
                const bulkEva = projectExisted.map(project=>{
                    const eva = evaData[temp%all].id;
                    ++temp;
                    return {
                        updateOne : {
                            filter : {_id : eva} , 
                            update : {workState : new Date()}
                        }
                    };
                });
                if(bulkProject.length > 0) await Project.bulkWrite(bulkProject , {session});
                if(bulkEva.length > 0) await User.bulkWrite(bulkEva , {session});
                // for(let i = 0; i < projectExisted.length; ++i){
                //     await Project.updateOne({_id :projectExisted[i]._id} , {evaluatorID : evaData[(temp)%all].id} , {session});
                //     await User.findByIdAndUpdate(evaData[(temp++)%all].id , {workState : new Date()} , {session});
                // }
            }
        }
        let deledtedUser  = await User.findByIdAndDelete(req.params.id , {session});  // ลบตรงนี้
        // let project = Project.find({req.params.id})
        //ลบ user แล้วต้องลบทุกอย่างที่เกี่ยวข้องกับคนนั้นด้วย 
        if(deledtedUser.role === 'user'){
            let targetProject = await Project.find({userID : deledtedUser.id}).session(session);
            if(targetProject.length > 0){
                let pID;
                for(let i = 0; i < targetProject.length; ++i){
                    pID = targetProject[i].id;
                    await Unit.findOneAndDelete({projectID : pID} , {session});
                    await Risk.findOneAndDelete({projectID : pID} , {session});
                }
                await Project.deleteMany({userID : deledtedUser.id} , {session});
            }
        }
        await session.commitTransaction();
        return res.status(200).json({success : true , message : 'ลบบัญชีผู้ใช้เสร็จสมบูรณ์'});
    }catch(error){
        await session.abortTransaction();
        console.log(error);
        if(error.code === 550){
            return res.status(error.status).json({success : false , message : error.message});
        }
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }finally{
        session.endSession();
    }
}



const sendTokenResponse =  (user,statusCode,res)=>{    // return status code + stored token 
    try{
        const token = user.jwtToken();
    const options = {
        expires : new Date(Date.now()+process.env.JWT_COOKIE_EXPIRE*24*60*60*1000) , 
        httpOnly : true  
    };
    if(process.env.NODE_ENV === 'production'){
        options.secure = true;
    }
    return res.status(statusCode).set("Authorization", `Bearer ${token}`).cookie('token',token,options).json({success : true ,
        user : {
            _id : user.id , 
            username : user.username , 
            email : user.email ,
            role : user.role
        }
    });
    }catch(error){
        console.log(error);
        return res.status(500).json({success : false , message : 'fail'});
    }
}