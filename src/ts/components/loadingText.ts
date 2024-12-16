const loadingMask = document.createElement("pre");
loadingMask.classList.add("loadingMask");
loadingMask.style.display = 'none';
document.body.appendChild(loadingMask);
export function setLoadingText(text: string, delay?: number) {
    loadingMask.style.display = '';
    loadingMask.textContent = text;
    if (delay) {
        loadingMask.animate([
            {
                opacity: 1
            },
            {
                opacity: 0
            }
        ], {
            duration: delay
        });
        setTimeout(removeLoadingText, delay);
    }
}
export function removeLoadingText() {
    loadingMask.style.display = 'none';
}
