const User = require('../models/User');
const Project = require('../models/Project');
const Risk = require('../models/Risk');
const Unit = require('../models/Unit');
const { default: mongoose } = require('mongoose');
const { deleteAccount } = require('../controllers/authService/deleteAccount');

jest.mock('../models/Project');
jest.mock('../models/Unit');
jest.mock('../models/Risk');
jest.mock('../models/User');

describe('deleteAccount Unit testing set', () => {
  let req, res;
  const userid = new mongoose.Types.ObjectId();

  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

    req = {
      params: { id: userid.toString() },
      user: { id: userid.toString(), role: 'user' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    Project.find.mockImplementation(query => ({
      session: jest.fn().mockResolvedValue(
        query.evaluatorID
          ? [
              { _id: 'proj1', evaluatorID: query.evaluatorID, projectStatus: 'Completed' },
              { _id: 'proj2', evaluatorID: query.evaluatorID, projectStatus: 'รอผู้ตรวจสอบ' },
            ] // Projects assigned to evaluator (for reassigning on delete)
          : query.userID
          ? [
              { _id: 'projA', userID: query.userID },
              { _id: 'projB', userID: query.userID },
            ] // Projects owned by user (for cascade delete)
          : []
      ),
    }));

    User.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue({
        _id: userid,
        id: userid.toString(),
        role: 'user',
        district: 'district1',
      }), // Find user by id to validate and authorize deletion
    });

    User.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue([]), // Find other evaluators in district for task reassignment
      }),
    });

    Project.bulkWrite = jest.fn().mockResolvedValue({}); // Bulk update projects when reassigning evaluators
    User.bulkWrite = jest.fn().mockResolvedValue({}); // Bulk update evaluators' workState after reassignment

    User.findByIdAndDelete.mockResolvedValue({
      _id: userid,
      id: userid.toString(),
      role: 'user',
    }); // Delete user by id

    Unit.findOneAndDelete = jest.fn().mockResolvedValue({}); // Delete related units of user's projects
    Risk.findOneAndDelete = jest.fn().mockResolvedValue({}); // Delete related risks of user's projects
    Project.deleteMany = jest.fn().mockResolvedValue({}); // Delete all projects owned by user
  });
  test('TC1 : user deleted account successful' , async ()=>{
          await deleteAccount(req,res);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith({
            success : true ,
            message : 'ลบบัญชีผู้ใช้เสร็จสมบูรณ์'
          })
    });
    test('TC2 :(user) params id invalid' , async ()=>{
        req.params.id = 'dvkmvopvpsdvospv';
          await deleteAccount(req,res);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({
            success : false ,
            message : 'ข้อมูลบางฟิลด์ในparamsผิดแบบฟอร์มระบบ'
          })
    });
    test('TC3 : (user) stranger try to deleted account ' , async ()=>{
        req.user.id = new mongoose.Types.ObjectId().toString();
          await deleteAccount(req,res);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({
            success : false ,
            message : 'ไม่สามารถลบบัญชีของผู้ใช้ท่านอื่นได้'
          })
    });
    test('TC4 : (user) not found ' , async ()=>{
        User.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(undefined), 
    });
          await deleteAccount(req,res);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.json).toHaveBeenCalledWith({
            success : false ,
            message : 'ไม่พบผู้ใช้ดังกล่าว'
          })
    });
     test('TC5 : Internal Server Error' , async ()=>{
        User.findById.mockImplementation(()=>{
            throw {Lebron : 'James'};
        });
          await deleteAccount(req,res);
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({
            success : false ,
            message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'
          })
    });
    test('TC6 : eva deleted account (only admin alive)' , async ()=>{
        User.findById.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: userid,
                id: userid.toString(),
                role: 'evaluator',
                district: 'district1',
            }), // Find user by id to validate and authorize deletion
        });
          await deleteAccount(req,res);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({
            success : false ,
            message : 'ไม่สามารถลบบัญชีได้ในตอนนี้ , ยังไม่มีผู้ตรวจคนอื่นในเขตนี้ที่สามารถรับงานต่อได้'
          })
    });
    test('TC7 : eva deleted account (more admin now)' , async ()=>{
        User.findById.mockReturnValue({
            session: jest.fn().mockResolvedValue({
                _id: userid,
                id: userid.toString(),
                role: 'evaluator',
                district: 'district1',
            }), // Find user by id to validate and authorize deletion
        });
        User.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue([{id : '1'} , {id : '2'}]), // Find other evaluators in district for task reassignment
        }),
        });

          await deleteAccount(req,res);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith({
            success : true ,
            message : 'ลบบัญชีผู้ใช้เสร็จสมบูรณ์'
          })
    });
    test('TC8 : evaluator not hold any project', async () => {
        User.findById.mockReturnValue({
            session: jest.fn().mockResolvedValue({
            _id: userid,
            id: userid.toString(),
            role: 'evaluator',
            district: 'district1',
            }),
        });

        Project.find.mockImplementation((query) => ({
            session: jest.fn().mockResolvedValue(
            query.evaluatorID? [] : query.userID ? [] : []
            ),
        }));

        User.find.mockReturnValue({
            sort: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue([
                { id: 'eva1' },
                { id: 'eva2' },
            ]),
            }),
        });

        await deleteAccount(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('TC9 : delete account(not user)' , async ()=>{
        User.findByIdAndDelete.mockResolvedValue({
            _id: userid,
            id: userid.toString(),
            role: 'ce',
        }); // Delete user by id
        await deleteAccount(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

});
