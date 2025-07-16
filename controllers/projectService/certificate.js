const Project = require('../../models/Project');
const Unit = require('../../models/Unit');
const Risk = require('../../models/Risk');
const User = require('../../models/User');
const {PutObjectCommand ,GetObjectCommand , HeadObjectCommand , HeadBucketCommand , CreateBucketCommand } = require('@aws-sdk/client-s3');
const {s3 , s3Public } = require('../../middleware/uploadConfig');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { default: mongoose, model } = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
// const puppeteer = require('puppeteer');
const  generateRiskCertificatePDF = require('../../utils/buildCertificate');
const fileExists = require('../../utils/checkFileExisted');
// path : /api/v1/project/:id/certificate
exports.createCertificate = async (req,res,next)=>{
    try{
        // console.log('here');
        req.params = mongoSanitize.sanitize(req.params);
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({success : false , message : 'ID ทางparams ผิด format ObjectId'});
        let project = await Project.findById(req.params.id);
        if(!project) return res.status(404).json({success : false ,message : 'ไม่พบโครงการดังกล่าว'});
        if(project.userID.toString() !== req.user.id && req.user.role === 'user') return res.status(400).json({success : false , message : 'คุณไม่สามารถจัดการโครงการที่ไม่ใช่ของคุณได้'});
        if(project.evaluatorID.toString() !== req.user.id && req.user.role === 'evaluator') return res.status(400).json({success : false , message : 'คุณไม่สามารถตรวจสอบใบรับรองของโครงการที่ไม่ใช่ขอบเขตการรับผิดชอบของคุณได้'});
        let certificate;
        //Make Certificate
        if(project.projectStatus === 'Completed'){ //project.projectStatus === 'Completed'
                let command = new GetObjectCommand({
                Bucket: 'bucket1',
                Key: `certificate/${project.projectNum}.pdf`,
                ResponseContentDisposition: 'attachment',
                });
                let signedUrl = await getSignedUrl(s3Public, command, { expiresIn: 3600 });
                certificate = signedUrl;
            console.log(certificate);
            return res.status(200).json({success : true , certificate : certificate})
        
        }else {
            return res.status(400).json({success : false , message : 'โครงการนี้ยังไม่เสร็จสมบูรณ์ ยังไม่สามารถออกใบรับรองได้'});
        }
    }catch(error){
        console.log(error);
        return res.status(400).json({success : false , message : 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์'});
    }
    
}

