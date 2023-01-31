// XMLHttpRequest의 동기, 비동기 동작의 차이를 예제를 통해 배운다. 동기적으로 동작하면 유저가 길게 실행되는(long-running) 코드에 막혀 다른 작업을 못하게 되고 이는 유저에게 최고의 퍼포먼스르 제공하지 못하는 상황이다. 때문에 비동기적으로 제공하는 것이 최고로 낫다.

//가장 기본적인 비동기 루틴 
// open()함수에 boolean(true)인자를 넣는다
// const xhr = new XMLHttpRequest();

// xhr.open('GET', './foo.txt', true);

// xhr.onload = (e) => {
//     if (xhr.readyState === 4) {
//         if (xhr.status === 200) {
//             console.log(xhr.responseText);
//             console.dir(xhr)
//         } else {
//             console.error(xhr.statusText);
//         }
//     }
// }

// xhr.onerror = (e) => {
//     console.log(xhr.statusText);
// }

// xhr.send(null);



function loadFile(url, timeout, callback, ...args) {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', () => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
            callback.apply(xhr, args);
            } else {
            console.error(xhr.statusText);
            }
        }
    });
    xhr.ontimeout = () => {
      console.error(`The request for ${url} timed out.`);
    };
    // xhr.onload = () => {
    //   if (xhr.readyState === 4) {
    //     if (xhr.status === 200) {
    //       callback.apply(xhr, args);
    //     } else {
    //       console.error(xhr.statusText);
    //     }
    //   }
    // };
    xhr.open("GET", url, true);
    xhr.timeout = timeout;
    xhr.send(null);
  }
  
  function showMessage (message) {
    console.log(`${message} ${this.responseText}`);
  }
  
  loadFile("message.txt", 1, showMessage, "New message!\n");
  