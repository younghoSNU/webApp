//입력으로 출발날짜, 출발지, 도착지를 모두 선택한 상태에서 
// '검색'버튼을 누르면 데이터가 kobus서버로 전송되고 출력을 
// 받는다.

import { itineraryRequest } from "./exprmKobusRequest.js";


//document에 property로 제출된 출발날짜, 출발지, 도착지를 넣으면 됨으로 굳이 모듈끼리 import/export가 필요없다
// import {serverRes} from './kobusRequest.js';
const searchForm = document.querySelector(".search-menu");
const selectDate = document.querySelector("#date-select");
const selectDprt = document.querySelector("#dprt-select");
const selectArvl = document.querySelector("#arvl-select");

function onSubmitInput(e) {
    e.preventDefault(); //페이지를 새로고침하는 기본값을 없앤다.

    const fullDate = selectDate.value;  // 2023/01/25(수)
    const dprtNm = selectDprt.value; // 아산온양
    const arvlNm = selectArvl.value; // 서울경부

    let [year, month, dateNday] = fullDate.split('/');
    const date = dateNday.slice(0, 2);
    const day = dateNday.slice(3, 4);

    itineraryRequest(dprtNm, arvlNm, year, month, date, day)
        .then(val => console.log(`passed then function after resovle`))
        .catch(e => console.log(`padded catch function after reject`));
}

searchForm.addEventListener('submit', onSubmitInput);
