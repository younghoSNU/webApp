const mainMenuUl = document.querySelector(`.main-search-menu`);

const MOBILE_WIDTH = 1024;
const ROW_CLASS_NM = 'row';

if (window.screen.width <= MOBILE_WIDTH) {
    mainMenuUl.classList.remove(ROW_CLASS_NM);
}