#!/usr/local/bin/node
const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const { PUBLIC_KEY, PRIVATE_KEY } = require(`./secureInfo.js`)

// 꼭 워커가 필요한 것은 아니지만 연습삼아
// 막상 생각해보면, 유저 한 명마다 하나의 프로세스를 사용하고 
const { Worker } = require('node:worker_threads');
const fs = require(`node:fs`);

const app = express();

const PORT = 3000;
const WORKER_FILE = __dirname + "/request2kobusW.js";
const MESSAGE = `message`;
const MAIL = `hois1998@snu.ac.kr`;
const DB_FILE = __dirname + `/db.json`;
const SUBSCRIPTION_LOG_FILE = __dirname + `subscription.log`;

let dummyDb = {};
let cnt = 0;

//########################################################
let WORKER_LISTS = new Map();
// ######################################################
// ######################################TEST##############################
// 에러 타입을 임시로 사용 중 
const contentType = {
    NOTIFICATION: `notification`,
    ALERT: `alert`,
    SILENCE: `silence`,
};
// #########################################################################
app.use(cors());
app.use(express.text({ type: `text/plain` }));
app.use(express.json());


webpush.setVapidDetails(`mailto:`+MAIL, PUBLIC_KEY, PRIVATE_KEY);

app.post('/exprm', (req, res) => {
    //req가 올바는 형식인지 확인 아니면 res로 invalid 전송
    console.log(`request from /exprm is accepted to server!`);
    
    const worker = new Worker(WORKER_FILE);
    worker.postMessage(req.body);
    
    //msg는 {success: true/false, type: `display`/`notification`, message: content}다. success가 false일 경우 따로 type은 없다.
    worker.on('message', msg => {
        const {success, type, message} = msg;
        if (success === false) {
            console.error(`kobus서버에서 여정 리스트를 불러오는 과정에서 에러가 발생했습니다.`);
        } else {
            console.log(`성공적으로 여정 리스트를 불러왔습니다.`);
        }

        res.send(JSON.stringify(msg));
    });
});

/**
 * req.body = {subscription, itnrData}
 * itnrData = {fullDate: `2023/02/13(월)`, dprtNm: `아산온양`, arvlNm: `서울경부`, list: [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]}
 */
app.post(`/save-subscription`, async (req, res) => {
    console.log(`request from /save-subscription is accepted to server!`);

    let { subscription, itnrData } = req.body;
	subscription = JSON.parse(subscription);

    // console.log(`subscription\n${JSON.stringify(subscription)}`);
    // console.log(`itnrData\n${JSON.stringify(itnrData)}`);

    const sbscrpWorker = new Worker(WORKER_FILE);
    const sbscrpWorkerId = sbscrpWorker.threadId;

    console.log(`워커의 아이디는 ${sbscrpWorkerId}`);
    //임시로 db #####################################################
    let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    WORKER_LISTS.set(sbscrpWorkerId, sbscrpWorker);
    // ##############################################################
    
    //임시로 데이터베이스와 상호작용함을 나타내기 위해 await을 사용
    let resIdx = await saveSbscrp2DB(subscription);
    
    let [year, month, tempDate] = itnrData.fullDate.split(`/`);
    let date = tempDate.slice(0,2);
    let day = tempDate.slice(3,4);
    
    db[subscription.endpoint] = {
        threadId: sbscrpWorkerId,
        year,
        month,
        date,
        list: itnrData.list
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(db));

    const postData = {
        dprtNm: itnrData.dprtNm,
        arvlNm: itnrData.arvlNm,
        year,
        month,
        date,
        day,
        list: itnrData.list,
        resIdx
    };
    //##########################################################
    sbscrpWorker.postMessage(postData);
    //########################################################3
    
    //유저의 구독을 기록하기 위한 파일
    fs.appendFileSync(SUBSCRIPTION_LOG_FILE, `${dprtNm}_${arvlNm}_${year}_${month}_${date}_${list}`);
   
    //msg는 {success: true/false, type: `display`/`notification`, message: content}다. success가 false일 경우 따로 type은 없다.
    //구독 성공 msg
    // {success: true, message: {foundList, resIdx, time: {hours: foundTime.getHours(), minutes: foundTime.getMinutes(), seconds: foundTime.getSeconds()}, date: '1'}, type: `notification`}
    sbscrpWorker.on(`message`, async (msg) => {
        try {  
            console.log(`워커에서 넘어온 메시지\n${JSON.stringify(msg)}`);
    
            //이렇게 먼저 케이스 분류하고 케이스에 따라 변수 선언을 하자.
            // if (msg.success) {

            // } else {

            // }

            const {success, type, message} = msg;
            const { foundList, resIdx, time, date, contentMessage} = message;
            //db에서 유저 구독 데이터를 가져온다.
            const dbSbscrp = dummyDb[String(resIdx)];
            //type을 명시하긴 했지만 라우팅이 달리 돼있어, 여기로 type: 'display'인 경우는 없다.
            console.log(`더미디비에서 가져온 구독정보\n${JSON.stringify(dbSbscrp)}`);
            console.log(`글로벌에서 가져온 구독 정보 ${JSON.stringify(subscription)}`)
            
            if (success) {
                //통고를 보내는 부분이 아니라 모든 구독한 여정이 출발하거나 모든 여정에 통고를 보낸 경우 구독을 끝내는 것이다. 서비스워커 등록도 없앤다.
                if (type === contentType.NOTIFICATION) {
                    const payload = JSON.stringify({success, message: {foundList, time, date}, type});
                    await webpush.sendNotification(dbSbscrp, payload);
                } else {                    
                    // const payload = JSON.stringify({success, message: msg0, type})
                    // await webpush.sendNotification(dbSbscrp, payload);

                }
            } else {
                if (type === contentType.NOTIFICATION) {
                    console.log(`contentType이 notification입니다.`)
                    const payload = JSON.stringify({success, type, message: contentMessage});
                    await webpush.sendNotification(dbSbscrp, payload);
                } else if (type === contentType.ALERT) {
                    console.log(`contentType is ALERT 그렇지만 alert불가능이라 통고로`);
                    const payload = JSON.stringify({success, type, message: contentMessage});
                    await webpush.sendNotification(dbSbscrp, payload);
                }
                // if (type === MESSAGE) {
                //     const payload = JSON.stringify({success, message: msg0, type})
                //     await webpush.sendNotification(dbSbscrp, payload);
                // } else {
                //     const payload = JSON.stringify({success, message, type});
                //     await webpush.sendNotification(dbSbscrp, payload);
                // }
            }
            
        } catch(e) {
            console.error(e);
        }
    });

    res.json({ message: `success to save in db`});
});

/**
 * 유저가 보낸 특정 subscription정보를 바탕으로 특정 워커(서비스 워커 아님 주의)를 삭제할 겁니다. 
 */
app.post(`/delete-subscription`, async (req, res) => {
    try {
        const endpoint = req.body;

        console.log('body endpoint')
        console.log(endpoint)
    
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    
        if (db[endpoint]) {
            //쓰레드 아이디로 삭제해줘야 한다.
            const threadId = db[endpoint].threadId;
            let selectedWorker = WORKER_LISTS.get(threadId);
            
            if (selectedWorker == undefined) {
                throw new Error(`no worker for threadId: ${threadId}`);
            }
            
            //선택한 워커 종료
            selectedWorker.terminate();

            //WORKER_LIST와 db에서 삭제하려는 threadId랑 endpoint를 각각 제거해준다.
            WORKER_LISTS.delete(threadId);
            // delete db[endpoint]; 해결해야하는 문제가 있다 동시에 다른 유저가 들어와서 파일에 작성하는데 과거 파일에서 해당 엔드포인트 붙이고 그 수정된 파일을 db에 넣게 되면 막 들어온 유저의 엔드포인트 정보는 사라진다

            res.send(`successfully terminated the worker`)
            
        } else {
            throw new Error(`no endpoint \n${endpoint}\nin DB`);
        }
        //나중에는 여기에 파일만들어서 db처럼 활용할거다. 
    } catch(e) {
        res.status(404).send(e);
    }
});

/**
 * 임시 데이터베이스 접속 함수
 * @param {subscription from pushManager} subscription 
 * @return {number} idx
 */
async function saveSbscrp2DB (subscription) {
    const idx = cnt;
    dummyDb[`${idx}`] = subscription;
    cnt++;

    return idx;
}

app.listen(PORT, () => {
    console.log(`proxy server is listening on prot ${PORT}`);
});
