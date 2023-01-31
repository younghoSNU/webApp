const https = require('https');
const iconv = require('iconv-lite');
const fs = require('fs');


const postData = `startCode=34040&endCode=11&startBusName=%BE%C6%BB%EA%BD%C3&endBusName=%BC%AD%BF%EF%C6%AF%BA%B0%BD%C3&end_s1=0&end_s1_name=%C0%FC%C3%BC&start_s1=0&start_s1_name=%C0%FC%C3%BC&busType=0&page=&pageNo=2&pageListNo=1&selectDate=20221226&pagesize=10`;

// console.log(postData)
// console.log(Buffer.byteLength(postData))
const options = {
  hostname: 'www.tago.go.kr',
  port: 443,
  path: '/v5/expbus/realtimeScheduleResult.jsp',
  method: 'POST',
  headers: {
    // 'Accept-Encoding': 'gzip, deflate, br',
    // 'Cache-Control': 'max-age=0',
    // 'Connection': 'keep-alive',
    'Content-Length': Buffer.byteLength(postData),
    'Content-Type': 'application/x-www-form-urlencoded',
  }
};

const req = https.request(options, (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);


  res.on('data', (d) => {
    // process.stdout.write(d);
    let str = iconv.decode(d, 'euc-kr');
    let html = stringToHTML(str);
    fs.writeFileSync('./httpRequest/test.html', html);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(postData);
req.end();

/**
 * Convert a template string into HTML DOM nodes
 * @param  {String} str The template string
 * @return {Node}       The template HTML
 */
 var stringToHTML = function (str) {
	var parser = new DOMParser();
	var doc = parser.parseFromString(str, 'text/html');
	return doc.body;
};