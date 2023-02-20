const dateSelect = document.querySelector('#date-select');

const PLUS_A_DAY = 24*60*60*1000;
//요일(day)이 잘못 출력됐는데, 0이 월요일이 아닌 일요일이었다.
let dayMapping = ['일', '월', '화', '수', '목', '금', 
'토'];

let date0 = new Date();
const now = date0.getTime();
let date1 = new Date(now+PLUS_A_DAY);
let date2 = new Date(now+PLUS_A_DAY*2);
let date3 = new Date(now+PLUS_A_DAY*3);
let date4 = new Date(now+PLUS_A_DAY*4);
let date5 = new Date(now+PLUS_A_DAY*5);
let date6 = new Date(now+PLUS_A_DAY*6);
let dateArr = [date0, date1, date2, date3, date4, date5, date6];

console.log(date0);

let frmDates = '';

for (const [idx, date] of dateArr.entries()) {
    const formatted = `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}(${dayMapping[date.getDay()]})`;

    frmDates += `<option value="${formatted}">${formatted}</option>`;
}

dateSelect.innerHTML += frmDates;