// 이제 더이상 nodejs module를 사용하지 않고 web APIs를 사용한다.
// import https from "https";
// import fs from "fs";
// import {JSDOM} from 'jsdom';

//주의할 점
// // kobus데이터를 사용하고 있음을 숨기자.
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
 */
export function itineraryRequest(dprtNm, arvlNm, year, month, date, day) {

  /** 
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

    console.log(`postDate:\n ${postData}`);

    const headers = {
      'Content-Type': 'application/json',
    };

    let xhr = new XMLHttpRequest();

    xhr.open('POST', `https://youngho.click/exprm`, true);
    setHeaderData(headers, xhr);
    //set port
    //set hearder
    xhr.onreadystatechange = () => { // Call a function when the state changes.
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        // Request finished. Do processing here.
        console.log(`xhr request sent successfully`);
      }
    };

    xhr.onload = (e) => {
      if (xhr.readyState === 4) {
          if (xhr.status === 200) {
              const res = JSON.parse(xhr.responseText);
              console.log(`this is response from server`);
              console.log(res);
              resolve(res);


              //document를 건드려서 수정해주기
          } else {
              console.error(xhr.statusText);
              reject(xhr.statusText);
          }
      }
    }

    //위 이벤트 등록을 마쳤으면, 요청을 진짜로 보낸다.
    xhr.send(postData);


    // const options = {
    //   hostname: 'kobus.co.kr',
    //   port: 443,
    //   path: '/mrs/alcnSrch.do',
    //   method: 'POST',
    //   headers: fd
    // };
  });  
};

