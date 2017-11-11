'use babel';

export default class ProgressIndicator {

    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('inline-block');
        this.element.classList.add('icon-ellipsis');
        this.element.textContent = 'Analysing...';
    }

    /* ==============================
        PUBLIC
       ============================== */

    show() {
       console.log("ProgressIndicator::show");
       console.log(this.statusBar);

       if (this.statusBar) {
           this.elementInStatusBar = this.statusBar.addLeftTile({
               item: this.element,
               priority: 7
           });
       }
    }

    hide() {
       console.log("ProgressIndicator::hide");

       if (this.elementInStatusBar) {
           this.elementInStatusBar.destroy();
           delete this.elementInStatusBar;
       }
    }

    setStatusBar(statusBar) {
       this.statusBar = statusBar;
    }

}
