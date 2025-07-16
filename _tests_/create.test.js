const Project = require('../models/Project');
const Unit = require('../models/Unit');
const Risk = require('../models/Risk');
const User = require('../models/User');
const { default: mongoose } = require('mongoose');
const genNum = require('../utils/generateNumber');
const { createProject } = require('../controllers/projectService/create')

jest.mock('../models/Project');
jest.mock('../models/Unit');
jest.mock('../models/Risk');
jest.mock('../models/User');
jest.mock('../utils/generateNumber');

genNum.mockResolvedValue(887332);

describe('create project with unit and risk - unit testing set', () => {
  let req, res;
  let userid = new mongoose.Types.ObjectId();
  let evaluatorid = new mongoose.Types.ObjectId();
  let projectid = new mongoose.Types.ObjectId();

  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

    req = {
      user: {
        id: userid.toString()
      },
      body: {
        projectName: 'Mock name',
        district: 'one',
        subDistrict: 'onePointone',
        latitude: 30.32998,
        longtitude: 44.22998812,
        projectNum: 887332,
        projectStatus: undefined,
        projectID: projectid,
        totalUnit: undefined,
        units: [
          { buildingType: "ห้องแถว1", buildingDetail: "อาคารพาณิชย์ 2 ชั้น" },
          { buildingType: "ห้องแถว2", buildingDetail: "อาคารพาณิชย์ 2 ชั้น" }
        ],
        floodRisk: {
          phaseOne: {
            rcp2_6: { data: 9, freq: 5 },
            rcp4_5: { data: 20, freq: 10 },
            rcp6_0: { data: 15, freq: 7 }
          },
          phaseTwo: {
            rcp2_6: { data: 12, freq: 6 },
            rcp4_5: { data: 22, freq: 11 },
            rcp6_0: { data: 18, freq: 8 }
          }
        },
        windRisk: {
          phaseOne: {
            rcp2_6: { data: 150, freq: 3 },
            rcp4_5: { data: 100, freq: 4 },
            rcp6_0: { data: 112, freq: 2 }
          },
          phaseTwo: {
            rcp2_6: { data: 159, freq: 3 },
            rcp4_5: { data: 109, freq: 5 },
            rcp6_0: { data: 119, freq: 6 }
          }
        },
        modelRef: 'Model A',
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    // mock return ของ create
    Project.create.mockResolvedValue([{
      _id: projectid,
      ...req.body,
      userID: userid,
      evaluatorID: evaluatorid,
      comment: null,
      document: []
    }]);

    Unit.create.mockResolvedValue([{
      projectID: projectid,
      totalUnit: req.body.units.length,
      units: req.body.units
    }]);

    Risk.create.mockResolvedValue([{
      projectID: projectid,
      floodRisk: req.body.floodRisk,
      windRisk: req.body.windRisk,
      modelRef: req.body.modelRef
    }]);

    // mock chain findOne().sort().session()
    User.findOne.mockImplementation(() => ({
      sort: () => ({
        session: () => Promise.resolve({
          id: evaluatorid,
          workState: new Date(),
          district: req.body.district,
          role: 'evaluator'
        })
      })
    }));

    User.findByIdAndUpdate.mockResolvedValue({});
  });

  // ใส่ test จริง ๆ ได้เลยหลังจากนี้ เช่น
  // test('should create project successfully', async () => { ... })
   test('TC1 : user casually edit project : 201' , async ()=>{
        req.body.projectNum = undefined;
        await createProject(req ,res);
        expect(res.status).toHaveBeenCalledWith(201);
    });
    test('TC2 : error -> not have projectName' , async ()=>{
        req.body.projectName = undefined;
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ชื่อโครงการไม่สามารถมีอักขระพิเศษหรือ ไม่สามารถถูกเว้นว่างได้'
        })
    });
    test('TC3 : error -> not have district' , async ()=>{
        req.body.district = undefined;
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ชื่อเขตไม่สามารถมีอักขระพิเศษ หรือ ไม่สามารถถูกเว้นว่างได้'
        })
    });
    test('TC4 : error -> not have subdistrict' , async ()=>{
        req.body.subDistrict = undefined;
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ชื่อแขวงไม่สามารถมีอักขระพิเศษ หรือ ไม่สามารถถูกเว้นว่างได้'
        })
    });
    test('TC4 : error -> lattitude not a number' , async ()=>{
        req.body.latitude = 'string';
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ข้อมูลละติจูด / ลองจิจูด ต้องเป็นข้อมูลประเภทตัวเลข'
        })
    });
    test('TC5 : error -> evaluator not avaliable' , async ()=>{
        User.findOne.mockImplementation(() => ({
            sort: () => ({
                session: () => Promise.resolve(undefined)
            })
        }));
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'เกิดข้อผิดพลาด ไม่พบผู้ตรวจสอบในเขตดังกล่าวขออภัยในความไม่สะดวก'
        })
    });
    test('TC6 : error -> unit not found' , async ()=>{
        req.body.units = undefined;
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ไม่พบข้อมูลยูนิตที่ต้องการสร้าง'
        })
    });
    test('TC7 : error -> unit not found' , async ()=>{
        req.body.units = {};
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'รูปแบบข้อมูลของยูนิตที่ส่งเข้ามา ไม่ตรงตามรูปแบบที่กำหนด'
        })
    });
    test('TC8 : error -> floodRisk not found' , async ()=>{
        req.body.floodRisk = {};
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ข้อมูลความเสี่ยงทางด้านน้ำไม่สมบูรณ์ หรือ ข้อมูลบางฟิลด์ขาดหายไป'
        })
    });
    test('TC9 : error -> windRisk not found' , async ()=>{
        req.body.windRisk = {};
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ข้อมูลความเสี่ยงทางด้านลมไม่สมบูรณ์ หรือ ข้อมูลบางฟิลด์ขาดหายไป'
        })
    });
    test('TC10 : error -> modelRef not found' , async ()=>{
        req.body.modelRef = undefined;
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'จำเป็นต้องกรอกชื่อของโมเดลที่อ้างอิงสำหรับข้อมูลความเสี่ยง'
        })
    });
    test('TC11 : error -> lattitude , longtitude dup' , async ()=>{
        Project.create.mockImplementation(()=>{
            throw {code : 11000};
        });
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ข้อมูลบางฟิลด์ซ้ำกับข้อมูลที่มีอยู่แล้วในระบบ โปรดตรวจสอบข้อมูล ละติจูด ลองจิจูด'
        })
    });
    test('TC12 : error -> ValidationError', async () => {
        Project.create.mockImplementation(() => { throw { name: 'ValidationError', errors: {
            projectName: { properties: { path: 'projectName', message: 'Project name is required' } },
            startDate: { properties: { path: 'startDate', message: 'Start date must be a valid date' } }
        }}});
  
        await createProject(req, res);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'สร้างโครงการไม่สำเร็จ',
            errors: [
            { field: 'projectName', message: 'Project name is required' },
            { field: 'startDate', message: 'Start date must be a valid date' }
            ]
        });
    });
    test('TC13 : error -> riskData missing some rcp ' , async ()=>{
        req.body.floodRisk.phaseOne.rcp2_6 = undefined;
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ขาดข้อมูลในบางฟิลด์ในข้อมูลความเสี่ยง'
        })
    });
    test('TC14 : error -> riskData data < 0' , async ()=>{
        req.body.floodRisk.phaseOne.rcp2_6.data = -1;
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ข้อมูลบางฟิลด์ไม่ถูกต้อง โปรดตรวจสอบขอบเขตของข้อมูล หรือ ประเภทข้อมูล'
        })
    });
    test('TC15 : error -> riskData freq < 0 ' , async ()=>{
        req.body.floodRisk.phaseOne.rcp2_6.freq = -100;
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ข้อมูลบางฟิลด์ไม่ถูกต้อง โปรดตรวจสอบขอบเขตของข้อมูล หรือ ประเภทข้อมูล'
        })
    });
    test('TC16 : error -> db srashed' , async ()=>{
        Project.create.mockImplementation(()=>{
            throw {code : 12000};
        });
        await createProject(req,res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'เกิดข้อผิดพลาดทางฝั่งเซิร์ฟเวอร์'
        })
    });

});
