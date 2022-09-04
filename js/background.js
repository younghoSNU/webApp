const images  = ['0', '1', '2']
const imageExtension = 'jpeg'

const chosenImg = images[Math.floor(Math.random() * images.length)]

const bgImage = document.createElement('img')

bgImage.src = `img/${chosenImg}.${imageExtension}`

document.body.appendChild(bgImage)