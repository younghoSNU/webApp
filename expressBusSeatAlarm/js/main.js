//입력으로 출발날짜, 출발지, 도착지를 모두 선택한 상태에서 
// '검색'버튼을 누르면 데이터가 kobus서버로 전송되고 출력을 
// 받는다.

import { itineraryRequest } from "./exprmKobusRequest.js";

// console.log(zero);

const HIDDEN_CLS_NM = `hidden`;
const NOTIFICATION_SW_FILE = `/js/notificationSW.js`

//document에 property로 제출된 출발날짜, 출발지, 도착지를 넣으면 됨으로 굳이 모듈끼리 import/export가 필요없다
// import {serverRes} from './kobusRequest.js';
const searchForm = document.querySelector(".search-menu");
const dateSelect = document.querySelector("#date-select");
const dprtSelect = document.querySelector("#dprt-select");
const arvlSelect = document.querySelector("#arvl-select");

const itnrForm = document.querySelector(`.itnr-form`);
const itnrDiv = itnrForm.querySelector(`.itnr-content-container`);
//아래 두 엘리먼트는 빈좌석이 있을 때만 활성화된다.
const notifSpan = itnrForm.querySelector(`#notif-span`);
const chckSbmInput = itnrForm.querySelector(`input[type="button"]`);

//제출버튼을 다시 누르면 원래 html템플릿 위에서 dom에 의해 새 템플릿이 만들어져야 하므로
const itnrDivTemplate = itnrDiv.innerHTML;

let glbItnrList;    //응답으로 받은 itnrList는 계속 사용할거기 때문에...
let glbSwData = Object.create({});  //서비스워커에게 전달할 변수들이다. 나중에 만들어지는 형태는 
// {fullDate: `2023/02/13(월)`, dprtNm: `아산온양`, arvlNm: `서울경부`, list: [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]}
glbSwData.list = [];
itnrDiv.updated = false;

searchForm.addEventListener('submit', onSubmitInput);

async function onSubmitInput(e) {
    try {
        e.preventDefault(); //페이지를 새로고침하는 기본값을 없앤다.    

        if (itnrDiv.updated) {
            itnrDiv.updated = false;
            itnrDiv.innerHTML = itnrDivTemplate;
            notifSpan.classList.add(HIDDEN_CLS_NM);
            chckSbmInput.classList.add(HIDDEN_CLS_NM);
        }

        //itnrForm에서 itnr-content-contain클래스는 안보이더라도 폼의 틀은 보여지도록 한다.
        if (itnrForm.classList.contains(HIDDEN_CLS_NM)) {
            itnrForm.classList.remove(HIDDEN_CLS_NM);
        }

        // console.dir(e)
        const fullDate = dateSelect.value;  // 2023/01/25(수)
        const dprtNm = dprtSelect.value; // 아산온양
        const arvlNm = arvlSelect.value; // 서울경부
        glbSwData.fullDate = fullDate;
        glbSwData.dprtNm = dprtNm;
        glbSwData.arvlNm = arvlNm;

        // fullDate변수 파싱
        const [year, month, dateNday] = fullDate.split('/');
        const date = dateNday.slice(0, 2);
        const day = dateNday.slice(3, 4);

        // chckSbmInput에서 confirm을 할 때 date도 보여준다.
        chckSbmInput.fullDate = fullDate;
        chckSbmInput.dprtNm = dprtNm;
        chckSbmInput.arvlNm = arvlNm;

        let itnrList = await itineraryRequest(dprtNm, arvlNm, year, month, date, day);  //디버깅때문에 임시로 let사용

        // console.log(`successfully got response in client`);
        // console.log(itnrList);
        
        // ################################TEST####################
        // if (dprtNm == `아산온양`) {
        //     itnrList = zero;
        // } else {
        //     itnrList = noZero;
        // }
        // ########################################################
        // 서버에서 테스트 하도록 수정
        glbItnrList = itnrList;

        
        const dsp = displayItnrList(itnrList);  //알림등록버튼 활성화 여부를 결정한다.

        if (dsp) {
            chckSbmInput.addEventListener(`click`, onSubmitChck);
        }
           
    } catch (e) {
        console.log(e);
        itnrForm.classList.add(HIDDEN_CLS_NM);
        alert(e);
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
        
        document.querySelector(`#loader`).classList.add(HIDDEN_CLS_NM);
        itnrDiv.appendChild(p);
        // 여기에 로딩해제하고
    }

    if (isRmnZero) {
        notifSpan.classList.remove(HIDDEN_CLS_NM);
        chckSbmInput.classList.remove(HIDDEN_CLS_NM);
    }

    itnrDiv.updated = true;

    return true;
}

/**
 * 알림등록버튼을 눌렀을 때 동작한다
 * @param {Event} e 
 */
async function onSubmitChck (e) {
    try {
        const chckList = document.querySelectorAll(`.checkbox`);
        let checkedList = [];
    
        //체크박스 중에 체크된 것의 여부를 확인한다.
        //
        chckList.forEach(el => {
            if (el.checked) {
                const idx = +el.value;
                checkedList.push(idx);
            }
        });
    
        //체크된 박스가 0개면 alert
        if (!checkedList.length) {
            alert(`등록할 알림이 선택되지 않았습니다.`);
        } else {
            //등록한 내용이 맞는지 confirm에서 확인 
            let selectedItnrs = `"${chckSbmInput.fullDate} ${chckSbmInput.dprtNm}->${chckSbmInput.arvlNm}" 스케줄 중 다음을 구독합니다.\n`;
            
            for (const idx of checkedList) {
                const itnrEntry = glbItnrList[idx];
                selectedItnrs += `출발시간: ${itnrEntry.dprtTime} 등급: ${itnrEntry.busGrade}\n`;
                //sw가 서버를 구독할 때, 서버에서는 kobus의 날짜, 출발지, 도착지 여정 중 idx에 해당하는 것의 좌석만 확인하면 되므로 
                //추가로 idx는 시간이 지나면 사라져 파싱에 어려움이 있지만 dprtTime(출발시간)은 하나 밖에 없는 id처럼 사용할 수 있어 kobus 응답으로 받은 데이터를 파싱할 때 편하다 
                glbSwData.list.push({idx, dprtTime: glbItnrList[idx][`dprtTime`]});
            }
            
            
            if (confirm(selectedItnrs)) { //유저에게 원하는 여정(들)이 잘 선택됐는지 확인시켜준다. 
                //체크버튼을 가린다
                //근데 체크버튼을 가리지 않고 sw있는지 확인
                // e.target.classList.add(HIDDEN_CLS_NM);
                await reqNotificationPermission();
                await registerServiceWorker(glbSwData);
               
            } else {
                alert(`사용자가 취소했습니다.`);
            }
        }
    } catch (e) {
        console.error(e);
    }
    
}

/**
 * 통고허용을 요청하는 함수로 거절하거나 x를 눌러 요청창을 닫을 경우 다시 요청이 가도록 한다. 
 */
async function reqNotificationPermission() {
    const permission = await Notification.requestPermission();
    console.log(permission)
    if (permission === `default`) {
        alert(`알림을 허가해 줘야 서비스를 이용하실 수 있습니다.`);

        await reqNotificationPermission();
    }

    if (permission === `denied`) {
        alert(`알림을 '차단'하셨습니다.\n검색주소(url) 왼쪽 좌물쇠 버튼을 눌러 알림을 허용해주시고 페이지를 새로고침해 주세요`)
    }

    return;
}
/**
 * 
 * @param {object} swData {fullDate: `2023/02/13(월)`, dprtNm: `아산온양`, arvlNm: `서울경부`, list: [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]} 
 */
async function registerServiceWorker(swData) {
    if (!(`serviceWorker` in navigator)) {
        throw new Error(`no serviceWorker in browser`);
    }

    if (!(`PushManager` in window)) {
        throw new Error(`no push manager in browser`);
    }

    // 서비스워커로부터 postMessage로 메시지를 받으면 동작하는 이벤트이다.
    navigator.serviceWorker.addEventListener(`message`, event => {
        alert(event.data);
    });

    const pastSW = await navigator.serviceWorker.getRegistration(NOTIFICATION_SW_FILE);
    console.log(pastSW);

    if (pastSW !== undefined) {
        console.log(`이전 서비스워커 삭제 필요`);
    }

    const swRegistration = await navigator.serviceWorker.register(NOTIFICATION_SW_FILE+`?config=`+JSON.stringify(swData));
    console.log(swRegistration)
    console.log('registered service worker');    

}



