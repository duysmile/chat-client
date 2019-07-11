

window.fbAsyncInit = function() {
    FB.init({
        appId      : '2504276709584926',
        cookie     : true,
        xfbml      : true,
        version    : 'v3.3'
    });
        
    FB.AppEvents.logPageView();   
};
    
(function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

function checkLoginState() {
    FB.getLoginStatus(async function(response) {
        alert('Login FB successfully.');
        const accessToken = response.authResponse.accessToken;
        const resultLogin = await axios.post('http://app-6b006f2d-41af-49ad-b2a8-8d0f739e8615.cleverapps.io/api/v1/login/facebook', {
            accessToken
        });
        console.log(resultLogin);
    });
}