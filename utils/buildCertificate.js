const puppeteer = require('puppeteer-core');
const { s3 } = require('../middleware/uploadConfig');
const { PutObjectCommand , HeadBucketCommand , CreateBucketCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

async function generateRiskCertificatePDF(project, unit, risk, eva) {
    try {
      // ตรวจสอบว่า bucket มีอยู่หรือไม่
      await s3.send(new HeadBucketCommand({ Bucket: 'bucket1' }));
      // console.log("Bucket exists.");
  } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
          // Bucket ไม่มี → สร้างใหม่
          await s3.send(new CreateBucketCommand({ Bucket: 'bucket1' }));
          // console.log("Created new bucket.");
      } else {
          // ถ้าเป็น error อื่น เช่น permission, credential ผิด
          throw { code: 550, status: 500, message: 'ไม่สามารถเข้าถึง MinIO ได้: ' + err.message };
      }
  }
  let date = formatThaiDate(project.updatedAt);
  const logoPath = path.join(__dirname, '../info/logo2.png');   // แปลง root path + 
  const logoData = fs.readFileSync(logoPath).toString('base64');
  const logoSrc = `data:image/png;base64,${logoData}`;

  const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
  const page = await browser.newPage();

  const html = `
  <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Sarabun&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Sarabun', sans-serif;
          font-size: 14px;
          padding: 40px;
          line-height: 1.6;
          position: relative;
        }
        h2 {
          text-align: center;
          font-size: 18pt;
          margin-bottom: 30px;
        }
        .info p {
          margin: 4px 0;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
        }
        td, th {
          border: 1px solid black;
          padding: 16px;
          height: 40px;
          text-align: center;
        }
        .right {
          text-align: right;
          margin-top: 10px;
          padding-right: 20px;
        }
        .bold {
          font-weight: bold;
        }
        /* ลายน้ำ */
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.08;
          z-index: -1;
          width: 400px;
          pointer-events: none; /* กันลายน้ำไปรบกวนการคลิก */
        }
        .watermark img {
          width: 100%;
          height: auto;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="watermark">
        <img src="${logoSrc}" />
      </div>

      <h2>ใบรับรองข้อมูลความเสี่ยง</h2>

      <div class="info">
        <p>
          <span class="bold">โครงการ :</span> ${project.projectName}
          <span class="bold"> เลขที่โครงการ :</span> ${project.projectNum}
        </p>
        <p>
          <span class="bold">สถานที่ตั้ง :</span> เขต${project.district} แขวง${project.subDistrict}
        </p>
        <p>
          <span class="bold">พิกัดละติจูด :</span> ${project.latitude}°
          <span class="bold"> พิกัดลองจิจูด :</span> ${project.longtitude}°
        </p>
        <p>
          <span class="bold">จำนวนยูนิตในโครงการ :</span> ${unit.totalUnit} ยูนิต
        </p>
      </div>

      <h3>ข้อมูลความเสี่ยง</h3>

      <h4>น้ำท่วม</h4>
      <table>
        <thead>
          <tr>
            <th rowspan="2">RCP</th>
            <th colspan="2">ปัจจุบัน - พ.ศ.2593</th>
            <th colspan="2">พ.ศ.2594 - พ.ศ.2643</th>
          </tr>
          <tr>
            <th>ระดับน้ำ(ม.)</th>
            <th>รอบการเกิด(ปี)</th>
            <th>ระดับน้ำ(ม.)</th>
            <th>รอบการเกิด(ปี)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>RCP 2.6</td><td>${risk.floodRisk.phaseOne.rcp2_6.data}</td><td>${risk.floodRisk.phaseOne.rcp2_6.freq}</td><td>${risk.floodRisk.phaseTwo.rcp2_6.data}</td><td>${risk.floodRisk.phaseTwo.rcp2_6.freq}</td></tr>
          <tr><td>RCP 4.5</td><td>${risk.floodRisk.phaseOne.rcp4_5.data}</td><td>${risk.floodRisk.phaseOne.rcp4_5.freq}</td><td>${risk.floodRisk.phaseTwo.rcp4_5.data}</td><td>${risk.floodRisk.phaseTwo.rcp4_5.freq}</td></tr>
          <tr><td>RCP 6.0</td><td>${risk.floodRisk.phaseOne.rcp6_0.data}</td><td>${risk.floodRisk.phaseOne.rcp6_0.freq}</td><td>${risk.floodRisk.phaseTwo.rcp6_0.data}</td><td>${risk.floodRisk.phaseOne.rcp6_0.freq}</td></tr>
        </tbody>
      </table>

      <h4>แรงลม</h4>
      <table>
        <thead>
          <tr>
            <th rowspan="2">RCP</th>
            <th colspan="2">ปัจจุบัน - พ.ศ.2593</th>
            <th colspan="2">พ.ศ.2594 - พ.ศ.2643</th>
          </tr>
          <tr>
            <th>ความเร็ว(กม./ชม.)</th>
            <th>รอบการเกิด(ปี)</th>
            <th>ความเร็ว(กม./ชม.)</th>
            <th>รอบการเกิด(ปี)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>RCP 2.6</td><td>${risk.windRisk.phaseOne.rcp2_6.data}</td><td>${risk.windRisk.phaseOne.rcp2_6.freq}</td><td>${risk.windRisk.phaseTwo.rcp2_6.data}</td><td>${risk.windRisk.phaseTwo.rcp2_6.freq}</td></tr>
          <tr><td>RCP 4.5</td><td>${risk.windRisk.phaseOne.rcp4_5.data}</td><td>${risk.windRisk.phaseOne.rcp4_5.freq}</td><td>${risk.windRisk.phaseTwo.rcp4_5.data}</td><td>${risk.windRisk.phaseTwo.rcp4_5.freq}</td></tr>
          <tr><td>RCP 6.0</td><td>${risk.windRisk.phaseOne.rcp6_0.data}</td><td>${risk.windRisk.phaseOne.rcp6_0.freq}</td><td>${risk.windRisk.phaseTwo.rcp6_0.data}</td><td>${risk.floodRisk.phaseOne.rcp6_0.freq}</td></tr>
        </tbody>
      </table>

      <p>ได้ผ่านการตรวจสอบความเสี่ยงและได้มีมาตรการรองรับความเสี่ยงเหล่านี้เป็นที่เรียบร้อย</p>
      <p><span class="bold">ได้รับการตรวจสอบโดย :</span> ${eva.username}</p>
      <p><span class="bold">ขอบเขตพื้นที่ในการรับผิดชอบ:</span> เขต${eva.district}</p>
      <p class="right"><span class="bold">อนุมัติ:</span> ${date}</p>
    </body>
  </html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  const filename = `certificate/${project.projectNum}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: 'bucket1',
      Key: filename,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    })
  );
  return filename;
}

function formatThaiDate(date) {
  const thMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const d = new Date(date);
  const day = d.getDate();
  const month = thMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `วันที่ ${day} ${month} พ.ศ. ${year} เวลา: ${hours}:${minutes} น.`;
}

module.exports = generateRiskCertificatePDF;
