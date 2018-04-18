'use babel';

import { Point, TextEditor } from 'atom';

export default class PortPrompt {
    constructor(callback) {
        this.callback = callback;

        this.paneItem = null;

        this.miniEditor = new TextEditor({ mini: true });
        this.miniEditor.element.addEventListener('blur', this.close.bind(this));
        this.miniEditor.setPlaceholderText('Enter elm-analyse port number');

        this.message = document.createElement('div');
        this.message.classList.add('message');

        this.element = document.createElement('div');
        this.element.classList.add('port-prompt');
        this.element.appendChild(this.miniEditor.element);
        this.element.appendChild(this.message);

        this.panel = atom.workspace.addModalPanel({
            item: this,
            visible: false
        });

        atom.commands.add(this.miniEditor.element, 'core:confirm', () => {
            this.confirm();
        });
        atom.commands.add(this.miniEditor.element, 'core:cancel', () => {
            this.close();
        });
    }

    getElement() {
        return this.element;
    }

    confirm() {
        const port = this.miniEditor.getText();
        this.close();
        this.callback(port);
    }

    close() {
        if (!this.panel.isVisible()) return;
        this.panel.hide();
        if (this.miniEditor.element.hasFocus()) {
            this.restoreFocus();
        }
    }

    storeFocusedElement() {
        this.previouslyFocusedElement = document.activeElement;
        return this.previouslyFocusedElement;
    }

    restoreFocus() {
        if (
            this.previouslyFocusedElement &&
            this.previouslyFocusedElement.parentElement
        ) {
            return this.previouslyFocusedElement.focus();
        }
        atom.views.getView(atom.workspace).focus();
    }

    open() {
        if (this.panel.isVisible()) return;
        this.storeFocusedElement();
        this.panel.show();
        // this.message.textContent = "Enter 'man' arguments here, e.g. 'ls' or '5 crontab'";
        this.miniEditor.element.focus();
    }
}
