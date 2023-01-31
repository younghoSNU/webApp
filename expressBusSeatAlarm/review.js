// const { EncodingMode } = require("entities")

// // 먼저 https모듈을 사용해 kobus.co.kr에 요청을 보내고 응답을 받는다. 
// // 요청을 보낼 때에는 payload를 함께 보내고 http 응답, 요청은 HTTP(hypertext transfer protocol)을 이용해 보내게 되는데 
// // 헤더와 바디 그리고 헤더에는 Content-Type, Accept-EncodingMode, 

const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/',
    method: 'GET',
};

const postData = JSON.stringify({
    'msg': 'Hello World!',
});

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    res.on('data', data => {
        console.log(data.toString());
    })
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});


// Write data to request body
req.write(postData);
req.end();