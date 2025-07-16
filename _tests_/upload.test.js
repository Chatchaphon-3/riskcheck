const Project = require('../models/Project');
const path = require('path');
const fs = require('fs');
const { default: mongoose} = require('mongoose');
const {uploadDoc} = require('../controllers/projectService/upload')

jest.mock('../models/Project');
jest.mock('path', () => {
  const actualPath = jest.requireActual('path');
  return {
    ...actualPath,
    basename: jest.fn((p) => p), // mock ให้คืนค่ากลับเหมือน input
  };
});
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    createReadStream: jest.fn(), // ป้องกัน error read file
    unlinkSync: jest.fn(),       // ป้องกัน error unlink file
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      unlink: jest.fn(),
    }
  };
});

jest.mock('../middleware/uploadConfig', () => ({
  s3: {
    send: jest.fn().mockResolvedValue({})  // จำลองว่า upload สำเร็จ
  }
}));


describe('upload document unit testing set' , ()=>{
    let req,res;
    let userid = new mongoose.Types.ObjectId();
    let projectid = new mongoose.Types.ObjectId();
    let mockProject;
    const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
    };
    beforeEach(()=>{
        jest.clearAllMocks();
        mongoose.startSession = jest.fn().mockResolvedValue(mockSession);
        req = {
        params : {
            id : projectid.toString()
        },
        user : {
            id : userid.toString() , 
            role : 'user'
        },
        file: {
            size : 200 , 
            mimetype : 'application/pdf',
            originalname : 'mockFile.pdf',
            path: 'mock/path/to/file.pdf'
        }
    };
    res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
        mockProject = {
            _id : projectid ,
            userID : userid , 
            projectStatus : 'รอผู้ตรวจสอบ' ,
            district : 'บางพลัด' ,
            document : [] , 
        };
        mockProject.save = jest.fn();
        Project.findById.mockReturnValue({
        session : ()=> mockProject
    });
    });
    test('TC1 : upload successful ' , async ()=>{
        await uploadDoc(req,res);
        expect(res.status).toHaveBeenCalledWith(201);
    });
    test('TC2 : params id invalid' , async ()=>{
        req.params.id = 'ieveove';
        await uploadDoc(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false,  
            message : 'รูปแบบ ID ที่ส่งเข้ามาใน params ไม่ถูกต้องตาม format'
        })
    });
    test('TC3 : not our project(user)' , async ()=>{
        req.user.id = new mongoose.Types.ObjectId().toString();
        await uploadDoc(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false,  
            message : 'ไม่สามารถอัพโหลดเข้าโครงการที่ไม่ใช่ของคุณ'
        })
    });
    test('TC4 : project already finished ' , async ()=>{
        mockProject.projectStatus = 'Completed';
        await uploadDoc(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'โครงการนี้ผ่านการตรวจสอบแล้ว ไม่สามารถอัพโหลดไฟล์เพิ่มได้'
        })
    });
    test('TC5 : file size bigger than maximum (50mb) ' , async ()=>{
        req.file.size = ( 50*1024*1024)+1;
        await uploadDoc(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ไม่สามารถอัพโหลดไฟล์ได้ ไฟล์ที่เข้ามามีขนาดไฟล์เกิน 50 Mbs'
        })
    });
    test('TC5 : file type invalid ' , async ()=>{
        req.file.mimetype = 'application/jpg';
        await uploadDoc(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'สามารถอัพโหลดได้เฉพาะไฟล์ประเภท PDF เท่านั้น'
        })
    });
    test('TC6 : internal server error' , async ()=>{
        Project.findById.mockImplementation(()=>{
            throw {error : true};
        })
        await uploadDoc(req,res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : false , 
            message : 'เกิดข้อผิดพลาดในการอัพโฟลดไฟล์'
        }))
    });
    test('TC7 : file buffer stuck in server folder /uploads' , async ()=>{
        const fs = require('fs');
        fs.unlinkSync.mockImplementationOnce(() => {
            throw new Error('mock unlink error test case 7');
        });
        await uploadDoc(req,res);
        expect(res.status).toHaveBeenCalledWith(201);
    });
    test('TC8 : project not found  ' , async ()=>{
        Project.findById.mockReturnValue({
            session : ()=> undefined
        });
        await uploadDoc(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ไม่พบข้อมูลของโครงการดังกล่าว'
        })
    });
    test('TC9 : file not found  ' , async ()=>{
        req.file = undefined;
        await uploadDoc(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ไม่เจอไฟล์ที่ถูกอัพโหลดเข้ามา'
        })
    });
});
