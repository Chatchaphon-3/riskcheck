const User = require('../models/User');
const { default: mongoose } = require('mongoose');
const { MyProfile } = require('../controllers/authService/myProfile');

jest.mock('../models/User');

describe('MyProfile unit testing set', () => {
    let req, res;
    const userid = new mongoose.Types.ObjectId();

    beforeEach(() => {
        req = {
            user: {
                id: userid.toString(),
                role: 'user'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            then: undefined,
        };

        const promiseQuery = new Promise((resolve) => {
            resolve({}); 
        });

        User.findById.mockReturnValue(Object.assign(promiseQuery, mockQuery));
    });

    test('TC1: MyProfile success', async () => {
        await MyProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'ข้อมูลบัญชี',
            data: {}
        });
    });
    test('TC2: Error : not login before use myProfile', async () => {
        req.user = undefined;
        await MyProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'กรุณาเข้าสู่ระบบก่อนการดำเนินการ'
        });
    });
    test('TC3: Error : id format invalid', async () => {
        req.user.id = ['oi'];
        await MyProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'รูปแบบไอดีที่ส่งเข้ามาในระบบ ไม่ถูกต้อง'
        });
    });
    test('TC4: MyProfile success(EVA)', async () => {
        req.user.role = 'evaluator';
        await MyProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'ข้อมูลบัญชี',
            data: {}
        });
    });
    test('TC5: Internal Server Error', async () => {
        User.findById.mockImplementation(()=>{
            throw { time : false}
        });
        await MyProfile(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'
        });
    });
});
