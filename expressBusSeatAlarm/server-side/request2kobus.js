const { parentPort } = require('worker_threads');
const https = require('https');

//유저들이 얼마나 사용하는지 확인하는 작업으 로그 추가 필요

parentPort.once('message' )