const https = require(`https`);
const { JSDOM } = require('jsdom');
const { terminalCode } = require(`./terminalCode`);

function itineraryRequest2Kobus(postData) {
    return new Promise((resolve, reject) => {
        let str2Cnctn = ''; 
        let itineraryResult = [];

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
            // kobus서버에서 chunked transfer encoding으로 데이터를 여러 번에 걸쳐 청크 단위로 제공하기 때문에 str2Cnctn에 넣는다
            res.on('data', d => {
                str2Cnctn += d.toString();
            });

            res.on(`end`, () => {
                const { document } = (new JSDOM(str2Cnctn)).window;
                const itinerary = document.querySelectorAll(`p[data-time]`);
                console.log('wow');
                console.log(itinerary.innerHTML);
                itinerary.forEach(el => {
                    console.log(el.innerHTML);
                    const dprtTime = el.querySelector(`.start_time`).innerHTML.split(' : ').join(`:`);
                    const busCmp = el.querySelector(`.bus_com span`).innerHTML;
                    const busGrade = el.querySelector(`.grade_mo`).innerHTML;
                    const remain = el.querySelector(`.remain`).innerHTML;

                    itineraryResult.push({dprtTime, busCmp, busGrade, remain});
                });

                if (itineraryResult.length === 0) {
                    reject({error: true, predictedError: true, type: contentType.ALERT, content: {contentMessage: `해당 입력 조건에 대한 스케줄이 존재하지 않습니다.`}});
                    return;
                } else {
                    // ##################################TEST#######
                    // 실제 서버의 데이터가 아니라 DEBUG_SBSCRPCNT에 따라 프리세팅된 noZero, zero 등을 리솔브한다.           
                    let result = {error: false, content: {contentMessage: null}};         
                    // if (glbCount > DEBUG_SBSCRPCNT) {
                    //     result.content.contentMessage = noZero;
                    //     console.log(`서버에서 nonZero가져왔`)
                    //     resolve(result);
                    //     return;
                    // } else {
                    //     result.content.contentMessage = zero;
                    //     console.log(`서버에서 zero`)
                    //     resolve(result);
                    //     return;
                    // }
                    result.content.contentMessage = itineraryResult;
                    resolve(result);
                    // ##############################################
                }
            })
        });

        req.on(`error`, (e) => {
            reject({error: true, predictedError: false, type: contentType.ALERT, content: {contentMessage: `SERVER ERROR`+e}});
        });

        req.write(postData);
        req.end();
    });
}

function makePostData(dprtNm, arvlNm, year, month, date, day) {
    const dprtCd = String(terminalCode[dprtNm]).padStart(3, '0');
    const arvlCd = String(terminalCode[arvlNm]).padStart(3, `0`);

    if (dprtCd === undefined || arvlCd === undefined) {
        throw new Error(`해당 여정에 대한 코드가 존재하지 않습니다.`);
    }
    console.log(dprtCd, arvlCd);
    // const postData = `deprCd=340&deprNm=%EC%95%84%EC%82%B0%EC%98%A8%EC%96%91&arvlCd=010&arvlNm=%EC%84%9C%EC%9A%B8%EA%B2%BD%EB%B6%80&tfrCd=&tfrNm=&tfrArvlFullNm=&pathDvs=sngl&pathStep=1&pathStepRtn=1&crchDeprArvlYn=N&deprDtm=20230204&deprDtmAll=2023.+2.+4.+%ED%86%A0&arvlDtm=20230204&arvlDtmAll=2023.+2.+4.+%ED%86%A0&busClsCd=0&abnrData=&prmmDcYn=N&takeTime=0&extrComp=&stdDtm=&endDtm=`;

    return `deprCd=${dprtCd}&deprNm=${dprtNm}&arvlCd=${arvlCd}&arvlNm=${arvlNm}&tfrCd=&tfrNm=&tfrArvlFullNm=&pathDvs=sngl&pathStep=1&pathStepRtn=1&crchDeprArvlYn=Y&deprDtm=${year+month+date}&deprDtmAll=${year}.+${month}.+${date}.+${day}&arvlDtm=${year+month+date}&arvlDtmAll=${year}.+${month}.+${date}.+${day}&busClsCd=0&abnrData=&prmmDcYn=N`;
}

const dprtNm = '아산온양';
const arvlNm = '서울경부';
const year = '2023';
const month = '02'
const date = '23';
const day = '목';

let postData = makePostData(dprtNm, arvlNm, year, month, date, day);
console.log(postData);
itineraryRequest2Kobus(postData).then(e => console.log(e)).catch(e => console(`aaa` + e));