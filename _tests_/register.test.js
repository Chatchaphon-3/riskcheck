const { register } = require('../controllers/authService/register');
const User = require('../models/User');
const { default: mongoose } = require('mongoose');

jest.mock('../models/User');

describe('Register unit testing set' , ()=>{
    let req,res;
    let mockExistingUser = null;
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
        body : {
            username : 'user1' , 
            email : 'user1@gmail.com' , 
            password : '12345678aA' 
        },
        user : {
            role : 'user'
        }
    };
    res = {
        status : jest.fn().mockReturnThis() , 
        json : jest.fn()
    };
    User.findOne.mockReturnValue({
        session : () => mockExistingUser
    });
    User.create.mockResolvedValue([{}]);
  });
  test('create user account successful' , async ()=>{
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
  test('email already used in system' , async ()=>{
    mockExistingUser = { _id: '1', email: 'user1@gmail.com' };
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'อีเมลนี้ถูกใช้แล้วในระบบ'
    })
  });
  test('not found username' , async ()=>{
    mockExistingUser = undefined;
    req.body.username = undefined;
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'กรุญากรอกชื่อผู้ใช้'
    })
  });
  test('scripting  username' , async ()=>{
    req.body.username = '<script>';
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'ชื่อผู้ใช้ไม่สามารถมีอักขระอันตรายได้'
    })
  });
  test('invalid email' , async ()=>{
    req.body.email = '<script>';
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'กรุณากรอกอีเมลให้ถูกต้องตามรูปแบบของอีเมล'
    })
  });
  test('invalid password' , async ()=>{
    req.body.password = '12dcqc';
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        success : false , 
        message : 'รหัสผ่านควรมีจำนวนขั้นต่ำ 8 ตัวอักษร / ประเภทข้อมูลรหัสผ่านไม่ถูกต้อง / ไม่พบรหัสผ่าน'
    })
  });
  test(' validation Error' , async ()=>{
    User.create.mockImplementation(()=>{
        throw { name: 'ValidationError', errors: { email: { properties: { path: 'email', message: 'อีเมลไม่ถูกต้อง' } } } }
    });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test(' Internal Server Error' , async ()=>{
    User.create.mockImplementation(()=>{
        throw { error : true }
    });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
