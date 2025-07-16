// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/_tests_/*.test.js'], // รันเฉพาะไฟล์ .test.js ใน _tests_
  collectCoverage : true , 
  collectCoverageFrom : [
    "controllers/**/*.js",
    "!controllers/projects.js" , 
    "!controllers/**/summary.js" ,
    "!controllers/units.js" , 
    "!controllers/risk.js", 
    "!controllers/auth.js"
  ]
};
