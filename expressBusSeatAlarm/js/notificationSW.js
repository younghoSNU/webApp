import { PUBLIC_KEY, PRIVATE_KEY } from `./secureInfo.js`; 

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
const saveSubscription = async subscription => {
    const SERVER_URL = 'https://youngho.click:3000/save-subscription';

    const response = await fetch(SERVER_URL, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });

    return response.json();
};

self.addEventListener('activate', async () => {
    // This will be called only once when the service worker is activated.
    try {
      const applicationServerKey = urlB64ToUint8Array(PUBLIC_KEY);
      const options = { applicationServerKey, userVisibleOnly: true };

      //vapid와 userVisibleOnly 옵션을 적용한 subscription을 만든다.
      const subscription = await self.registration.pushManager.subscribe(options);

      console.log(JSON.stringify(subscription));

      const msg = await saveSubscription(subscription);

    } catch (err) {
      console.log('Error', err);
    }
});


self.addEventListener('push', function(event) {
    if (event.data) {
      console.log('Push event!! ', event.data.text());

      showLocalNotification('wow', event.data.text(), self.registration);
    } else {
      console.log('Push event but no data')
    }
  });

  const showLocalNotification = (title, body, swRegistration) => {
    const options = {
      body,
      // here you can add more properties like icon, image, vibrate, etc.
    }
    swRegistration.showNotification(title, options)
  }