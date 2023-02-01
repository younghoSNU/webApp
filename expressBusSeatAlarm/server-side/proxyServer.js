const express = require('express');
const cors = require('cors');
// 꼭 워커가 필요한 것은 아니지만 연습삼아
const { Worker } = require('worker_threads');

const app = express();

const PORT = 3000;
const WORKERDIR = __dirname + "/request2kobus.js";

app.use(cors());

app.post('/exprm', (req, res) => {
    //req가 올바는 형식인지 확인 아니면 res로 invalid 전송

    console.log(`request is accepted to server!`);
    const worker = new Worker(WORKERDIR);
    console.log(`made worker done on ${WORKERDIR}`);
    worker.postMessage(req.body);

    worker.on('message', msg => {
        res.send(JSON.stringify(msg));
    })
});

app.listen(PORT, () => {
    console.log(`proxy server is listening on prot ${PORT}`);
});
