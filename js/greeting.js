const loginForm = document.getElementById("login-form") //querySelector('#login-form')
const loginInput = loginForm.querySelector('input')
// document.querySelector('#login-form input')
const greeting = document.querySelector('#greeting')

const HIDDEN_CLASSNAME = 'hidden'
const USERNAME_KEY = 'username'

function onLoginSubmit(event) {  //js에서 일어나는 이벤트에 대한 정보를 info에 싣는다
    // info.preventDefault = true //이거 안통한다
    event.preventDefault()
    
    // loginForm.classList.add('a', 'b', 'c')
    localStorage.setItem(USERNAME_KEY, loginInput.value)
    loginForm.classList.add(HIDDEN_CLASSNAME)
    paintGreetings()
}

function paintGreetings() {
    const username = localStorage.getItem(USERNAME_KEY)
    greeting.classList.remove(HIDDEN_CLASSNAME)
    greeting.innerText = `Hello ${username}`

}

const savedUsername = localStorage.getItem(USERNAME_KEY)

if (!savedUsername)
{
    loginForm.classList.remove(HIDDEN_CLASSNAME)
    loginForm.addEventListener('submit', onLoginSubmit)

}
else 
{
    paintGreetings()
}