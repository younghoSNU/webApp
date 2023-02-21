const { parentPort } = require('worker_threads');
const https = require('https');
const { JSDOM } = require('jsdom');
//#########################TEST##########################
const { noZero, zero, partialZero } = require(`./dbgInput`);
let glbCount = 0;
let glbCount2 = 0;
const DEBUG_SBSCRPCNT = 3;  //이 횟수에 따라 itinerayRequest2Kobus에서 프리세팅된 데이터가 리솔브된다.

const contentType = {
    NOTIFICATION: `notification`,
    ALERT: `alert`,
    SILENCE: `silence`,
};
//#######################################################
//유저들이 얼마나 사용하는지 확인하는 작업으 로그 추가 필요

const DEPARTURE_TIME = 'dprtTime';
const REMAIN = `remain`;
const REQUEST_PERIOD = 3000;
const LIST_ADD_PERIOD = 10000; //원래 300000예정
const CMP_PERIOD = 40;  //여정이 오늘것이라면 여정들의 출발시간과 현재시간을 비교해서 list에서 삭제조치 해야 한다. CMP_PERIOD*REQUEST_PERIOID를 비교한다.
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
        // console.log(`r2k worker received request:`);    //r2k: request to kobus server
        // console.log(`check validation of msg\n${JSON.stringify(msg)}`);

        const {dprtNm, arvlNm, year, month, date, day, list, resIdx} = msg;
        const postData = makePostData(dprtNm, arvlNm, year, month, date, day);

        //구독을 하는 건지 아니면 리스트를 디스플레이하는 건지
        if (list !== undefined) {
            //do something
            //message = {message: `...`, success: true/false}
            await itineraryRequest2KobusSbscrp(postData, list, date, resIdx);
        } else {
            let result = await itineraryRequest2Kobus(postData);

            parentPort.postMessage({success: true, message: result.content, type: `display`});
        }
    } catch(errorContainer) {
        console.log(`error(perhaps rejects from try block) occured on parentPortMsgCallback`);
        console.log(errorContainer);
        const {predictedError, type, content} = errorContainer;

        if (predictedError === false) {
            console.log(`예상지 못한 에러가 발생했습니다. ${JSON.stringify(errorContainer)}`);
            parentPort.postMessage({success: false, type, message: content});
        } else {
            //predictedError: true면 type에 따라 케이스 분류
            if (errorContainer.type === contentType.NOTIFICATION) {
                parentPort.postMessage({success: false, type, message: content});
            } else if (errorContainer.type === contentType.ALERT) {
                parentPort.postMessage({success: false, type, message: content});
            }
        }
    }
}



/**
 * 실제로 kobus에 요청을 보내는 함수이다. https 모듈을 사용한다. 응답으로 받은 html을 파싱해서 object를 리턴한다.
 * @param {string} postData 
 * @returns {Promise} 
 * resolve: 여정데이터 {error: false, content: {contentMessage}}
 * reject: 요청 응답 중에 에러 발생 또는 여정 리스트 길이가 0으로 선택된 조건에 대한 여정이 없거나 {error: true, predictedError, type: contentType.ALERT, content: {contentMesage}}
 * 여정데이터는 아래 오브젝트들을 담은 배열
 *  {
        "dprtTime": "14:50",
        "busCmp": "동양고속",
        "busGrade": "고속",
        "remain": "5 석"
    }
 */
function itineraryRequest2Kobus(postData) {
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
            // kobus서버에서 chunked transfer encoding으로 데이터를 여러 번에 걸쳐 청크 단위로 제공하기 때문에 str2Cnctn에 넣는다
            res.on('data', d => {
                str2Cnctn += d.toString();
            });

            res.on(`end`, () => {
                const { document } = (new JSDOM(str2Cnctn)).window;
                const itinerary = document.querySelectorAll(`p[data-time]`);

                itinerary.forEach(el => {
                    const dprtTime = el.querySelector(`.start_time`).innerHTML.split(' : ').join(`:`);
                    const busCmp = el.querySelector(`.dyexpress`).innerHTML;
                    const busGrade = el.querySelector(`.grade_mo`).innerHTML;
                    const remain = el.querySelector(`.remain`).innerHTML;

                    itineraryResult.push({dprtTime, busCmp, busGrade, remain});
                });

                if (/*itineraryResult.length === 0*/glbCount === 2) {
                    reject({error: true, predictedError: true, type: contentType.ALERT, content: {contentMessage: `해당 입력 조건에 대한 스케줄이 존재하지 않습니다.`}});
                    return;
                } else {
                    // ##################################TEST#######
                    // 실제 서버의 데이터가 아니라 DEBUG_SBSCRPCNT에 따라 프리세팅된 noZero, zero 등을 리솔브한다.
                    let result = {error: false ,content: {contentMessage: null}};
                    console.log(`glbCount ${glbCount}, glbCount2 ${glbCount2}`);
                    if (glbCount === DEBUG_SBSCRPCNT) {
                        if (glbCount2 === 1) {
                            result.content.contentMessage = noZero;
                            console.log(`서버에서 nonZero가져왔`)
                            resolve(result);
                            return ;
                        }
                        result.content.contentMessage = partialZero;
                        console.log(`서버에서 partialZero`)
                        resolve(result);
                        glbCount2++;
                        return;
                    } else {
                        result.content.contentMessage = zero;
                        console.log(`서버에서 zero`)
                        resolve(result);
                        return;
                    }
                    // result.content.contentMessage = itineraryResult;
                    // resolve(result);
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

/**
 * 구독과 관련해 서버로 요청을 보낸 함수 중에서 메인 함수이다. parent port로 메시지가 들어와 진행되는 parentPortMsgCallback함수에서 구독이 필요한 경우 실행되는 함수다. setTimeout으로 요청을 보내는 requestWithSto를 담고잇다.
 * @param {string} postData 
 * @param {array} list eg) [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]
 * @param {string} date 몇 일인지 비교해서 당일이면 시간 지난 여정은 삭제하는 작업하려고
 * @param {number} resIdx
 */
async function itineraryRequest2KobusSbscrp(postData, list, date, resIdx) {
    
    // 요청을 보내서 데이터를 받는다 
    // 현재시간과 비교한다. 애초에 확실한 idx인 시간을 보내자.
    console.log(`in itineraryRequest2KobusSbscrp`);
    // console.log(JSON.stringify(postData))

    // requestWithSto에서 여정이 다 출발해 lists에 더이상 데이터가 없으면 reject한다
    // 반면 구독한 모든 알림을 다 보낸 경우 리스트에 더이상 데이터가 없으면 resolve한다 
    const message = await requestWithSi(postData, list, date, resIdx);

    return message;
}

/**
 * request With setInterval
 * 실질적으로 잔여좌석 확인을 구독하는 때에 kobus서버로 요청을 보내는 함수이다. 내부에 setTimeout이 있어 주기를 갖고 요청을 보낸다.
 * @param {string} postData 
 * @param {array} list eg) [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]
 * @param {string} date 몇 일인지 비교해서 당일이면 시간 지난 여정은 삭제하는 작업하려고
 * @param {number} resIdx
 * @returns 
 */
function requestWithSi(postData, list, date, resIdx) {
    //임시 실험용 count: count 횟수가 어느 정도 차면 잔여좌석이 0이 아닌 데이터를 의도적으로 보내 잘 동작하는지 확인한다.
    let count = 0;

    return new Promise((resolve, reject) => {
        let countPeroid = 0;
        let doCmpCount = 0;
        let isClearIntrvl = false;
        let tempDeleted = [];    //통고를 보냈기에 임시로 구독여정에서 제외시키기 위한 

        let intrvl = setInterval(async () => {
            try {
// ############################################################
            //foundTime으로 하지 말고 어차피 시간을 가져와서 시간 지난 여정은 처리할거니까 이 스코프에서 받는 편이 낫다고 본다.
            // 여기서 매 REQUEST_PERIOD마다 시간을 가져온다. 
            const foundTime = new Date();
            const ftDate = foundTime.getDate();
            const ftHours = foundTime.getHours();
            const ftMinutes = foundTime.getMinutes();
            const ftSeconds = foundTime.getSeconds();
            
            doCmpCount++

            //여기서 출발시간이 현재시간보다 일찍인 여정은 list에서 삭제
            if (date === ftDate && doCmpCount === CMP_PERIOD) {
                doCmpCount = 0;
                
                list = list.filter(entry => {
                    const [entryHours, entryMinutes] = entry[DEPARTURE_TIME].split(`:`).map(e => +e);
                    if (entryHours*60+entryMinutes < ftHours*60+ftMinutes) {
                        console.log(`시간이 지나 리스트에서 ${JSON.stringify(entry)}는 삭제한다.`)
                        return false;
                    }

                    return true;
                });
            }

            const listLen = list.length;    //시간이 지나면서 list에서 이미 출발한 여정은 버리기 때문에 인터벌마다 리스트 길이가 달라진다.
            
            //길이가 0인 의미는 시간이 지나 살아있는 여정이 잔여석을 남기지 않고 출발했다는 의미
            if (listLen === 0 && tempDeleted.length === 0) {
                reject({error: true, predictedError: true, type: contentType.NOTIFICATION, content: {contentMessage: `등록했던 스케줄(들)에서 잔여석이 생기지 않고 출발했습니다.`, resIdx}});
                return clearInterval(intrvl);
            }

            // startT와 endT는 한번요청으로 ec2 프리티어 서버에서 얼마나 걸려서 응답을 받는지 확인한다.
            let startT =  new Date();
            // #####################TEST###############
            glbCount++;
            // #############################################################
            // 정상적으로 전달되면 {error: false, content: {contentMessage: [...]}}
            const result = await itineraryRequest2Kobus(postData);
            let endT = new Date();
            
            const data = content.contentMessage; 
            const dataLen = data.length;
            let foundList = []; //잔여좌석이 생긴 여정을 담는다.
            
            // ############################TEST#############################
            // 구독 카운트따라 리스트와 result가 잘 나오는지 확인
            console.log(`한번 kobus요청에 걸리는 시간`);
            console.log(endT-startT);   //1593
            
            if (glbCount === 1) {
                console.log(`count: ${glbCount} data:\n${JSON.stringify(data)}\n구독리스트: ${JSON.stringify(list)}`);                
            } else {
                console.log(`count: ${glbCount}\n 구독리 ${JSON.stringify(list)}`);
            }

            if (glbCount === DEBUG_SBSCRPCNT) {
                console.log(`\n\n자 잔여석 생기는 때입니다.\ndata:\n${JSON.stringify(data)}\n참고로 구독중인 리스트는\n${JSON.stringify(list)}`)
            }
            // ######################################################
            
            let tempList = list;    //tempList를 필터하고 for루프 끝나면 list = tempList한다.

            //매칭되는 여정이 있다면 즉시 푸쉬알림이 목표다.
            for (let i=0; i<listLen; ++i) {     
                const listEntry = list[i];
                const tempDprtTime = listEntry[DEPARTURE_TIME];
                // ################################TEST#####################
                // if (glbCount === DEBUG_SBSCRPCNT) {
                //     console.log(`tempDprtTime ${tempDprtTime}`);
                // }
                // #########################################################
                
                for (let j=0; j<dataLen; ++j) {
                    const tempEntry = data[j];

                    //만약 실시간으로 요청한 여정에 잔여좌석이 있다면 foundList에 넣는다.
                    if (tempEntry[DEPARTURE_TIME] === tempDprtTime) {
                        // #########################################TEST########
                        // if (glbCount == DEBUG_SBSCRPCNT) {
                        //     console.log(`tempEntry of data ${JSON.stringify(tempEntry)}`);
                        // }
                        // #####################################################
                        const tempRemain = +(tempEntry[REMAIN].slice(0,2));
                         
                        if (tempRemain > 0) {
                            //foundList에 넣고 list에서 빼고, setTimeout진행시키고, tempDeleted에 푸시하고
                            foundList.push(tempEntry);
                            tempList = tempList.filter(entry => entry[DEPARTURE_TIME] !== tempEntry[DEPARTURE_TIME]);
                            addListWithSto(listEntry);
                            tempDeleted.push(1);

                            break;
                        }
                    }
                }
            }    
            
            list = tempList;

            // ####################################TEST#####################
            //foundList에 담겨 있다면 유저가 구독 하는 여정 중에 잔여석있는 여정이 생긴 것이다. 즉시 메시지를 보내야 한다.
            console.log(`foundList ${JSON.stringify(foundList)}`);

            if (glbCount === DEBUG_SBSCRPCNT) {
                glbCount = 0;
                //test
                // if (count === 1) {
                //     list = partialZero;
                //     console.log(`list = partialZero으로 만듬`)
                // } else if (count === 2) {
                //     list = noZero;
                //     console.log(`list = noZero로`);
                // }
                // count++;
                
            }

            if (foundList.length > 0) {
                // success프로퍼티가 true인 것은 에러가 발생하지 않고 데이터를 전달한다는 것
                parentPort.postMessage({success: true, message: {foundList, resIdx, time: {hours: ftHours, minutes: ftMinutes, seconds: ftSeconds}, date}, type: contentType.NOTIFICATION});
            } 
            } catch (errorContainer) {
                const {error, predictedError, type, content} = errorContainer;
                console.log(error, predictedError, type, content);
                // let result = {...errorContainer};
                // result.content.resIdx = resIdx;
                // console.log(`result ${JSON.stringify(result)}`);

                // if (error === true) {
                //     reject(errorContainer);
                //     return clearInterval(intrvl);
                // }
            }
        }, REQUEST_PERIOD);

        function addListWithSto(entry) {
            console.log(`들어왔다 addList`)
            setTimeout(() => {
                console.log(`list에 제거된 엔트리 ${JSON.stringify(entry)} 다시 추가합니다.`);
                tempDeleted.shift();
                list.push(entry);
            }, LIST_ADD_PERIOD);
        }
    });

    
}
