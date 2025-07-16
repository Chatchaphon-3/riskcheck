const Project = require('../../models/Project');
const { PutObjectCommand, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');
const {s3 } = require('../../middleware/uploadConfig');
const sanitizeFileName = require('../../utils/sanitizeFileName');
const { default: mongoose, model } = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
// Upload project Doc   /api/v1/project/:id/doc
// file size , duplicated file , 
// path : PATCH /api/v1/project/:id
exports.uploadDoc = async (req,res,next)=>{
    const BUCKET_NAME = 'bucket1';
    try {
        // ตรวจสอบว่า bucket มีอยู่หรือไม่
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        // console.log("Bucket exists.");
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            // Bucket ไม่มี → สร้างใหม่
            await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
            // console.log("Created new bucket.");
        } else {
            // ถ้าเป็น error อื่น เช่น permission, credential ผิด
            throw { code: 550, status: 500, message: 'ไม่สามารถเข้าถึง MinIO ได้: ' + err.message };
        }
    }
    let file;
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        file  = req.file;
        //NoSQL injection 
        req.params = mongoSanitize.sanitize(req.params);
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw { code : 550  , status : 400 , message : 'รูปแบบ ID ที่ส่งเข้ามาใน params ไม่ถูกต้องตาม format'};
        let project = await Project.findById(req.params.id).session(session);

        if(!project) throw {code : 550 , status : 404 , message : 'ไม่พบข้อมูลของโครงการดังกล่าว'};
        //ไม่ใช่ของตัวเอง + ไม่ใช่ admin = ทำไม่ได้
        if(project.userID.toString() !== req.user.id && req.user.role !== 'admin'){
            throw { code : 550 , status : 400 , message : 'ไม่สามารถอัพโหลดเข้าโครงการที่ไม่ใช่ของคุณ'}
            // return res.status(400).json({success : false  , message : 'ไม่สามารถอัพโหลดเข้าโครงการที่ไม่ใช่ของคุณ'});
        }
        if(project.projectStatus === 'Completed') throw {code : 550 , status : 400 , message : 'โครงการนี้ผ่านการตรวจสอบแล้ว ไม่สามารถอัพโหลดไฟล์เพิ่มได้'}

        // file  = req.file;
        // throw {code : 550 , status : 404 , message : 'ไม่เจอไฟล์ที่ถูกอัพโหลดเข้ามา'};
        if(!file) throw {code : 550 , status : 404 , message : 'ไม่เจอไฟล์ที่ถูกอัพโหลดเข้ามา'};
        const projectID = req.params.id;
        const maxSize =  50*1024*1024;
        //check file size
        // console.log(`file size : ${file.size}`);
        if(file.size >= maxSize){
            // fs.unlinkSync(file.path);
            throw {code : 550 , status : 400 , message : 'ไม่สามารถอัพโหลดไฟล์ได้ ไฟล์ที่เข้ามามีขนาดไฟล์เกิน 50 Mbs'};
            // return res.status(400).json({success : false , message : 'ไม่สามารถอัพโหลดไฟล์ได้ ไฟล์ที่เข้ามามีขนาดไฟล์เกิน 50 Mbs'});
        }
        //จำกัดประเภทไฟล์ที่เข้ามา 
        if(file.mimetype !== 'application/pdf'){
            // fs.unlinkSync(file.path);
            throw {code : 550 , status : 400 , message : 'สามารถอัพโหลดได้เฉพาะไฟล์ประเภท PDF เท่านั้น'};
            // return res.status(400).json({success : false , message : 'สามารถอัพโหลดได้เฉพาะไฟล์ประเภท PDF เท่านั้น'});
        }
        //Handle file name--------------------||
        // console.log(file.originalname);
        let sanitizedName = sanitizeFileName(file.originalname);
        // console.log(sanitizedName);
        let parts = sanitizedName.split('.');
        // console.log(parts.length);
        // concat เวลาเข้าไปใน ชื่อไฟล์
        let time = new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false, // ใช้เวลาแบบ 24 ชั่วโมง
        timeZone: 'Asia/Bangkok' // ตั้งค่าให้ตรงกับไทย
        }).format(new Date());
        let time2 = new Date().toISOString().split('T')[0];
        // console.log(time , time2);
        // console.log(parts);
        let time3 = time2+"T"+time;
        time3 =time3.split(' ').join('');
        // time3 = time3.join('');
        let newName = parts[0]+time3+"."+parts[1];
        newName = newName.split(':').join('_');
        // console.log(newName);
        //-----------------------------------------||

        const fileStream = fs.createReadStream(file.path);

        const fileKey = `${project.district}/${path.basename(newName)}`;
        // แบ่งเขต  = ทำละ  แต่ยังคิดๆว่าน่าจะทำแบบ
        await s3.send( // upload เข้า miniO APIs 
            new PutObjectCommand({
                Bucket : 'bucket1' ,
                Key : fileKey , 
                Body : fileStream , 
                ContentType : file.mimetype,
            })
        );        
        const fileURL = `http://127.0.0.1:9001/browser/bucket1/${fileKey}`;  // เปลี่ยน  

        // project.requireDoc = fileURL;
        // project.Doctype  = file.mimetype; // file type 
        const fileObj = {
            docFile : fileURL ,
            docType : file.mimetype
        }
        project.document.push(fileObj);
        await project.save({session});
        await session.commitTransaction();
        // fs.unlinkSync(file.path); 
        return res.status(201).json({success : true , message : 'อัพโหลดไฟล์สำเร็จ' , data : project});


    }catch(error){
        if([550,550].includes(error.code)){
            return res.status(error.status).json({success : false , message : error.message});
        }
        // console.log(error);
        await session.abortTransaction();
        // console.log(error);
        return res.status(500).json({success : false , message : 'เกิดข้อผิดพลาดในการอัพโฟลดไฟล์' , errorMessage : error});
    }finally{
        session.endSession();
        try {
            // console.log(file);
        if (file && file.path) {
            fs.unlinkSync(file.path);
        }
        } catch (e) {
            console.warn('temp file leaks:', e.message);
        }
    }
};