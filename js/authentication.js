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
        if (!dataLogin.data.success) {
            console.error(dataLogin.data.data);
        }

        console.log(dataLogin.data.data);
    } catch (error) {
        console.error(error.response.data);
    }
}
