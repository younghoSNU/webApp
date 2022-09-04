const clock = document.querySelector('#clock')

function getClock() {
    let date = new Date()
    let hours = String(date.getHours()).padStart(2, '0')
    let minutes = String(date.getMinutes()).padStart(2, '0')
    let seconds = String(date.getSeconds()).padStart(2, '0')
    // let second = date.
    clock.innerText = `${hours}:${minutes}:${seconds}`
}

getClock()  //바로 실행하고 1초 뒤부턴 setIntervals로 
setInterval(getClock, 1000)