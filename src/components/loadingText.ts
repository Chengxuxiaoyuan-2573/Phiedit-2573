class Loading {

    private loadingMask: HTMLPreElement;

    constructor() {
        this.loadingMask = document.createElement("pre");
        this.loadingMask.classList.add("loadingMask");
        this.loadingMask.style.display = 'none';
        document.body.appendChild(this.loadingMask);
    }

    show(text: string, delay?: number): void {
        this.loadingMask.style.display = '';
        this.loadingMask.textContent = text;
        if (delay) {
            this.loadingMask.animate([
                {
                    opacity: 1
                },
                {
                    opacity: 0
                }
            ], {
                duration: delay
            });
            setTimeout(() => this.hide(), delay);
        }
    }

    hide(): void {
        this.loadingMask.style.display = 'none';
    }
}

export default new Loading();