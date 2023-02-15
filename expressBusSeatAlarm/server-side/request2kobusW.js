const { parentPort } = require('worker_threads');
const https = require('https');
const { JSDOM } = require('jsdom');
//#########################TEST##########################
const { noZero, zero } = require(`./dbgInput`);
let glbCount = 0;
const DEBUG_COUNT = 5;
//#######################################################
//유저들이 얼마나 사용하는지 확인하는 작업으 로그 추가 필요

const DEPARTURE_TIME = 'dprtTime';
const REMAIN = `remain`;
const REQUEST_PERIOD = 3000;
const COUNT_PERIOD = 60;
//kobus에 요청 보내는 바디에 필요한 코드 정보
const Nm2Cd = {아산온양: `340`, 서울경부: `010`, 천안아산역: `343`, 배방정류소: `337`};
Nm2Cd[`아산서부(호서대)`] = `341`;

//worker thread로 한번만 메시지 받으면 되니까 once를 사용했다.
// 메시지를 받는 경우는 (0209(목) 기준) 두 가지다. 
// a. 유저에게 여정 리스트를 보여주기 위해 코버스서버에 요청을 보낼 때
// b. 유저가 구독하는 여정을 매 주기마다 불러와 잔여좌석이 있는지 확인할 때
parentPort.once('message', parentPortMsgCallback);

/**
 * kobus 서버로 post할 데이터포맷으로 바꿔준다.
 * @param {string} dprtNm 
 * @param {string} arvlNm 
 * @param {string} year 
 * @param {string} month 
 * @param {string} date 
 * @param {string} day 
 * @returns {stirng}
 */
function makePostData(dprtNm, arvlNm, year, month, date, day) {
    if (Nm2Cd[dprtNm] === undefined || Nm2Cd[arvlNm] === undefined) {
        throw new Error(`해당 여정에 대한 코드가 존재하지 않습니다.`);
    }

    return `deprCd=${Nm2Cd[dprtNm]}&deprNm=${dprtNm}&arvlCd=${Nm2Cd[arvlNm]}&arvlNm=${arvlNm}&tfrCd=&tfrNm=&tfrArvlFullNm=&pathDvs=sngl&pathStep=1&pathStepRtn=1&crchDeprArvlYn=Y&deprDtm=${year+month+date}&deprDtmAll=${year}.+${month}.+${date}}.+${day}&arvlDtm=${year+month+date}&arvlDtmAll=${year}.+${month}.+${date}.+${day}&busClsCd=0&abnrData=&prmmDcYn=N`;
}

/**
 * 
 * @param {object} msg {dprtNm: string, arvlNm: string, year: string, month: string, date: string, day: string, list: [{idx:number, dprtTime: string}, {...}], resIdx: number}
 * a.처럼 사용할 때는 dprtNm, arvlNm, year, month, date, day만 있으면 되고 b.로 사용할 때는 앞선 얘기한 property에 추가로 list와 resIdx 프로퍼티도 있어야 한다. 
 * 이 함수 안에서 parentPort에 postMessage를 한다. 포스트하는 메시지는 아래와 같은 형식을 띤다.
 * {success: true/false, type: `display`/`notification`, message: content}
 */
async function parentPortMsgCallback(msg) {
    try {
        console.log(`r2k worker received request:`);    //r2k: request to kobus server
        console.log(`check validation of msg\n${JSON.stringify(msg)}`);

        const {dprtNm, arvlNm, year, month, date, day, list, resIdx} = msg;
        const postData = makePostData(dprtNm, arvlNm, year, month, date, day);

        //구독을 하는 건지 아니면 리스트를 디스플레이하는 건지
        if (list !== undefined) {
            //do something
            // #######################TEST###########################
            // date+1해서 내일 데이터라고 가정한다. 그래야 doCount반응 안한다. 일단 없애고 테스트중
            let foundList = await itineraryRequestKobusSbscrp(postData, list, date, resIdx);

            
        } else {
            let result = await itineraryRequestKobus(postData);
            
            parentPort.postMessage({success: true, message: result, type: `display`});
        }
    } catch(e) {
        console.log(`error occured on request2kobusW at parentPortMsgCallback`);
        console.log(e);

        parentPort.postMessage({success: false, message: e});
    }
}



/**
 * 실제로 kobus에 요청을 보내는 함수이다. https 모듈을 사용한다. 응답으로 받은 html을 파싱해서 object를 리턴한다.
 * @param {string} postData 
 * @returns {Promise} resolve면 여정데이터 reject면 에러 이유를 리턴
 * 여정데이터는 아래 오브젝트들을 담은 배열
 *  {
        "dprtTime": "14:50",
        "busCmp": "동양고속",
        "busGrade": "고속",
        "remain": "5 석"
    }
 */
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
                    // console.log(el.querySelector(`.start_time`).innerHTML);

                    const dprtTime = el.querySelector(`.start_time`).innerHTML.split(' : ').join(`:`);
                    const busCmp = el.querySelector(`.dyexpress`).innerHTML;
                    const busGrade = el.querySelector(`.grade_mo`).innerHTML;
                    const remain = el.querySelector(`.remain`).innerHTML;

                    itineraryResult.push({dprtTime, busCmp, busGrade, remain});
                });

                if (itineraryResult.length === 0) {
                    reject(`해당 날짜, 출발지, 도착지, 에대한 여정이 kobus서버에 존재하지 않습니다.`);
                } else {
                    // ##################################TEST#######
                    if (glbCount === DEBUG_COUNT) {
                        resolve(noZero);
                    } else {
                        resolve(zero);
                    }
                    // resolve(itineraryResult);
                    // ##############################################
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

/**
 * 구독과 관련해 서버로 요청을 보낸 함수 중에서 메인 함수이다. parent port로 메시지가 들어와 진행되는 parentPortMsgCallback함수에서 구독이 필요한 경우 실행되는 함수다. setTimeout으로 요청을 보내는 requestWithSto를 담고잇다.
 * @param {string} postData 
 * @param {array} list eg) [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]
 * @param {string} date 몇 일인지 비교해서 당일이면 시간 지난 여정은 삭제하는 작업하려고
 * @param {number} resIdx
 */
async function itineraryRequestKobusSbscrp(postData, list, date, resIdx) {
    
    // 요청을 보내서 데이터를 받는다 
    // 현재시간과 비교한다. 애초에 확실한 idx인 시간을 보내자.
    console.log(`in itineraryRequestKobusSbscrp`);
    // console.log(JSON.stringify(postData))

    // requestWithSto에서 lists에 더이상 데이터가 없으면 reject한다
    const foundList = await requestWithSto(postData, list, date, resIdx);

    return foundList;
}

/**
 * 실질적으로 잔여좌석 확인을 구독하는 때에 kobus서버로 요청을 보내는 함수이다. 내부에 setTimeout이 있어 주기를 갖고 요청을 보낸다.
 * @param {string} postData 
 * @param {array} list eg) [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]
 * @param {string} date 몇 일인지 비교해서 당일이면 시간 지난 여정은 삭제하는 작업하려고
 * @param {number} resIdx
 * @returns 
 */
function requestWithSto(postData, list, date, resIdx) {
    //임시 실험용 count: count 횟수가 어느 정도 차면 잔여좌석이 0이 아닌 데이터를 의도적으로 보내 잘 동작하는지 확인한다.
    let count = 0;

    return new Promise((resolve, reject) => {
        let countPeroid = 0;
        let doCount = false;

        let intrvl = setInterval(async () => {
            const listLen = list.length;    //시간이 지나면서 list에서 이미 출발한 여정은 버리기 때문에 인터벌마다 리스트 길이가 달라진다.

            if (listLen === 0) {
                reject(`구독했던 여정(들)에서 잔여좌석이 생기지 않고 출발했습니다.`);
            }

            // startT와 endT는 한번요청으로 ec2 프리티어 서버에서 얼마나 걸려서 응답을 받는지 확인한다.
            let startT =  new Date();
            // #####################TEST###############
            glbCount++;

            const result = await itineraryRequestKobus(postData);
            
            // ############################TEST####################

            let endT = new Date();

            const resultLen = result.length;
            let foundList = []; //잔여좌석이 생긴 여정을 담는다.
            
            // ############################TEST######################
            
            console.log(`한번 kobus요청에 걸리는 시간`);
            console.log(endT-startT);   //1593
            
            if (glbCount === 1) {
                console.log(`count: ${glbCount} result:\n${JSON.stringify(result)}`);                
            } else {
                console.log(`count: ${glbCount}`);
            }
            if (glbCount === DEBUG_COUNT) {
                console.log(`\n\n자 잔여석 생기는 때입니다.\nresult:\n${JSON.stringify(result)}\n참고로 구독중인 리스트는\n${JSON.stringify(list)}`)
            }
            // ######################################################

            //매칭되는 여정이 있다면 즉시 푸쉬알림이 목표다.
            for (let i=0; i<listLen; ++i) {
                const tempDprtTime = list[i].dprtTime;
                if (glbCount==DEBUG_COUNT) {
                    console.log(`tempDprtTime ${tempDprtTime}`);
                }
                for (let j=0; j<resultLen; ++j) {
                    const tempEntry = result[j];

                    if (glbCount == DEBUG_COUNT) {
                        console.log(`tempEntry of result ${JSON.stringify(tempEntry)}`);
                    }
                    //만약 실시간으로 요청한 여정에 잔여좌석이 있다면 foundList에 넣는다.
                    if (tempEntry[DEPARTURE_TIME] === tempDprtTime) {
                        const tempRemain = +(tempEntry[REMAIN].slice(0,2));
                        if (tempRemain > 0) {
                            foundList.push(tempEntry);
                            break;
                        }
                    }
                }
            }

            //foundList에 담겨 있다면 유저가 구독 하는 여정 중에 잔여석있는 여정이 생긴 것이다. 즉시 메시지를 보내야 한다.
            
            console.log(`foundList ${JSON.stringify(foundList)}`);
            if (glbCount == DEBUG_COUNT) {
                glbCount = 0;
            }
            if (foundList.length > 0) {
                // resolve(foundList);

                const foundTime = new Date();
                // 타입이 true인 것은 에러가 발생하지 않고 데이터를 전달한다는 것
                parentPort.postMessage({success: true, message: {foundList, resIdx, time: {hours: foundTime.getHours(), minutes: foundTime.getMinutes(), seconds: foundTime.getSeconds()}, date}, type: `notification`});
                // clearInterval(intrvl);
                console.log(`cleared interval`);
                //이후 추가적업 없나?
                //id등록된 것 일시적으로 없애야 3초마다 알림 가는 것 방지 가능
            } 

            // 구독하는 여정 일부 지우기: 다음날의 여정을 구독하는 거라면 상관없다 그러나 만약 오늘 여정인데 시간이 지나 출발했다면 list변수에서 지워줘야 한다
            //여정의 출발일이 오늘인지 확인
            //만약 오늘이면 지우는 작업 진행
            //시간 지나 진짜 출발한 여정이면 지움
            const d = new Date();

            if (!doCount) {
                currentDate = d.getDate();
                if (date === currentDate) {
                    doCount = true;
                    console.log(`\n\n구독일이 오늘일과 같으므로 doCount true합니다.\n\n`);
                }    
            } else {
                countPeroid++;
                // countPeroid에 따라 lists에서 시간 지난 list는 삭제한다.
                // 삭제는 COUNT_PERIOD*REQUEST_PERIOD/1000(s) 마다 한다.
                if (countPeroid === COUNT_PERIOD) {
                    countPeroid = 0;
    
                    const currentHour = d.getHours();
                    const currentMinute = d.getMinutes();
                    
                    for (let i=0; i<listLen; ++i) {
                        const [listHour, listMinute] = lists[i].dprtTime.split(`:`).map(e => +e);
    
                        if ((listHour < currentHour) && (listHour === currentHour && listMinute <= currentMinute)) {
                            console.log(`이미 출발한 ${listHour}:${listMinute} 여정은 구독 리스트에서 삭제합니다.`)
                            list = list.filter((_, idx) => i !== idx);
                        } 
                    }
                }
            }
            
            //test
            count++;
        }, REQUEST_PERIOD);
    });
}