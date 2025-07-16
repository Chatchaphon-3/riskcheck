const { getProject } = require('../controllers/projectService/getSingle');
const Project = require('../models/Project');
const Unit = require('../models/Unit');
const Risk = require('../models/Risk');
const User = require('../models/User');
const mongoose = require('mongoose');

jest.mock('../models/Project');
jest.mock('../models/Unit');
jest.mock('../models/Risk');

describe('getProject - Unit testing set' , ()=>{
    let req , res;
    beforeEach(()=>{
        jest.clearAllMocks();
        let makeId0 = new mongoose.Types.ObjectId();
        let makeId = makeId0.toString();
        req = {
            params : {id :makeId} , 
            user : {role : 'user' , id : makeId , district : 'lebron'}
        };
        res = {
            status : jest.fn().mockReturnThis() , 
            json : jest.fn() ,
        };
        Project.findById.mockResolvedValue({userID : makeId0 , document : []});
        Unit.findOne.mockResolvedValue({existed : true});
        Risk.findOne.mockResolvedValue({existed : true});
    });


    test('TC1 : Invalid id format(Not mongoose.Types.ObjectID) | EXPECT : 400' , async ()=>{
        req.params.id = 'invalidIdFormat';
        await getProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'รูปแบบ id ที่ส่งเข้ามาผิด Format'
        });

    });
    test('TC2 : No project existed : | EXPECT : 404' , async ()=>{
        Project.findById.mockResolvedValue(undefined);
        await getProject(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ไม่พบข้อมูลโครงการดังกล่าวในระบบ'
        });
    });
    test('TC3 : User try to see another\'s project | EXPECT : 403' , async ()=>{
        Project.findById.mockResolvedValue({userID : new mongoose.Types.ObjectId()});
        await getProject(req,res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success : false ,
            message : 'คุณสามารถดูได้เฉพาะข้อมูลโครงการที่คุณเป็นเจ้าของเท่านั้น'
        });
    });
    test('TC4 : Evaluator try to see project that not in their district | EXPECT : 403' , async ()=>{
        let tempID = new mongoose.Types.ObjectId();
        req.user.role = 'evaluator';
        // req.user.id = tempID.toString();
        Project.findById.mockResolvedValue({userID : tempID , district : 'one'});
        req.user.district = null;
        await getProject(req,res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success : false ,
            message : 'คุณสามารถดูเฉพาะข้อมูลของโครงการที่อยู่ในเขตที่คุณรับผิดชอบได้เท่านั้น'
        });
    });
    test('TC5 : Evaluator try to see project that is not their assigned work | EXPECT : 403' , async ()=>{
        let tempID = new mongoose.Types.ObjectId();
        req.user.role = 'evaluator';
        req.user.id = new mongoose.Types.ObjectId().toString();
        Project.findById.mockResolvedValue({userID : tempID , district : 'one' , evaluatorID : new mongoose.Types.ObjectId()});
        req.user.district = 'one';
        await getProject(req,res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success : false ,
            message : 'คุณสามารถดูได้เฉพาะข้อมูลโครงการที่คุณรับผิดชอบได้เท่านั้น'
        });
    });
    test('TC6 : user see their own project + 0 document | HAPPY PATH(200)' , async ()=>{
        await getProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('TC7 : user see their own project > 1 document | HAPPY PATH(200)' , async ()=>{
        let id = new mongoose.Types.ObjectId();
        req.user.id = id.toString();
        Project.findById.mockResolvedValue({userID : id , document : [{docFile : 'http://127.0.0.1:9001/browser/bucket1/บางพลัด/3856282025-07-07T18_22_52.pdf'}]});
        await getProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        // expect(res.json).toHaveBeenCalledWith({
        //     success : false ,
        //     message : 'คุณสามารถดูได้เฉพาะข้อมูลโครงการที่คุณรับผิดชอบได้เท่านั้น'
        // });
    });
    test('TC8 :evaluator see project with riskScore' , async ()=>{
        let id = new mongoose.Types.ObjectId();
        let evaID = new mongoose.Types.ObjectId();
        req.user.role = 'evaluator';
        req.user.district = 'lebron';
        req.user.id = evaID.toString();
        Project.findById.mockResolvedValue({userID : id , evaluatorID : evaID , document : [{docFile : 'http://127.0.0.1:9001/browser/bucket1/บางพลัด/3856282025-07-07T18_22_52.pdf'}] , district : 'lebron'});
            Risk.findOne.mockResolvedValue({
                floodRisk: {
                    phaseOne: {
                        rcp2_6: { data: 0.1, freq: 3 },    // น่าจะออก "ต่ำ" (freq ใหญ่ ความเสี่ยงลด)
                        rcp4_5: { data: 0.45, freq: 2 },   // น่าจะออก "ปานกลาง"
                        rcp6_0: { data: 1.4, freq: 1 }     // น่าจะออก "สูง"
                    },
                    phaseTwo: {
                        rcp2_6: { data: 0.1, freq: 3 },
                        rcp4_5: { data: 0.45, freq: 2 },
                        rcp6_0: { data: 1.4, freq: 1 }
                    }
                    },
                windRisk: {
                    phaseOne: {
                        rcp2_6: { data: 50, freq: 3 },     // น่าจะออก "ต่ำ"
                        rcp4_5: { data: 119, freq: 2 },    // น่าจะออก "ปานกลาง"
                        rcp6_0: { data: 160, freq: 1 }     // น่าจะออก "สูง"
                    },
                    phaseTwo: {
                        rcp2_6: { data: 50, freq: 3 },
                        rcp4_5: { data: 119, freq: 2 },
                        rcp6_0: { data: 160, freq: 1 }
                    }
                    },
                    modelRef: "someModel"

        });

        await getProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                riskScore: {
                rcp2_6: {
                    floodScore: 'ต่ำ',
                    windScore: 'ต่ำ',
                },
                rcp4_5: {
                    floodScore: 'ปานกลาง',
                    windScore: 'สูง',
                },
                rcp6_0: {
                    floodScore: 'ไม่ถูกต้อง',
                    windScore: 'ไม่ถูกต้อง',
                },
                },
            })
        );

    });
    test('TC9 :ce see project with riskScore' , async ()=>{
        let id = new mongoose.Types.ObjectId();
        let evaID = new mongoose.Types.ObjectId();
        req.user.role = 'ce';
        req.user.district = 'lebron';
        req.user.id = evaID.toString();
        Project.findById.mockResolvedValue({userID : id , evaluatorID : evaID , document : [] , district : 'lebron'});
            Risk.findOne.mockResolvedValue({
                floodRisk: {
                    phaseOne: {
                    rcp2_6: { data: 0.2, freq: 0.1 },
                    rcp4_5: { data: 0.3, freq: 0.2 },
                    rcp6_0: { data: 0.6, freq: 0.4 }
                    },
                    phaseTwo: {
                    rcp2_6: { data: 0.5, freq: 0.6 },
                    rcp4_5: { data: 0.7, freq: 0.3 },
                    rcp6_0: { data: 0.8, freq: 0.9 }
                    }
                },
                windRisk: {
                    phaseOne: {
                    rcp2_6: { data: 0.1, freq: 0.2 },
                    rcp4_5: { data: 0.4, freq: 0.5 },
                    rcp6_0: { data: 0.9, freq: 0.8 }
                    },
                    phaseTwo: {
                    rcp2_6: { data: 0.3, freq: 0.6 },
                    rcp4_5: { data: 0.6, freq: 0.7 },
                    rcp6_0: { data: 0.8, freq: 0.5 }
                    }
                },
                modelRef: "someModel"
                });

        await getProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                riskScore: {
                rcp2_6: {
                    floodScore: 'ไม่ถูกต้อง',
                    windScore: 'ไม่ถูกต้อง',
                },
                rcp4_5: {
                    floodScore: 'ไม่ถูกต้อง',
                    windScore: 'สูง',
                },
                rcp6_0: {
                    floodScore: 'ไม่ถูกต้อง',
                    windScore: 'สูง',
                },
                },
            })
        ); 
    });
    test('TC10 : unexpected error from Unit.findOne → EXPECT : 500 server error', async () => {
        Unit.findOne.mockImplementation(() => {
            throw new Error("mocked unexpected error");
        });

        await getProject(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์',
                errors: expect.any(Error),
            })
        );
    });
    // TC11: ทุกตัวต่ำ
test('TC11 : All low riskScore', async () => {
  // เตรียม req/res เหมือน TC8
  let id = new mongoose.Types.ObjectId();
  let evaID = new mongoose.Types.ObjectId();
  req.user.role = 'evaluator'; req.user.district = 'lebron'; req.user.id = evaID.toString();
  Project.findById.mockResolvedValue({ userID: id, evaluatorID: evaID, document: [{ docFile: 'doc.pdf' }], district: 'lebron' });
  Risk.findOne.mockResolvedValue({
    floodRisk: {
      phaseOne: { rcp2_6: { data: 0.1, freq: 5 }, rcp4_5: { data: 0.1, freq: 5 }, rcp6_0: { data: 0.1, freq: 5 } },
      phaseTwo: { rcp2_6: { data: 0.1, freq: 5 }, rcp4_5: { data: 0.1, freq: 5 }, rcp6_0: { data: 0.1, freq: 5 } },
    },
    windRisk: {
      phaseOne: { rcp2_6: { data: 50, freq: 5 }, rcp4_5: { data: 60, freq: 5 }, rcp6_0: { data: 70, freq: 5 } },
      phaseTwo: { rcp2_6: { data: 50, freq: 5 }, rcp4_5: { data: 60, freq: 5 }, rcp6_0: { data: 70, freq: 5 } },
    },
    modelRef: 'm'
  });
  await getProject(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    riskScore: {
      rcp2_6: { floodScore: 'ต่ำ', windScore: 'ต่ำ' },
      rcp4_5: { floodScore: 'ต่ำ', windScore: 'ต่ำ' },
      rcp6_0: { floodScore: 'ต่ำ', windScore: 'ต่ำ' },
    }
  }));
});

// TC12: ทุกตัวปานกลาง
test('TC12 : All medium riskScore', async () => {
  let id = new mongoose.Types.ObjectId();
  let evaID = new mongoose.Types.ObjectId();
  req.user.role = 'evaluator'; req.user.district = 'lebron'; req.user.id = evaID.toString();
  Project.findById.mockResolvedValue({ userID: id, evaluatorID: evaID, document: [{ docFile: 'doc.pdf' }], district: 'lebron' });
  Risk.findOne.mockResolvedValue({
    floodRisk: {
      phaseOne: { rcp2_6: { data: 0.4, freq: 3 }, rcp4_5: { data: 0.4, freq: 3 }, rcp6_0: { data: 0.4, freq: 3 } },
      phaseTwo: { rcp2_6: { data: 0.4, freq: 3 }, rcp4_5: { data: 0.4, freq: 3 }, rcp6_0: { data: 0.4, freq: 3 } },
    },
    windRisk: {
      phaseOne: { rcp2_6: { data: 90, freq: 3 }, rcp4_5: { data: 90, freq: 3 }, rcp6_0: { data: 90, freq: 3 } },
      phaseTwo: { rcp2_6: { data: 90, freq: 3 }, rcp4_5: { data: 90, freq: 3 }, rcp6_0: { data: 90, freq: 3 } },
    },
    modelRef: 'm'
  });
  await getProject(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    riskScore: {
      rcp2_6: { floodScore: 'ปานกลาง', windScore: 'ปานกลาง' },
      rcp4_5: { floodScore: 'ปานกลาง', windScore: 'ปานกลาง' },
      rcp6_0: { floodScore: 'ปานกลาง', windScore: 'ปานกลาง' },
    }
  }));
});

// TC13: ทุกตัวสูง
test('TC13 : All high riskScore', async () => {
  let id = new mongoose.Types.ObjectId();
  let evaID = new mongoose.Types.ObjectId();
  req.user.role = 'evaluator'; req.user.district = 'lebron'; req.user.id = evaID.toString();
  Project.findById.mockResolvedValue({ userID: id, evaluatorID: evaID, document: [{ docFile: 'doc.pdf' }], district: 'lebron' });
  Risk.findOne.mockResolvedValue({
    floodRisk: {
      phaseOne: { rcp2_6: { data: 1.2, freq: 2 }, rcp4_5: { data: 1.2, freq: 2 }, rcp6_0: { data: 1.2, freq: 2 } },
      phaseTwo: { rcp2_6: { data: 1.2, freq: 2 }, rcp4_5: { data: 1.2, freq: 2 }, rcp6_0: { data: 1.2, freq: 2 } },
    },
    windRisk: {
      phaseOne: { rcp2_6: { data: 130, freq: 2 }, rcp4_5: { data: 130, freq: 2 }, rcp6_0: { data: 130, freq: 2 } },
      phaseTwo: { rcp2_6: { data: 130, freq: 2 }, rcp4_5: { data: 130, freq: 2 }, rcp6_0: { data: 130, freq: 2 } },
    },
    modelRef: 'm'
  });
  await getProject(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    riskScore: {
      rcp2_6: { floodScore: 'ไม่ถูกต้อง', windScore: 'สูง' },
      rcp4_5: { floodScore: 'ไม่ถูกต้อง', windScore: 'สูง' },
      rcp6_0: { floodScore: 'ไม่ถูกต้อง', windScore: 'สูง' },
    }
  }));
});
test('TC13.5 : All high riskScore', async () => {
  let id = new mongoose.Types.ObjectId();
  let evaID = new mongoose.Types.ObjectId();
  req.user.role = 'evaluator'; req.user.district = 'lebron'; req.user.id = evaID.toString();
  Project.findById.mockResolvedValue({ userID: id, evaluatorID: evaID, document: [{ docFile: 'doc.pdf' }], district: 'lebron' });
  Risk.findOne.mockResolvedValue({
    floodRisk: {
      phaseOne: { rcp2_6: { data: 0.5, freq: 1 }, rcp4_5: { data: 0.1, freq: 1 }, rcp6_0: { data: 0.1, freq: 1 } },
      phaseTwo: { rcp2_6: { data: 0.1, freq: 1 }, rcp4_5: { data: 0.1, freq: 1 }, rcp6_0: { data: 0.1, freq: 1 } },
    },
    windRisk: {
      phaseOne: { rcp2_6: { data: 130, freq: 2 }, rcp4_5: { data: 130, freq: 2 }, rcp6_0: { data: 130, freq: 2 } },
      phaseTwo: { rcp2_6: { data: 130, freq: 2 }, rcp4_5: { data: 130, freq: 2 }, rcp6_0: { data: 130, freq: 2 } },
    },
    modelRef: 'm'
  });
  await getProject(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    riskScore: {
      rcp2_6: { floodScore: 'สูง', windScore: 'สูง' },
      rcp4_5: { floodScore: 'ปานกลาง', windScore: 'สูง' },
      rcp6_0: { floodScore: 'ปานกลาง', windScore: 'สูง' },
    }
  }));
});

// TC14: ทุกตัวไม่ถูกต้อง
test('TC14 : All invalid riskScore', async () => {
  let id = new mongoose.Types.ObjectId();
  let evaID = new mongoose.Types.ObjectId();
  req.user.role = 'evaluator'; req.user.district = 'lebron'; req.user.id = evaID.toString();
  Project.findById.mockResolvedValue({ userID: id, evaluatorID: evaID, document: [{ docFile: 'doc.pdf' }], district: 'lebron' });
  Risk.findOne.mockResolvedValue({
    floodRisk: {
      phaseOne: { rcp2_6: { data: 2.5, freq: 0.1 }, rcp4_5: { data: 2.5, freq: 0.1 }, rcp6_0: { data: 2.5, freq: 0.1 } },
      phaseTwo: { rcp2_6: { data: 2.5, freq: 0.1 }, rcp4_5: { data: 2.5, freq: 0.1 }, rcp6_0: { data: 2.5, freq: 0.1 } },
    },
    windRisk: {
      phaseOne: { rcp2_6: { data: 200, freq: 0.1 }, rcp4_5: { data: 200, freq: 0.1 }, rcp6_0: { data: 200, freq: 0.1 } },
      phaseTwo: { rcp2_6: { data: 200, freq: 0.1 }, rcp4_5: { data: 200, freq: 0.1 }, rcp6_0: { data: 200, freq: 0.1 } },
    },
    modelRef: 'm'
  });
  await getProject(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    riskScore: {
      rcp2_6: { floodScore: 'ไม่ถูกต้อง', windScore: 'ไม่ถูกต้อง' },
      rcp4_5: { floodScore: 'ไม่ถูกต้อง', windScore: 'ไม่ถูกต้อง' },
      rcp6_0: { floodScore: 'ไม่ถูกต้อง', windScore: 'ไม่ถูกต้อง' },
    }
  }));
});

    
});
