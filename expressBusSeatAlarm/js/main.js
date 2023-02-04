//입력으로 출발날짜, 출발지, 도착지를 모두 선택한 상태에서 
// '검색'버튼을 누르면 데이터가 kobus서버로 전송되고 출력을 
// 받는다.

import { itineraryRequest } from "./exprmKobusRequest.js";
import { noZero, zero } from "./dbgInput.js";   //디버깅을 위해 임시려한 요청시 가져오는 데이터, noZero는 잔여석0인 경우가 없을 때, zero는 있을 때

// console.log(zero);

const HIDDEN_CLS_NM = `hidden`;

//document에 property로 제출된 출발날짜, 출발지, 도착지를 넣으면 됨으로 굳이 모듈끼리 import/export가 필요없다
// import {serverRes} from './kobusRequest.js';
const searchForm = document.querySelector(".search-menu");
const dateSelect = document.querySelector("#date-select");
const dprtSelect = document.querySelector("#dprt-select");
const arvlSelect = document.querySelector("#arvl-select");

const itnrForm = document.querySelector(`.itnr-form`);
const itnrDiv = itnrForm.querySelector(`.itnr-content-container`);
const notifSpan = itnrForm.querySelector(`#notif-span`);
const chckSbmInput = itnrForm.querySelector(`input[type="button"]`);

let glbItnrList;    //응답으로 받은 itnrList는 계속 사용할거기 때문에...

searchForm.addEventListener('submit', onSubmitInput);

async function onSubmitInput(e) {
    try {
        e.preventDefault(); //페이지를 새로고침하는 기본값을 없앤다.
        // console.dir(e)
        const fullDate = dateSelect.value;  // 2023/01/25(수)
        const dprtNm = dprtSelect.value; // 아산온양
        const arvlNm = arvlSelect.value; // 서울경부

        // fullDate변수 파싱
        const [year, month, dateNday] = fullDate.split('/');
        const date = dateNday.slice(0, 2);
        const day = dateNday.slice(3, 4);

        let itnrList = await itineraryRequest(dprtNm, arvlNm, year, month, date, day);  //디버깅때문에 임시로 let사용

        console.log(`successfully got response in client`);
        console.log(itnrList);
        
        if (dprtNm == `아산온양`) {
            itnrList = zero;
        } else {
            itnrList = noZero;
        }

        glbItnrList = itnrList;

        const dsp = displayItnrList(itnrList);  //알림등록버튼 활성화 여부를 결정한다.

        if (dsp) {
            chckSbmInput.addEventListener(`click`, onSubmitChck);
        }
           
    } catch (e) {
        console.log(e);
    }   
}

/**
 * 응답으로 받은 데이터를 활용해 여정 리스트를 만들고 디스플레이한다
 * @param {array} itnrList 
 * @returns 만약 데이터가 아예 없으면 false 있으면 true를 리턴한다
 */
function displayItnrList(itnrList) {
    //이렇게 하면 아규먼트가 상수가 된다.
    // const itnrList = arguments;
    //엘리먼트 생성시키고 hidden된 엘리먼트 해제해줘서 여정들이 리스트 디스플레이 되도록 만든다.
    
    let isRmnZero = false;  //하나라도 0인 좌석이 있을 때만 리스트 아래에 제출 버튼을 생성한다. 리스트 헤드에 알림등록탭을 생성한다.

    //여정이 하나도 리턴되지 않았을 때 경고 메시지를 준다.
    if (itnrList.length == 0) {
        alert(`입력한 정보에 해당하는 여정이 존재하지 않습니다!`);

        return false;
    }

    itnrForm.classList.remove(HIDDEN_CLS_NM);

    for (const [idx, etnr] of itnrList.entries()) {
        const { dprtTime, busCmp, busGrade, remain } = etnr;

        const p = document.createElement(`p`);
        const spanTime = document.createElement(`span`);
        const spanBusCmp = document.createElement(`span`);
        const spanBusGrd = document.createElement(`span`);
        const spanRmn = document.createElement(`span`);
        let inputChck = null;

        p.classList.add(`itnr-item-container`);
        spanTime.classList.add(`time`);
        spanTime.innerText = dprtTime;
        spanBusCmp.classList.add(`busCmp`);
        spanBusCmp.innerText = busCmp.padEnd(8, `_`);
        spanBusGrd.classList.add(`busGrd`);
        spanBusGrd.innerText = busGrade;
        spanRmn.classList.add(`remain`);
        spanRmn.innerText = remain.padStart(4, `0`);

        if (remain[0] === '0') {
            isRmnZero = true;
            inputChck = document.createElement(`input`);
            inputChck.type = `checkbox`;
            inputChck.classList.add(`checkbox`);
            inputChck.value = idx;
        }

        p.appendChild(spanTime);
        p.appendChild(spanBusCmp);
        p.appendChild(spanBusGrd);
        p.appendChild(spanRmn);

        if (inputChck) {
            p.appendChild(inputChck);
        }

        itnrDiv.appendChild(p);
    }

    if (isRmnZero) {
        notifSpan.classList.remove(HIDDEN_CLS_NM);
        chckSbmInput.classList.remove(HIDDEN_CLS_NM);
    }

    return true;
}

/**
 * 알림등록버튼을 눌렀을 때 동작한다
 * @param {Event} e 
 */
function onSubmitChck (e) {
    const chckList = document.querySelectorAll(`.checkbox`);
    let checkedList = [];

    //체크박스 중에 체크된 것의 여부를 확인한다.
    chckList.forEach(el => {
        if (el.checked) {
            checkedList.push(+el.value);
        }
    });

    //체크된 박스가 0개면 alert
    if (!checkedList.length) {
        alert(`등록할 알림이 선택되지 않았습니다.`);
    } else {
        //등록한 내용이 맞는지 확인 
        let selectedItnrs = ``;

        for (let idx of checkedList) {
            selectedItnrs += JSON.stringify(glbItnrList[idx]);
        }

        //체크한 여정들이 올바르게 체크됏는지 확인 후 맞다면
        if (confirm(selectedItnrs)) {
            //체크버튼을 가린다
            e.target.classList.add(HIDDEN_CLS_NM);
            //매 10초마다 서버에 가서 확인한다. 각 여정은 출발시간을 id로 활용할 수 있다. 여정에 빈자리가 있으면 알림을 보낸다.
            // Notification.requestPermission().then((result) => {
            //     console.log(result);
            // });

            let cnt = 0;
            let tempRpt = setInterval(() => {
                cnt++;

                if (cnt === 3) {
                    // 잔여좌석이 생겨서 때문에 알림을 준다.
                    clearInterval(tempRpt);
                    alert(`${selectedItnrs}에 잔여좌석이 생겼습니다.`);
                }
            },2000);

        } else {
            alert(`사용자가 취소했습니다.`);
        }
    }
}

