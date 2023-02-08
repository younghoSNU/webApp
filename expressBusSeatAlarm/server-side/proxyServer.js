#!/usr/local/bin/node
const express = require('express');
const cors = require('cors');
const webpush = require('web-push');

// 꼭 워커가 필요한 것은 아니지만 연습삼아
const { Worker } = require('worker_threads');

const app = express();

const PORT = 3000;
const WORKERDIR = __dirname + "/request2kobusW.js";

let dummyDb = {};
let cnt = 0;

app.use(cors());
app.use(express.text({ type: `text/plain` }));
app.use(express.json());

app.post('/exprm', (req, res) => {
    //req가 올바는 형식인지 확인 아니면 res로 invalid 전송

    console.log(`request from /exprm is accepted to server!`);
    const worker = new Worker(WORKERDIR);
    console.log(`made worker done on ${WORKERDIR}`);
    worker.postMessage(req.body);

    worker.on('message', msg => {
        res.send(JSON.stringify(msg));
    })
});

app.post(`/save-subscription`, async (req, res) => {
    console.log(`enter /save-subscription`);

    let { subscription, itnrData } = req.body;
	subscription = JSON.parse(subscription);

    console.log(`subscription\n${JSON.stringify(subscription)}`);
    console.log(`itnrData\n${JSON.stringify(itnrData)}`);

    const sbscrpWorker = new Worker(WORKERDIR);
    let resIdx = await saveSbscrp2DB(subscription);
    let [year, month, tempDate] = itnrData.split(`/`);
    let date = tempDate.slice(0,2);
    let day = tempDate.slice(3,4);
    const postData = {
        dprtNm: itnrData.dprtNm,
        arvlNm: itnrData.arvlNm,
        year,
        month,
        date,
        day,
        lists: itnrData.lists,
        resIdx
    };

    sbscrpWorker.postMessage(postData);

    sbscrpWorker.on(`message`, msg => {
        webpush.sendNotification(dummyDb[`${msg.resIdx}`] , msg);
    })
    res.json({ message: `success to save in db`});

    // setTimeout(() => {
    //     webpush.sendNotification(dummyDb.subscription, `done!!!!!`);
    // },2000);
});

//임시 데이터베이스 접속 함수
async function saveSbscrp2DB (subscription) {
    const idx = cnt;
    dummyDb[`${idx}`] = subscription;
    cnt++;

    return idx;
}

app.listen(PORT, () => {
    console.log(`proxy server is listening on prot ${PORT}`);
});
