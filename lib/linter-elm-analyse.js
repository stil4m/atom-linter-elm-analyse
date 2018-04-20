'use babel';

import { CompositeDisposable, BufferedProcess } from 'atom';

import PortPrompt from './port-prompt';
import ProgressIndicator from './progress-indicator';
import ElmAnalyse from './elm-analyse';

export default {
    linter: null,
    portPrompt: null,
    elmAnalyse: null,

    activate(state) {
        this.progressIndicator = new ProgressIndicator();
        this.subscriptions = new CompositeDisposable();
        this.elmAnalyse = new ElmAnalyse(this.progressIndicator);
        this.subscriptions.add(
            atom.commands.add('atom-workspace', {
                'elm-analyse:connect': () => this.askPort(),
                'elm-analyse:disconnect': () => this.disconnect()
            })
        );

        this.portPrompt = new PortPrompt(port => {
            this.whileNotConnected(() => {
                this.elmAnalyse.connect(port);
            });
        });
    },

    askPort() {
        this.whileNotConnected(() => {
            this.portPrompt.open();
        });
    },

    consumeIndie(registerIndie) {
        const linter = registerIndie({
            name: 'Elm Analyse'
        });
        this.linter = linter;
        this.elmAnalyse.setLinter(linter);
        this.subscriptions.add(linter);

        this.subscriptions.add(
            atom.workspace.observeTextEditors(textEditor => {
                const editorPath = textEditor.getPath();
                if (!editorPath) {
                    return;
                }

                const subscription = textEditor.onDidDestroy(() => {
                    this.subscriptions.remove(subscription);
                });
                this.subscriptions.add(subscription);
            })
        );
    },

    disconnect() {
        if (!this.elmAnalyse.isConnected()) {
            atom.notifications.addInfo(
                "Can't disconnect from elm-analyse while not connected"
            );
            return;
        }
        this.elmAnalyse.disconnect();
    },

    deactivate() {
        this.subscriptions.dispose();
        if (this.elmAnalyse.isConnected()) {
            this.elmAnalyse.disconnect();
        }
    },

    serialize() {
        return {};
    },

    consumeStatusBar(statusBar) {
        if (!statusBar) {
            return;
        }
        this.progressIndicator.setStatusBar(statusBar);
    },

    whileNotConnected(f) {
        if (this.elmAnalyse.isConnected()) {
            atom.notifications.addInfo('Already connected to elm-analyse.');
            return;
        }
        f();
    }
};
