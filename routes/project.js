const express = require('express');
// const { createProject , getAllProjects ,  getProject, editProject, deleteProject, uploadDoc, summaryInfo, createCertificate} = require('../controllers/projects');
const { protect, authorize } = require('../middleware/auth');
const {upload} = require('../middleware/uploadConfig');
// const {getAllUnit , createUnit, editUnit, deleteAllUnit, deleteUnit } = require('../controllers/units');
const { createUnit, getAllUnits, getUnit, editUnitDetail, manageTotalUnits, deleteUnits } = require('../controllers/units')
const {createRisk, editRiskDetail, getRisk, deleteRisk, getRiskDetail} = require('../controllers/risk');
const router = express.Router();
const {createProject} = require('../controllers/projectService/create');
const {createCertificate} = require('../controllers/projectService/certificate');
const {deleteProject} = require('../controllers/projectService/delete');
const {editProject} = require('../controllers/projectService/edit');
const {getAllProjects} = require('../controllers/projectService/getAll');
const {getProject} = require('../controllers/projectService/getSingle');
const {summaryInfo} = require('../controllers/projectService/summary');
const {uploadDoc} = require('../controllers/projectService/upload');


router.route('/').post(protect, authorize('user','admin') , createProject).get(protect , getAllProjects);
router.route('/summary').get(protect , authorize('ce','admin'),summaryInfo);
router.route('/:id').get(protect,getProject).put(protect,authorize('user','admin','evaluator'),editProject).delete(protect,authorize('user','admin'),deleteProject);
router.route('/:id/certificate').get(createCertificate);
router.route('/:id/doc').patch(protect,authorize('user','admin'),upload.single('file'),uploadDoc);
// router.route('/:id/riskDetail').get(protect , getRiskDetail);
router.route('/:id/risk').post(protect , authorize('user','admin'),createRisk).put(protect , authorize('user','admin'),editRiskDetail).get(protect,getRisk).delete(protect , authorize('admin') , deleteRisk);
router.route('/:id/unit').post(protect , authorize('user' , 'admin'),createUnit).get(protect,getAllUnits).delete(protect , authorize('user' , 'admin') , deleteUnits);
router.route('/:id/unit/:action').patch(protect , authorize('user' , 'admin') ,manageTotalUnits)
router.route('/:id/unit/:uID').get(protect,getUnit).put(protect , authorize('user' , 'admin') ,editUnitDetail);



module.exports = router;  