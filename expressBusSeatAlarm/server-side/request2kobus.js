const { parentPort } = require('worker_threads');
const https = require('https');
const { JSDOM } = require('jsdom');

//유저들이 얼마나 사용하는지 확인하는 작업으 로그 추가 필요

//worker thread로 한번만 메시지 받으면 되니까 once를 사용했다.
parentPort.once('message', async (msg) => {
    try {
        console.log(`worker received request:`);
        console.log(msg);
        let result = await itineraryRequestKobus(msg);
    
        parentPort.postMessage(result);
    } catch(e) {
        console.log(`error occured on request2kobus.js parentPort.once`);
        console.log(e);
    }
    
});

function itineraryRequestKobus(postData) {
    return new Promise((resolve, reject) => {
        let str2Cnctn = ''; 
        let itineraryResult = [];

        // const postData = `deprCd=340&deprNm=%EC%95%84%EC%82%B0%EC%98%A8%EC%96%91&arvlCd=010&arvlNm=%EC%84%9C%EC%9A%B8%EA%B2%BD%EB%B6%80&tfrCd=&tfrNm=&tfrArvlFullNm=&pathDvs=sngl&pathStep=1&pathStepRtn=1&crchDeprArvlYn=N&deprDtm=20230204&deprDtmAll=2023.+2.+4.+%ED%86%A0&arvlDtm=20230204&arvlDtmAll=2023.+2.+4.+%ED%86%A0&busClsCd=0&abnrData=&prmmDcYn=N&takeTime=0&extrComp=&stdDtm=&endDtm=`;

        const options = {
            port: 443,
            hostname: `www.kobus.co.kr`,
            path: `/mrs/alcnSrch.do`,
            method: `POST`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        const req = https.request(options, res => {
            // console.log(`statusCode from kobus:,`, res.statusCode);
            // console.log(`headers:`, res.headers);

            res.on('data', d => {
                str2Cnctn += d.toString();
            });

            res.on(`end`, () => {
                const { document } = (new JSDOM(str2Cnctn)).window;
                const itinerary = document.querySelectorAll(`p[data-time]`);

                itinerary.forEach(el => {
                    console.log(el.querySelector(`.start_time`).innerHTML);

                    const dprtTime = el.querySelector(`.start_time`).innerHTML.split(' : ').join();
                    const busCmp = el.querySelector(`.dyexpress`).innerHTML;
                    const busGrade = el.querySelector(`.grade_mo`).innerHTML;
                    const remain = el.querySelector(`.remain`).innerHTML;

                    itineraryResult.push({dprtTime, busCmp, busGrade, remain});
                });

                resolve(itineraryResult);
            })
        });

        req.on(`error`, (e) => {
            console.log(e);
            reject(e);
        });

        req.write(postData);
        req.end();
    });
    
}
