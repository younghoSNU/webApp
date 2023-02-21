const PUBLIC_KEY = `BJX1JFKLeds75dvaBzGXaliLkyYhR-_v_5Vbu2I6SXQngkP2XiCVkl_de4lmevcbNOQvbI3rrFXPLkpBatB0cZE`;
const NOTIFICATION = `notification`;
// urlB64ToUint8Array is a magic function that will encode the base64 public key
// to Array buffer which is needed by the subscription option
const urlB64ToUint8Array = base64String => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
};

// ###################################################TEST##################
// 컨텐츠타입을 의미
const contentType = {
    NOTIFICATION: `notification`,
    ALERT: `alert`,
    SILENCE: `silence`,
};
// #########################################################################

/**
 * save subscription to the backend
 * @param {subscription} subscription 
 */
const subscription2server = async payload => {
    const SERVER_URL = 'https://youngho.click/save-subscription';

    const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
    });

    return response.json();
};
// console.log(self);
// console.dir(self);
self.addEventListener('activate', async () => {
    // This will be called only once when the service worker is activated.
    try {
        console.log(`i'm at service worker`);
        const applicationServerKey = urlB64ToUint8Array(PUBLIC_KEY);
        const options = { applicationServerKey, userVisibleOnly: true };

        let temp = await self.clients.matchAll();
        console.log(temp);
        // main.js의 glbSwData에서 얻어온 것이d다.
        // {fullDate: `2023/02/13(월)`, dprtNm: `아산온양`, arvlNm: `서울경부`, list: [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]}
        const params = JSON.parse(new URL(location).searchParams.get(`config`));
        console.log(params);
        // console.log(location);
        
        // vapid와 userVisibleOnly 옵션을 적용한 subscription을 만든다.
        const subscription = await self.registration.pushManager.subscribe(options);


        ////test////
        // 여기서 구독해지하면 해지된다.
        
        const payload = {
            subscription: JSON.stringify(subscription),
            itnrData: params,
        };
        
        console.log(JSON.stringify(payload));
        const res = await subscription2server(payload);
        console.log(res)

    } catch (err) {
      console.log('Error', err);
    }
});


// 성공 시 event.data는 다음과 같다
// {success: true, message: {foundList: [{dprtTime: "14:50", busCmp: "동양고속", busGrade: "고속", remain: "5 석"}, {...}], time: {hours, minutes, seconds}, date: '12'}}
// 실패 시, {success, message: 실패이유}
// 메시지 시, {success: true/false, message}
self.addEventListener('push', async event => {
    console.log(`브라우저가 구독하고 있던 통고를 받은 상황`);

    if (event.data) {
        console.log(`event data ${event.data.text()}} ${typeof(event.data)}`);
        console.dir(event);

        const payload = event.data.json();

     
        if (payload.success === true && payload.type === NOTIFICATION) {
            const { foundList, time, date } = payload.message;
            const hours = String(time.hours).padStart(2, `0`);
            const minutes = String(time.minutes).padStart(2, `0`);
            const seconds = String(time.seconds).padStart(2, `0`);

            
            const title = `(${hours}:${minutes}:${seconds} 기준) 잔여석이 생겼습니다!`;
            let body = `${date}일 버스 스케줄 중\n`

            for (const entry of foundList) {
                console.log(JSON.stringify(entry), typeof(entry));
                body += `출발시간: ${entry.dprtTime} 잔여석: ${entry.remain}`;

                if (entry.busGrade === `우등`) {
                    body += ` 등급: 우등\n`;
                } else {
                    body += `\n`;
                }
            }

            showLocalNotification(title, body, self.registration);
        } else if (payload.success === false && payload.type === contentType.NOTIFICATION){
            console.log(`payload success false and type NOTIFICATION`);
            const options = {
                body: payload.message,
            };

            // 원래는 워커 등록을 해지하려고 했다. 워커를 등록할 때, 브라우저는 기존 워커와 비교하고 만약 같은 파일을 서비스워커로 등록하게 되면 브라우저는 이 등록을 무시한다. 그렇지만 문제는 등록해지와 동시에 보냈던 푸시통고도 같이 사라진다. 그래서 생각한 전략은 다시 등록을 main.js에서 진행할 때, 만약 기존 워커가 있으면 기존 서비스워커 등록을 해지하고 다시 등록한다. 
            // event.waitUntil(self.registration.showNotification(`pushNotification`, options).then(_ => {
            //     setTimeout(() => {
            //         self.registration.unregister();
            //         console.log(`서비스워커 등록해지 성공`)
            //     } ,1000*10);
            // }));
            event.waitUntil(self.registration.showNotification(`모든 스케줄 출발`, options));

            // let temp = await self.clients.matchAll();
            // console.log(temp);
            // .then(clients => {
            //     clients.forEach(client => {
            //         console.log(client);
            //         client.postMessage(`모든 스케줄 출발에 따른 알림등록버튼 생성`);
            //     })
            // })  
          
            // showLocalNotification('알림 종료', payload.message, self.registration)
            //     .then(_ => {
            //         //서비스워커 등록을 해지한다.
            //         self.registration.unregister()
            //         .then(boolean => {
            //             if (boolean) {
            //                 console.log(`성공적으로 서비스워커 등록해지`);
            //             } else {
            //                 throw new Error(`서비스워커 등록해지 중 문제`)
            //             }
            //         })
            //         .catch( e => {
            //             console.log(e);
            //             alert(e);
            //         });
            //     }) 

            
            // //구독을 해지하는 작업을 한다.
            // self.registration.pushManager.getSubscription()
            //     .then(pushSubscription => {
            //         console.log('pushSubscription')
            //         console.log(pushSubscription)
            //         console.dir(pushSubscription)
            //         pushSubscription.unsubscribe()
            //             .then(success => {
            //                 console.log(success);
            //                 if (success) {
            //                     console.log(`성공적으로 구독해제`);
            //                 } else {
            //                     throw new Error(`구독해지 중 문제가 생겼습니다.`);
            //                 }
            //             })
            //     })
            //     .catch(e => {
            //         console.log(e);
            //         alert(e);
            //     })

            
        }
    } else {
        console.log('Push event but no data');
    }
});

// This is a somewhat contrived example of using client.postMessage() to originate a message from
// the service worker to each client (i.e. controlled page).
// Here, we send a message when the service worker starts up, prior to when it's ready to start
// handling events.
self.clients.matchAll().then(function(clients) {
    console.log(`matchALL ${clients}`);
    clients.forEach(function(client) {
      console.log(client);
      client.postMessage('The service worker just started up.');
    });
  });


//알림을 보낼 때, 잔여좌석이 언제 생겼는지 기준 시각과 함게 화면에 띄운다.
const showLocalNotification = async (title, body, swRegistration) => {
    const options = {
        body,
        // here you can add more properties like icon, image, vibrate, etc.
    }
    await swRegistration.showNotification(title, options);
    return true;
}

