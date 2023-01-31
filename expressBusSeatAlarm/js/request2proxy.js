// const postDataTemp = `deprCd=${Nm2Cd[deprNm]}&deprNm=${deprNm}&arvlCd=${Nm2Cd[arvlNm]}&arvlNm=${arvlNm}&tfrCd=&tfrNm=&tfrArvlFullNm=&pathDvs=sngl&pathStep=1&pathStepRtn=1&crchDeprArvlYn=Y&deprDtm=${year+month+date}&deprDtmAll=${year}.+${month}.+${date}}.+${day}&arvlDtm=${year+month+date}&arvlDtmAll=${year}.+${month}.+${date}.+${day}&busClsCd=0&abnrData=&prmmDcYn=N`;

const postData = `deprCd=340&deprNm=%EC%95%84%EC%82%B0%EC%98%A8%EC%96%91&arvlCd=010&arvlNm=%EC%84%9C%EC%9A%B8%EA%B2%BD%EB%B6%80&tfrCd=&tfrNm=&tfrArvlFullNm=&pathDvs=sngl&pathStep=1&deprDtm=20230205&deprDtmAll=2023.+2.+5.+%EB%AA%A9&arvlDtm=20230205&arvlDtmAll=2023.+2.+5.+%EB%AA%A9&busClsCd=0&takeDrtmOrg=90&distOrg=99.8&rtrpChc=1&timeLinkMin=11&timeLinkMax=21&deprTime=&alcnDeprTime=&alcnDeprTrmlNo=&alcnArvlTrmlNo=&indVBusClsCd=&cacmCd=&prmmDcDvsCd=&rtrpDtl1=&pcpyNoAll1=&satsNoAll1=&alcnTrmlNoInfo=&deprDtmOrg=20230205&deprDtmAllOrg=2023.+2.+5.+%EB%AA%A9&arvlDtmOrg=20230205&arvlDtmAllOrg=2023.+2.+5.+%EB%AA%A9&rtrpStep2DtYn=Y&prvtBbizEmpAcmtRt=&chldSftySatsYn=&dsprSatsYn=&spexp=&dcDvsCd=&extrComp=&stdDtm=&endDtm=`;

const URL = '/';

// Example POST method implementation:
async function getData(urlEndpoint = '', data = {}) {
    // Default options are marked with *
    const response = await fetch(urlEndpoint, {
        url: `http://127.0.0.1`,
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    });

    return response; // parses JSON response into native JavaScript objects
};

getData(URL, postData).then(val => console.dir(val));