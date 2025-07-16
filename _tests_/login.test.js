const { login } = require('../controllers/authService/login');
const User = require('../models/User');
const { default: mongoose } = require('mongoose');
jest.mock('../models/User');

describe('Login unit testing set' , ()=>{
    let req , res;
    let mockUser;
    beforeEach(()=>{
        jest.clearAllMocks();
        mockUser = {
            checkPassword: jest.fn().mockResolvedValue(true),
            jwtToken: jest.fn().mockReturnValue('mockToken'),
            id: '123',
            username: 'MockUser',
            email: 'wow@gmail.com',
            role: 'user'
        };
        req = {
            body : {
                email : 'wow@gmail.com' , 
                password : '131283183aA'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            cookie: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        User.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser)
        });
    });
    test('TC1 : login successful' , async()=>{
        await login(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('TC2 : email inalid' , async()=>{
        req.body.email = 'opvcekov';
        await login(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC3 : undefined pasword' , async()=>{
        req.body.password = undefined;
        await login(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC4 : user not found' , async()=>{
        User.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(undefined)
        });
        await login(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
    test('TC5 : incorrect password' , async()=>{
        mockUser.checkPassword = jest.fn().mockResolvedValue(false);
        await login(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC6 : internal server error' , async()=>{
        User.findOne.mockImplementation(()=>{
            throw {error : true};
        })
        await login(req,res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
    test('TC7: login success in production mode adds secure cookie', async () => {
        process.env.NODE_ENV = 'production';
        process.env.JWT_COOKIE_EXPIRE = '1'; // mock ค่าให้ครบ

        await login(req, res);

        expect(res.cookie).toHaveBeenCalledWith(
            'token',
            'mockToken',
            expect.objectContaining({
                secure: true,
                httpOnly: true,
            })
        );

        // reset env กลับหลัง test
        process.env.NODE_ENV = 'test';
    });
    test('TC8: sendTokenResponse throws error', async () => {
        mockUser.jwtToken = jest.fn(() => {
            throw new Error('token generation error');
        });

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'fail' });
    });

});

