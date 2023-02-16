#!/usr/local/bin/node
const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const { PUBLIC_KEY, PRIVATE_KEY } = require(`./secureInfo.js`)
// 꼭 워커가 필요한 것은 아니지만 연습삼아
const { Worker } = require('worker_threads');

const app = express();

const PORT = 3000;
const WORKERDIR = __dirname + "/request2kobusW.js";
const DISPLAY = `display`;
const NOTIFICATION = `notification`;
const MESSAGE = `message`;
const MAIL = `hois1998@snu.ac.kr`;

let dummyDb = {};
let cnt = 0;

app.use(cors());
app.use(express.text({ type: `text/plain` }));
app.use(express.json());


webpush.setVapidDetails(`mailto:`+MAIL, PUBLIC_KEY, PRIVATE_KEY);

app.post('/exprm', (req, res) => {
    //req가 올바는 형식인지 확인 아니면 res로 invalid 전송

    console.log(`request from /exprm is accepted to server!`);
    const worker = new Worker(WORKERDIR);
    console.log(`made worker done on ${WORKERDIR}`);
    worker.postMessage(req.body);
    
    //msg는 {success: true/false, type: `display`/`notification`, message: content}다. success가 false일 경우 따로 type은 없다.
    worker.on('message', msg => {
        if (msg.success === false) {
            console.error(`kobus서버에서 여정 리스트를 불러오는 과정에서 에러가 발생했습니다.`);
        } else {
            console.log(`성공적으로 여정 리스트를 불러왔습니다.`);
        }

        res.send(JSON.stringify(msg));
    })
});

/**
 * req.body = {subscription, itnrData}
 * itnrData = {fullDate: `2023/02/13(월)`, dprtNm: `아산온양`, arvlNm: `서울경부`, list: [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]}
 */
app.post(`/save-subscription`, async (req, res) => {
    console.log(`enter /save-subscription`);

    let { subscription, itnrData } = req.body;
	subscription = JSON.parse(subscription);

    console.log(`subscription\n${JSON.stringify(subscription)}`);
    console.log(`itnrData\n${JSON.stringify(itnrData)}`);

    const sbscrpWorker = new Worker(WORKERDIR);
    let resIdx = await saveSbscrp2DB(subscription);
    let [year, month, tempDate] = itnrData.fullDate.split(`/`);
    let date = tempDate.slice(0,2);
    let day = tempDate.slice(3,4);
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

    sbscrpWorker.postMessage(postData);

    //msg는 {success: true/false, type: `display`/`notification`, message: content}다. success가 false일 경우 따로 type은 없다.
    //구독 성공 msg
    // {success: true, message: {foundList, resIdx, time: {hours: foundTime.getHours(), minutes: foundTime.getMinutes(), seconds: foundTime.getSeconds()}, date: '1'}, type: `notification`}
    sbscrpWorker.on(`message`, async msg => {
        try {
            console.log(`워커에서 메인쓰레드로 잔여석있는 여정 보냈고 메인이 받았다.`)
            console.log(`워커에서 넘어온 메시지\n${JSON.stringify(msg)}`);

            const {success, type, message} = msg;
            const { foundList, resIdx, time, date, msg} = message;
            const dbSbscrp = dummyDb[String(resIdx)];
            //type을 명시하긴 했지만 라우팅이 달리 돼있어, 여기로 type: 'display'인 경우는 없다.
            console.log(`더미디비에서 가져온 구독정보\n${JSON.stringify(dbSbscrp)}`);
            
            if (success) {
                //통고를 보내는 부분이 아니라 모든 구독한 여정이 출발하거나 모든 여정에 통고를 보낸 경우 구독을 끝내는 것이다. 서비스워커 등록도 없앤다.
                if (type === MESSAGE) {
                    const payload = JSON.stringify({success, message: msg})
                    await webpush.sendNotification(dbSbscrp, payload);
                } else {
                    const payload = JSON.stringify({success, message: {foundList, time, date}});
                    await webpush.sendNotification(dbSbscrp, payload);
                }
            } else {
                const payload = JSON.stringify({success, message});
                await webpush.sendNotification(dbSbscrp, payload);
            }
        } catch(e) {
            console.error(e);
        }
    });
    res.json({ message: `success to save in db`});
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
