#!/usr/local/bin/node
const express = require('express');
const cors = require('cors');
const webpush = require('web-push');

// 꼭 워커가 필요한 것은 아니지만 연습삼아
const { Worker } = require('worker_threads');

const app = express();

const PORT = 3000;
const WORKERDIR = __dirname + "/request2kobus.js";

app.use(cors());
app.use(express.text({ type: `text/plain` }));
app.use(express.json());

app.post('/exprm', (req, res) => {
    //req가 올바는 형식인지 확인 아니면 res로 invalid 전송

    console.log(`request is accepted to server!`);
    const worker = new Worker(WORKERDIR);
    console.log(`made worker done on ${WORKERDIR}`);
    console.log(req.body);
    console.log(req);
    console.log(req.host);
    worker.postMessage(req.body);

    worker.on('message', msg => {
        res.send(JSON.stringify(msg));
    })
});

app.post(`/save-subscription`, async (req, res) => {
    console.log(`enter /save-subscription`);
    console.log(req.body);
    const { subscription, itnrData } = JSON.parse(req.body);
    await saveToDatabase(subscription);
    res.json({ message: `success to save in db`});

    // setTimeout(() => {
    //     webpush.sendNotification(dummyDb.subscription, `done!!!!!`);
    // },2000);
});

app.listen(PORT, () => {
    console.log(`proxy server is listening on prot ${PORT}`);
});
