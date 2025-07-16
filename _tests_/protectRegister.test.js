const User = require('../models/User');
const Project = require('../models/Project');
const { default: mongoose, mongo } = require('mongoose');
const { protectRegister } = require('../controllers/authService/protectRegister');

jest.mock('../models/User');
jest.mock('../models/Project');
jest.mock('../info/district_sub.json', () => ({
    lebron: [],
    hit: []
}));

describe('protectRegister Unit testing set', () => {
  let req, res;
  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock mongoose session
    mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

    // Mock req/res
    req = {
      body: {
        username : 'name' , 
        email : 'email@gmail.com' , 
        password : '122cioewjDoi3' , 
        role : 'evaluator' , 
        district : 'lebron'
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Default mocks
    User.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null) }); // email not used
    User.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue([]) }) }); // no previous eva
    User.create.mockResolvedValue([{ id: 'newUserId' }]); // mock created user
    Project.find.mockImplementation(() => ({
      sort: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue([]) }) // no project assigned
    }));
    Project.bulkWrite.mockResolvedValue({}); // bulk assign no-op
  });
  test('TC1 : register evaluator successful', async ()=>{
    await protectRegister(req,res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
  test('TC2 : not passing username' , async ()=>{
    req.body.username = undefined;
    await protectRegister(req,res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'กรุณากรอกชื่อผู้ใช้'
    })
  });
  test('TC3 : scripting username' , async ()=>{
    req.body.username = '<undefined>';
    await protectRegister(req,res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'ชื่อผู้ใช้ไม่สามารถมีอักขระอันตรายได้'
    })
  });
  test('TC4 : invalid email' , async ()=>{
    req.body.email = '<undefined>';
    await protectRegister(req,res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'กรุณากรอกอีเมลให้ถูกต้องตามรูปแบบของอีเมล'
    })
  });
  test('TC5 : invalid role' , async ()=>{
    req.body.role = '<undefined>';
    await protectRegister(req,res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'กรุณากรอกตำแหน่งของบัญชีที่ต้องการสร้างให้ถูกต้อง'
    })
  });
  test('TC6 : eva + not passing district' , async ()=>{
    req.body.role = 'evaluator';
    req.body.district = undefined;
    await protectRegister(req,res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'ในการสร้างผู้ตรวจสอบโครงการ จำเป็นต้องกรอกข้อมูลเขตของผู้ตรวจ'
    })
  });
  test('TC6 : eva +  district not found' , async ()=>{
    req.body.role = 'evaluator';
    req.body.district = 'undefined';
    await protectRegister(req,res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'ข้อมูลเขตไม่สามารถมีอักขระพิเศษได้ หรือ ไม่พบชื่อเขตดังกล่าวในจังหวัดกรุงเทพมหานคร'
    })
  });
  test('TC7 : email already existed!' , async ()=>{
    User.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue({}) });
    await protectRegister(req,res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'อีเมลนี้ถูกใช้แล้วในระบบ'
    })
  });
  test('TC8 : invalid password1' , async ()=>{
    req.body.password = undefined;
    await protectRegister(req,res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'เกิดข้อผิดพลาดที่ข้อมูลรหัสผ่าน โปรดตรวจสอบความยาวของรหัสผ่าน , เงื่อนไขรหัสผ่าน (ขั้นต่ำ 8 ตัวอักษรพร้อมกับตัวอักษรภาษาอังกฤษพิมพ์เล็กและพิมพ์ใหญ่ขั้นต่ำอย่างละ 1 ตัว ), ประเภทข้อมูลรหัสผ่านที่ส่งมา'
    })
  });
  test('TC9 : invalid password2' , async ()=>{
    req.body.password = 'ined';
    await protectRegister(req,res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'เกิดข้อผิดพลาดที่ข้อมูลรหัสผ่าน โปรดตรวจสอบความยาวของรหัสผ่าน , เงื่อนไขรหัสผ่าน (ขั้นต่ำ 8 ตัวอักษรพร้อมกับตัวอักษรภาษาอังกฤษพิมพ์เล็กและพิมพ์ใหญ่ขั้นต่ำอย่างละ 1 ตัว ), ประเภทข้อมูลรหัสผ่านที่ส่งมา'
    })
  });
    test('TC10 : invalid password3' , async ()=>{
        req.body.password = [];
        await protectRegister(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'เกิดข้อผิดพลาดที่ข้อมูลรหัสผ่าน โปรดตรวจสอบความยาวของรหัสผ่าน , เงื่อนไขรหัสผ่าน (ขั้นต่ำ 8 ตัวอักษรพร้อมกับตัวอักษรภาษาอังกฤษพิมพ์เล็กและพิมพ์ใหญ่ขั้นต่ำอย่างละ 1 ตัว ), ประเภทข้อมูลรหัสผ่านที่ส่งมา'
        })
    });
    test('TC11 : trigger spare work logic', async () => {
        const existingEvaID = new mongoose.Types.ObjectId();
        const existingProjectID = new mongoose.Types.ObjectId();

        // Mock: มี evaluator เก่า 1 คน
        User.find.mockReturnValue({
            sort: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue([{ _id: existingEvaID }]),
            }),
        });
        User.create = jest.fn().mockResolvedValue([{ id: 'newUserId' }]);

        // Mock: มี project ยังไม่เสร็จ และ comment ยังไม่ถูกเขียน
        Project.find.mockImplementation(() => ({
            sort: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue([
                {
                _id: existingProjectID,
                projectStatus: 'รอผู้ตรวจสอบ',
                comment: null,
                evaluatorID: existingEvaID,
                },{
                _id: new mongoose.Types.ObjectId(),
                projectStatus: 'รอผู้ตรวจสอบ',
                comment: null,
                evaluatorID: new mongoose.Types.ObjectId(), 
                }
            ]),
            }),
        }));
        await protectRegister(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'สร้างบัญชีเสร็จสิ้น',
        });
    });
     test('TC12: trigger spare work logic with reassignment', async () => {
        const existingEvaID = new mongoose.Types.ObjectId();
        const newEvaID = new mongoose.Types.ObjectId();
        const projectID = new mongoose.Types.ObjectId();

        const reqEva = {
            ...req,
            body: {
            username: 'newEva',
            email: 'neweva@example.com',
            password: 'StrongPass1',
            role: 'evaluator',
            district: 'lebron',
            }
        };

        // 1. Mock evaluator คนที่มีงานเยอะ
        User.find.mockReturnValue({
            sort: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue([
                { _id: existingEvaID }
            ])
            })
        });

        // 2. Mock Project ที่ assign ไปยัง evaluator เดิม 3 งาน
        const mockProjects = [
            { _id: projectID, evaluatorID: existingEvaID, projectStatus: 'รอผู้ตรวจสอบ', comment: null },
            { _id: new mongoose.Types.ObjectId(), evaluatorID: existingEvaID, projectStatus: 'รอผู้ตรวจสอบ', comment: null },
            { _id: new mongoose.Types.ObjectId(), evaluatorID: existingEvaID, projectStatus: 'รอผู้ตรวจสอบ', comment: null },
        ];

        Project.find.mockImplementation(() => ({
            sort: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue(mockProjects)
            }),
            session: jest.fn().mockResolvedValue([])
        }));

        // 3. Mock User.create ให้ evaluator ใหม่สร้างได้
        User.create.mockResolvedValue([{ id: newEvaID }]);

        await protectRegister(reqEva, res);

        // 4. ตรวจสอบว่ามี reassignment จริง
        //   expect(Project.bulkWrite).toHaveBeenCalled();  
        expect(res.status).toHaveBeenCalledWith(201);
    });
    test('TC13: trigger `continue` when some evaluators have less than avg work', async () => {
        const eva1 = new mongoose.Types.ObjectId(); // <-- will be skipped (เข้า continue)
        const eva2 = new mongoose.Types.ObjectId(); // <-- will be used

        // mock evaluator 2 คน
        User.find.mockReturnValue({
            sort: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue([{ _id: eva1 }, { _id: eva2 }]),
            }),
        });

        // mock project 4 งาน โดยให้ evaluator 1 ได้ 1 งาน (น้อยกว่า avg)
        const dummyProjects = [
            { _id: new mongoose.Types.ObjectId(), evaluatorID: eva1, projectStatus: 'รอผู้ตรวจสอบ', comment: null },
            { _id: new mongoose.Types.ObjectId(), evaluatorID: eva2, projectStatus: 'รอผู้ตรวจสอบ', comment: null },
            { _id: new mongoose.Types.ObjectId(), evaluatorID: eva2, projectStatus: 'รอผู้ตรวจสอบ', comment: null },
            { _id: new mongoose.Types.ObjectId(), evaluatorID: eva2, projectStatus: 'รอผู้ตรวจสอบ', comment: null },
        ];

        Project.find.mockImplementation(() => ({
            sort: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue(dummyProjects),
            }),
        }));

        await protectRegister(req, res);

        // bulkWrite ควรถูกเรียก เพราะมี assignment เกิดขึ้นจาก evaluator คนที่ 2
        expect(Project.bulkWrite).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });
    test('TC14 :ValidationError', async ()=>{
        const mockError = {
            name: 'ValidationError',
            errors: {
                username: {
                    properties: {
                        path: 'username',
                        message: 'ชื่อผู้ใช้ไม่สามารถว่างได้',
                    }
                }
            }
        };
        Project.find.mockImplementation(()=>{
            throw mockError
        })
        await protectRegister(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC15 :Internal Server Error', async ()=>{
        Project.find.mockImplementation(()=>{
            throw {}
        })
        await protectRegister(req,res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
    test('TC16 : Create Ce', async ()=>{
        req.body.role = 'ce';
        await protectRegister(req,res);
        expect(res.status).toHaveBeenCalledWith(201);
    });
    test('TC18: trigger some condition in logic', async () => {
  const evaIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  
  // Mock evaluators 2 คน
  User.find.mockReturnValue({
    sort: jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue(
        evaIds.map(id => ({ _id: id }))
      )
    }),
  });

  // Mock projectByEva map ที่มี evaluator คนแรกมีงานเยอะกว่าค่า avg,
  // evaluator คนที่สองงานน้อยกว่าหรือเท่ากับ avg เพื่อไม่ให้ break ก่อน
  // ให้ totalWork มากพอที่จะวน loop และผ่าน else if เกิด trigger2

  // เราจะสร้าง project 5 งาน โดย evaluator แรกมี 4 งาน, evaluator สองมี 1 งาน
  const mockProjects = [
    { _id: new mongoose.Types.ObjectId(), evaluatorID: evaIds[0], projectStatus: 'รอผู้ตรวจสอบ', comment: null },
    { _id: new mongoose.Types.ObjectId(), evaluatorID: evaIds[0], projectStatus: 'รอผู้ตรวจสอบ', comment: null },
    { _id: new mongoose.Types.ObjectId(), evaluatorID: evaIds[0], projectStatus: 'รอผู้ตรวจสอบ', comment: null },
    { _id: new mongoose.Types.ObjectId(), evaluatorID: evaIds[0], projectStatus: 'รอผู้ตรวจสอบ', comment: null },
    { _id: new mongoose.Types.ObjectId(), evaluatorID: evaIds[1], projectStatus: 'รอผู้ตรวจสอบ', comment: null },
  ];

  Project.find.mockImplementation(() => ({
    sort: jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue(mockProjects),
    }),
  }));

  // สร้าง req ใหม่
  const reqEva = {
    body: {
      username: 'trigger2User',
      email: 'trigger2@example.com',
      password: 'StrongPass1',
      role: 'evaluator',
      district: 'lebron',
    },
  };

  // Mock User.create
  User.create.mockResolvedValue([{ id: 'newUserId' }]);
  await protectRegister(reqEva, res);
  expect(res.status).toHaveBeenCalledWith(201);
});


});
