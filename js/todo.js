const todoForm = document.querySelector('#todo-form')
const todoList = document.querySelector('#todo-list')
const todoInput = document.querySelector('#todo-form input')

let todos = []    //const 로 배열만들어도 push로 안에 정보가 들어간다
const TODOS_KEY = 'todos'
let parsedTodos = JSON.parse(localStorage.getItem(TODOS_KEY))

function handleToDoSubmit(event) {
    event.preventDefault()
    const newTodo = todoInput.value
    todoInput.value = ''
    const newTodoObj = {text: newTodo, id: Date.now()}
    todos.push(newTodoObj)
    savingTodos()
    paintTodo(newTodoObj)
}

function paintTodo(newTodoObj) {
    const li = document.createElement('li')
    const span = document.createElement('span')
    const button = document.createElement('button')

    li.id = newTodoObj.id
    span.innerText = newTodoObj.text

    button.addEventListener('click', handleButtonClick)
    button.innerText = '❌'

    li.appendChild(span)
    li.appendChild(button)
    todoList.appendChild(li)
    
}

function handleButtonClick(event) {
    const li = event.target.parentNode
    const id = li.id
    todos = todos.filter(e => e.id != parseInt(id))
    localStorage.setItem(TODOS_KEY, JSON.stringify(todos))
    li.remove()

}

function savingTodos() {
    //어떤 키에 대해 value가 계속업뎃되지 키가 여러개 생기진 않는다
    localStorage.setItem(TODOS_KEY, JSON.stringify(todos))
} 

todoForm.addEventListener('submit', handleToDoSubmit)

if (parsedTodos) 
{
    // parsedTodos.forEach(element => {
    //     paintTodo(element)
    // });
    todos = parsedTodos 
    console.log(todos)
    //여기가 모듈화의 핵심이다
    parsedTodos.forEach(paintTodo);
}