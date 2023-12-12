/** Client-side validation for login and registration forms. */
console.log('entered client side validation.');

let errorP = document.getElementById('error');
let user = document.getElementById('user');
let pass = document.getElementById('pass');
let confirmPass = document.getElementById('confirm-pass');

let registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
        console.log('entered registration clientside validation.');
        event.preventDefault();
        checkUser(user.value);
        checkPass(pass.value, confirmPass.value);
        if (errorP.innerText === '') {
            document.getElementById('register-form').submit();
        }
    });
}

let loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        console.log('entered login clientside validation.');
        // CANNOT check if the user exists during clientside. must check in the route.
        event.preventDefault();
        checkUser(user.value);
        checkPass(pass.value);
        if (errorP.innerText === '') {
            document.getElementById('login-form').submit();
        }
    });
}


/**
* Checks if the username is valid during login & registration.
*/
const checkUser = (user) => {
    if (user.length < 5) {
        errorP.hidden = false;
        errorP.innerText = 'Username must be at least 5 characters long';
    } else {
        errorP.innerText = '';
    }
}

/**
* Checks if the password is valid during login & registration.
*/

const checkPass = (password) => {
    if (password.trim().length < 8) {
        errorP.hidden = false;
        errorP.innerText = "Password must be at least 8 characters long.";
    }
    else if (password.split(" ").length > 1) {
        errorP.hidden = false;
        errorP.innerText = "Password cannot have spaces.";
    }
    else if (!password.match(/[A-Z]/)) {
        errorP.hidden = false;
        errorP.innerText = "Password must contain at least one uppercase character.";
    }
    else if (!password.match(/[0-9]/)) {
        errorP.hidden = false;
        errorP.innerText = "Password must contain at least one number.";
    }
    else if (!password.match(/[!@#$%^&*]/)) {
        errorP.hidden = false;
        errorP.innerText = "Password must contain at least one special character.";
    }
    else if (confirmPass && password != confirmPassword) {
        errorP.hidden = false;
        errorP.innerText = "Passwords must match.";

    } else {
        errorP.innerText = ''
    }
}