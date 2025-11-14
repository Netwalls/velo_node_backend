async function testCredentials() {
    const USERID = 'CK101265322';
    const APIKEY = 'BI4HSJA5821F0N95B85F52L329551U5OMGDQ2C70EW81GCRLFD84678KGR252LAO';
    
    console.log('Testing Nellobytes Credentials...');
    
    const testUrl = `https://www.nellobytesystems.com/APIVerifyElectricityV1.asp?UserID=${USERID}&APIKey=${APIKEY}&ElectricCompany=08&MeterNo=04172719595`;
    
    try {
        console.log('Making test request...');
        const response = await fetch(testUrl);
        const data = await response.text();
        console.log('✅ SUCCESS - Response:', data);
    } catch (error:any) {
        console.log('❌ FAILED - Error:', error.message);
    }
}

testCredentials();