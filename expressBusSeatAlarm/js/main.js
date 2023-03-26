//입력으로 출발날짜, 출발지, 도착지를 모두 선택한 상태에서 
// '검색'버튼을 누르면 데이터가 kobus서버로 전송되고 출력을 
// 받는다.
import { listRequest } from "./listRequest.js";
import { terminalCode } from "./terminalCode.js";

const HIDDEN_CLS_NM = `hidden`;
const NOTIFICATION_SW_FILE = `/js/notificationSW.js`
const SERVER_URL = `https://youngho.click`;


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
const subscribeButton = itnrForm.querySelector(`.subscribe-button`);
const deleteSbscrpButton = itnrForm.querySelector(`.delete-subscription-button`);

//제출버튼을 다시 누르면 원래 html템플릿 위에서 dom에 의해 새 템플릿이 만들어져야 하므로
const itnrDivTemplate = itnrDiv.innerHTML;

let glbItnrList;    //응답으로 받은 itnrList는 계속 사용할거기 때문에...
let glbSwData = Object.create({});  //서비스워커에게 전달할 변수들이다. 나중에 만들어지는 형태는 
// {fullDate: `2023/02/13(월)`, dprtNm: `아산온양`, arvlNm: `서울경부`, list: [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]}
glbSwData.list = [];
itnrDiv.updated = false;

let tempHTML = ``;
for (const name of Object.keys(terminalCode)) {
    // ############################################################################
    // tempHTML += `<option value="${name}">${name}</option>\n`;
    let SELECTED;
    if (name == `서울경부`) {
        SELECTED = `selected`;
    }
    tempHTML += `<option value="${name}" ${SELECTED}>${name}</option>\n`;

    // ############################################################################
}

dprtSelect.innerHTML += tempHTML;

tempHTML = ``;
for (const name of Object.keys(terminalCode)) {
    // ############################################################################
    // tempHTML += `<option value="${name}">${name}</option>\n`;
    let SELECTED;
    if (name == `아산온양`) {
        SELECTED = `selected`;
    }
    tempHTML += `<option value="${name}" ${SELECTED}>${name}</option>\n`;

    // ############################################################################
}
arvlSelect.innerHTML += tempHTML;


searchForm.addEventListener('submit', onSubmitInput);

async function onSubmitInput(e) {
    try {
        e.preventDefault(); //페이지를 새로고침하는 기본값을 없앤다.    

        if (itnrDiv.updated) {
            itnrDiv.updated = false;
            itnrDiv.innerHTML = itnrDivTemplate;
            notifSpan.classList.add(HIDDEN_CLS_NM);
            subscribeButton.classList.add(HIDDEN_CLS_NM);
            deleteSbscrpButton.classList.add(HIDDEN_CLS_NM);
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
        subscribeButton.fullDate = fullDate;
        subscribeButton.dprtNm = dprtNm;
        subscribeButton.arvlNm = arvlNm;

        let itnrList = await listRequest(dprtNm, arvlNm, year, month, date, day);  //디버깅때문에 임시로 let사용

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
            subscribeButton.addEventListener(`click`, onClickSubscribeButton);
        }
           
    } catch (e) {
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
        let inputCheckbox = null;

        p.classList.add(`itnr-item-container`);
        spanTime.classList.add(`time`);
        spanTime.style.width = `30%`;
        spanTime.innerText = dprtTime;
        spanBusCmp.classList.add(`busCmp`);
        spanBusCmp.style.width = `25%`;
        spanBusCmp.innerText = busCmp;
        spanBusGrd.classList.add(`busGrd`);
        spanBusGrd.style.width = `35%`
        spanBusGrd.innerText = busGrade;
        spanRmn.classList.add(`remain`);
        spanRmn.innerText = remain.padStart(4, `0`);

        //매진된 여정이 있다.
        if (remain[0] === '0') {
            isRmnZero = true;
            inputCheckbox = document.createElement(`input`);
            inputCheckbox.type = `checkbox`;
            inputCheckbox.classList.add(`checkbox`);
            inputCheckbox.value = idx;
        }

        p.appendChild(spanTime);
        p.appendChild(spanBusCmp);
        p.appendChild(spanBusGrd);
        p.appendChild(spanRmn);

        if (inputCheckbox) {
            p.appendChild(inputCheckbox);
        }
        
        document.querySelector(`#loader`).classList.add(HIDDEN_CLS_NM);
        itnrDiv.appendChild(p);
        // 여기에 로딩해제하고
    }

    if (isRmnZero) {
        notifSpan.classList.remove(HIDDEN_CLS_NM);
        subscribeButton.classList.remove(HIDDEN_CLS_NM);

        //여정 리스트의 table-cell width를 조정한다.
        let spanTimeArr = document.getElementsByClassName('time');
        let spanBusGrdArr = document.getElementsByClassName('busGrd');
        const len = spanTimeArr.length;
        
        //로딩시 만약 isRmnZero == true면 매진 스케줄이 있다는 의미이고 그러면 width조정
        for (let i=0; i<len; ++i) {
            spanTimeArr[i].style.width = `22%`;
            spanBusGrdArr[i].style.width = `20%`;   
        }
    }

    itnrDiv.updated = true;

    return true;
}

/**
 * 알림등록버튼을 눌렀을 때 동작한다
 * @param {Event} e 
 */
async function onClickSubscribeButton (e) {
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
            let selectedItnrs = `"${subscribeButton.fullDate} ${subscribeButton.dprtNm}->${subscribeButton.arvlNm}" 스케줄 중 다음을 구독합니다.\n`;
            
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
                deleteSbscrpButton.classList.remove(HIDDEN_CLS_NM);
                deleteSbscrpButton.addEventListener('click', onClickDeleteSbscrpButton);
                
                alert(`성공적으로 등록했습니다.\n빈자리가 생기면 바로 알림드릴게요!`)
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
    let doRegister = true;

    const pastSW = await navigator.serviceWorker.getRegistration(NOTIFICATION_SW_FILE);
    console.log(`past service worker`);
    console.log(pastSW);

    if (pastSW !== undefined) {
        doRegister = false;

        if (confirm(`이전에 등록한 알림이 존재합니다.\n만약 새알림을 등록하면 이전 알림은 삭제됩니다.`)) {
            doRegister = true;
            await pastSW.unregister();
        }
    }

    if (doRegister) {
        const swRegistration = await navigator.serviceWorker.register(NOTIFICATION_SW_FILE+`?config=`+JSON.stringify(swData));
        console.log(swRegistration)
        console.log('registered service worker if it is new service worker');    
    }
}

async function onClickDeleteSbscrpButton() {
    try {
        const pastSW = await navigator.serviceWorker.getRegistration(NOTIFICATION_SW_FILE);

        console.log(await pastSW.pushManager.getSubscription())

        if (pastSW === undefined) {
            alert(`등록된 알림이 존재하지 않습니다.`)
        } else {
            const subscription = await pastSW.pushManager.getSubscription();
            let endpoint = subscription.endpoint;

            if (typeof(endpoint) != `string`) {
                endpoint = String(endpoint);
            }
            //서버에 존재하는 pid를 삭제한다. 
            //이전에 등록했던 알림이 존재하고 그럼면 서버에서 이 알림을 삭제한다. 
            const deleted = await deleteSbscrpRequest(endpoint);
            await pastSW.unregister();
            alert(`등록된 알림을 제거했습니다.\n사용해주셔서 고마워요:)`)
            //좋아요 싫어요 모아서 서버에 저장하기
        }
    } catch (e) {
        console.log(`onClickDeleteSbscrpButton입니다만 아직 catch를 handle하지 않았어요.`)
        console.log(e);
    }
}

async function deleteSbscrpRequest(push_endpoint) {
    return new Promise((resolve, reject) => {
        try{
            const deleteSbscrpXhr = new XMLHttpRequest();
            const location = `/delete-subscription`;
        
            deleteSbscrpXhr.open('POST', SERVER_URL+location, true);
            
            deleteSbscrpXhr.setRequestHeader('Content-Type', `text/plain`);
            
            // 만약에 성공적으로 서버의 해당 워커를 삭제했으면 alert를 보낸다
            deleteSbscrpXhr.addEventListener(`readystatechange`, () => {
                if (deleteSbscrpXhr.readyState === XMLHttpRequest.DONE) {
                    if (deleteSbscrpXhr.status >= 200 && deleteSbscrpXhr.status < 300) {
                        // 성공적으로 응답을 받은 것이다. 그러니 alert로 성공 메시지 보내자.
                        alert(`성공적으로 알림 삭제를 마쳤습니다.`);
                        resolve(true);
                    } else {
                        alert(`상태코드 에러: ${deleteSbscrpXhr.status}\n0: XMLHttpRequest에러\n300번대: 요청에러\n500번대: 응답에러\n지속적인 에러 발생시 hois1998@snu.ac.kr 로 알려주세요!`);
                        console.log(deleteSbscrpXhr.statusText);
                        reject(`자자 ${deleteSbscrpXhr.statusText}`);
                    }
                } 
            })
        
            deleteSbscrpXhr.send(push_endpoint);
        } catch (e) {
            console.log(e)
        }
        
    });
    
}


