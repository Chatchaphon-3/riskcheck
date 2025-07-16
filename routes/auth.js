const express = require('express');

// const {register , login, MyProfile, logout, protectRegister, deleteAccount}  =require('../controllers/auth');
const {deleteAccount } = require('../controllers/authService/deleteAccount');
const {login } = require('../controllers/authService/login');
const { logout} = require('../controllers/authService/logout');
const { MyProfile} = require('../controllers/authService/myProfile');
const { protectRegister} = require('../controllers/authService/protectRegister');
const { register } = require('../controllers/authService/register');
const {protect, authorize} = require('../middleware/auth');
const router = express.Router();


router.post('/register',register);
router.post('/login',login);
router.get('/me',protect,MyProfile);
router.get('/logout',protect , logout);
router.post('/protectRegister',protect , authorize('admin') , protectRegister);
router.delete('/dl/:id',protect , deleteAccount);


module.exports = router;