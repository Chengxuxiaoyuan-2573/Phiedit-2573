const loadingMask = document.createElement("pre");
loadingMask.classList.add("loadingMask");
loadingMask.style.display = 'none';
document.body.appendChild(loadingMask);
export function setLoadingText(text: string) {
    loadingMask.style.display = '';
    loadingMask.textContent = text;
}
export function removeLoadingText() {
    loadingMask.style.display = 'none';
}
