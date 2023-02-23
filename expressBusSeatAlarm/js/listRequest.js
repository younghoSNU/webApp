// 이제 더이상 nodejs module를 사용하지 않고 web APIs를 사용한다.
// import https from "https";
// import fs from "fs";
// import {JSDOM} from 'jsdom';

//주의할 점
// kobus데이터를 사용하고 있음을 숨기자.
// const Nm2Cd = {아산온양: `340`, 서울경부: `010`, 천안아산역: `343`, 배방정류소: `337`};
// Nm2Cd[`아산서부(호서대)`] = `341`;

/**
 * 
 * @param {String} dprtNm 
 * @param {String} arvlNm 
 * @param {String:4} year 
 * @param {String:2} month 
 * @param {String:2} date 
 * @param {String} day 월, 화, 수 등 요일 
 * @returns {success: true, message: Array(15), type: 'display'}
 * message: [
    {
        "dprtTime": "11:20",
        "busCmp": "(주)동양고속",
        "busGrade": "고속",
        "remain": "5 석"
    }, {...}
  ]
 */
export function listRequest(dprtNm, arvlNm, year, month, date, day) {
    /** XMLHttpRequest인스턴스에 헤더데이터를 넣어주려면 한번에 하나씩 넣어야 해서 for루프를 사용한다.
     * @param {object} obj 
     * @param {XMLHttpRequest instance} xhr 
     */
    function setHeaderData(obj, xhr) {
        for (const key in obj) {
          xhr.setRequestHeader(key, obj[key]);
        }
    }

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({dprtNm, arvlNm, year, month, date, day});

        console.log(`postDate check:\n ${postData}`);

        const headers = {
          'Content-Type': 'application/json',
        };

        const xhr = new XMLHttpRequest();

        xhr.open('POST', `https://youngho.click/exprm`, true);
        //set header
        setHeaderData(headers, xhr);

        // readyState의 종류
        // 0: uninitialized (초기화되지 않음)
        // 1: loading (로딩 중)
        // 2: loaded (로딩 완료)
        // 3: interactive (서버와의 통신 중)
        // 4: complete (서버와의 통신 완료)
        xhr.addEventListener(`readystatechange`, () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
                // Request finished. Do processing here.
                console.log(`xhr request and response succeed`);
            } else {
                reject(`상태코드 에러: ${xhr.status}\n300번대 요청에러\n500번대 응답에러`);
            }
          } 
        });
        
        //load이벤트는 응답을 성공적으로 받아왔을 때만 실행된다. 성공적인 응답은 status code가 200번대임을 의미한다. 그렇다면 코드가 200이 아닐 때 유저가 알 수 있도록 처리를 해줘야 하는데 이는 readyState이벤트에서 가능하겠다.
        xhr.addEventListener(`load`, () => {
            //res는 {success: true/false, type: `display`/`notification`, message: content}
            const res = JSON.parse(xhr.responseText);
            console.log(`server response data\n${xhr.responseText}}`);
            
            if (res.success) {
              resolve(res.message.contentMessage);
            } else {
              reject(res.message.contentMessage);
            }
        })
      
        //위 이벤트 등록을 마쳤으면, 요청을 진짜로 보낸다.
        //중요한점. http의 payload는 기본적으로 stirng타입으로 보낸다. 
        xhr.send(postData);

    });  
};

