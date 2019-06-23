$(document).ready(function() {
    $('#form-login').on('submit', function(event) {
        const username = $('input[name="username"]').val();
        const password = $('input[name="password"]').val();
        login(username, password);
        return false;
    });
});

async function login(username, password) {
    try {
        const dataLogin = await axios.post('http://localhost:3001/api/v1/login', {
            username,
            password
        });   

        const returningData = dataLogin.data.data;
        console.log(returningData);
        const accessToken = returningData.access_token;
        const dataAuthentication = JSON.parse(window.atob(accessToken.split('.')[1]));
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('userId', dataAuthentication._id);
        localStorage.setItem('userName', dataAuthentication.username);
        window.location.href = '/chat.html';
    } catch (error) {
        console.error(error);
        alert(error.response.data.message);
    }
}
