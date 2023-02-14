const PUBLIC_KEY = `BJX1JFKLeds75dvaBzGXaliLkyYhR-_v_5Vbu2I6SXQngkP2XiCVkl_de4lmevcbNOQvbI3rrFXPLkpBatB0cZE`;
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

self.addEventListener('activate', async () => {
    // This will be called only once when the service worker is activated.
    try {
        console.log(`i'm at service worker`);
        const applicationServerKey = urlB64ToUint8Array(PUBLIC_KEY);
        const options = { applicationServerKey, userVisibleOnly: true };

        // main.js의 glbSwData에서 얻어온 것이다.
        // {fullDate: `2023/02/13(월)`, dprtNm: `아산온양`, arvlNm: `서울경부`, list: [{idx: 0, dprtTime: 12:30}, {idx: 1, dprtTime: 13:40}]}
        const params = JSON.parse(new URL(location).searchParams.get(`config`));
        console.log(params);
        // console.log(location);
        
        // vapid와 userVisibleOnly 옵션을 적용한 subscription을 만든다.
        const subscription = await self.registration.pushManager.subscribe(options);

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
self.addEventListener('push', event => {
    if (event.data) {
        console.log(`event data ${JSON.stringify(event.data)} ${typeof(event.data)}`);
        console.dir(event);

        const payload = JSON.parse(event.data.text());

        console.log(`브라우저가 구독하고 있던 통고를 받은 상황`);

        if (payload.success === true) {
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
        } else {
            showLocalNotification('구독을 종료합니다.', payload.message, self.registration);
        }
    } else {
        console.log('Push event but no data');
        alert(`push event but without data`);
    }
});

//알림을 보낼 때, 잔여좌석이 언제 생겼는지 기준 시각과 함게 화면에 띄운다.
const showLocalNotification = (title, body, swRegistration) => {
    const options = {
        body,
        // here you can add more properties like icon, image, vibrate, etc.
    }
    swRegistration.showNotification(title, options)
}

