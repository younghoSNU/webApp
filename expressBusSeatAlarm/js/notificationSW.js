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


self.addEventListener('push', event => {

    if (event.data) {
        
        console.log('Push event!! ', event.data.text());
        console.log(`브라우저가 구독하고 있던 통고를 받은거다.`)
        showLocalNotification('wow', event.data.text(), self.registration);
    } else {
        console.log('Push event but no data')
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

