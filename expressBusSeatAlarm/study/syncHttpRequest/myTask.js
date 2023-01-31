const { boolean } = require("webidl-conversions");

// xhr.open()에서 boolean(false)를 넣음으로써 동기적으로 동작하도록 만든다. 그러면 페이지 전체가 open의 동작이 끝날 때까지 기다리게 되고 만약 컨텐츠를 미리로딩(prelaod)하거나 백그라운드 실행을 할 때는 동기적으로 실행하는 편이 좋을 수 있다.

self.onmessage = (event) => {
    if (event.data === "Hello") {
      const xhr = new XMLHttpRequest();
      setTimeout(() => {
        xhr.open("GET", "myFile.txt", false);  // synchronous request
        xhr.send(null);
        self.postMessage(xhr.responseText);
      }, 0000);
      
    }
  };
  