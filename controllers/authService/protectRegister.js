const User = require('../../models/User');
const Project = require('../../models/Project');
const validator = require('validator')
const xss = require('xss');
// const validator = require('validator');
const mongoSanitize = require('express-mongo-sanitize'); // protect NoSQL injection 
const { default: mongoose } = require('mongoose');
const districtData = require('../../info/district_sub.json');
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
        district = validator.escape(xss(district.trim()));
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
        // console.log('Before : ', targetProjectExisted.length);
        targetProjectExisted = targetProjectExisted.filter(p=>p.projectStatus !== 'Completed' && p.comment === null);
        // targetProjectExisted = targetProjectExisted.filter(p=>p.comment === null);
        //Logic แบ่งงาน targetProjectExisted = งานที่ิอยู่ใน district เดียวกัน + ยังไม่เสร็จ ดึงเอาที่ใหม่สุดมาก่อน
        // console.log(targetProjectExisted.length);
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
            // console.log('total work : ' , totalWork);
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
            if (i === total.length){
                // console.log('trigger1');
                break;
            }
            // console.log('trigger2');
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