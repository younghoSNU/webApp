const { parentPort } = require('worker_threads');
const https = require('https');
const { JSDOM } = require('jsdom');

//유저들이 얼마나 사용하는지 확인하는 작업으 로그 추가 필요

const SUBSCRIPTOIN_CHECK_KEY = 'idxs';
//kobus에 요청 보내는 바디에 필요한 코드 정보
const Nm2Cd = {아산온양: `340`, 서울경부: `010`, 천안아산역: `343`, 배방정류소: `337`};
Nm2Cd[`아산서부(호서대)`] = `341`;

function makePostData(deprNm, arvlNm, year, month, date, day) {
    if (Nm2Cd[deprNm] === undefined || Nm2Cd[arvlNm] === undefined) {
        throw new Error(`해당 여정에 대한 코드가 존재하지 않습니다.`);
    }

    return `deprCd=${Nm2Cd[deprNm]}&deprNm=${deprNm}&arvlCd=${Nm2Cd[arvlNm]}&arvlNm=${arvlNm}&tfrCd=&tfrNm=&tfrArvlFullNm=&pathDvs=sngl&pathStep=1&pathStepRtn=1&crchDeprArvlYn=Y&deprDtm=${year+month+date}&deprDtmAll=${year}.+${month}.+${date}}.+${day}&arvlDtm=${year+month+date}&arvlDtmAll=${year}.+${month}.+${date}.+${day}&busClsCd=0&abnrData=&prmmDcYn=N`;
}

//worker thread로 한번만 메시지 받으면 되니까 once를 사용했다.
parentPort.once('message', async (msg) => {
    try {
        console.log(`worker received request:`);
        console.log(msg);

        const {deprNm, arvlNm, year, month, date, day, list, resIdx} = msg;
        const postData = makePostData(deprNm, arvlNm, year, month, date, day);
        //구독을 하는 건지 아니면 리스트를 디스플레이하는 건지
        if (list !== undefined) {
            //do something
            itineraryRequestKobusSbscrp();
        } else {
            let result = await itineraryRequestKobus(postData);

            parentPort.postMessage(result);
        }
        // let result = await itineraryRequestKobus(msg);
    
        // parentPort.postMessage(result);
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

                    const dprtTime = el.querySelector(`.start_time`).innerHTML.split(' : ').join(`:`);
                    const busCmp = el.querySelector(`.dyexpress`).innerHTML;
                    const busGrade = el.querySelector(`.grade_mo`).innerHTML;
                    const remain = el.querySelector(`.remain`).innerHTML;

                    itineraryResult.push({dprtTime, busCmp, busGrade, remain});
                });

                if (itineraryResult.length === 0) {
                    reject(`해당 날짜, 출발지, 도착지, 에대한 여정이 kobus서버에 존재하지 않습니다.`);
                } else {
                    resolve(itineraryResult);
                }
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

function itineraryRequestKobusSbscrp(postData) {
    // 요청을 보내서 데이터를 받는다 
    // 현재시간과 비교한다. 애초에 확실한 idx인 시간을 보내자.
    console.log(`in itineraryRequestKobusSbscrp`);
}