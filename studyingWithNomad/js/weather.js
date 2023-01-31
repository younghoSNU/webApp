let xhr = new XMLHttpRequest();
let url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst'; /*URL*/
let serviceKey = 'tqppUKrqhm2PxaGUIig94DcLl1lEPTsOvqEve0JfXV3v1f0WohdNqG%2FjZdp9bRDkS%2FqneDCUKlECAt6qfzbo2w%3D%3D'
let queryParams = '?' + encodeURIComponent('serviceKey') + '='+ serviceKey; /*Service Key*/
queryParams += '&' + encodeURIComponent('pageNo') + '=' + encodeURIComponent('1'); /**/
queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('1000'); /**/
queryParams += '&' + encodeURIComponent('dataType') + '=' + encodeURIComponent('JSON'); /**/
queryParams += '&' + encodeURIComponent('base_date') + '=' + encodeURIComponent('20220904'); /**/
queryParams += '&' + encodeURIComponent('base_time') + '=' + encodeURIComponent('0800'); /**/
queryParams += '&' + encodeURIComponent('category') + '=' + encodeURIComponent('TMP'); /**/


function onGeoSuccess(position) {
    let lat = position.coords.latitude
    let lng = position.coords.longitude

    lat = parseInt(lat)
    lng = parseInt(lng)

    queryParams += '&' + encodeURIComponent('nx') + '=' + encodeURIComponent(lat); /**/
    queryParams += '&' + encodeURIComponent('ny') + '=' + encodeURIComponent(lng); /**/

    xhr.open('GET', url + queryParams);

    xhr.onreadystatechange = function () {
        if (this.readyState == 4) {
            // alert('Status: '+this.status+'nHeaders: '+JSON.stringify(this.getAllResponseHeaders()))
    
            console.log(this.responseText)
        }
    };

    xhr.send('');
}

function onGeoFail() {
    alert('cannot find your loction')
}

navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoFail)