'use babel';

import { CompositeDisposable } from 'atom';

import ElmProjectPath from './elm-project-path';
import ProgressIndicator from './progress-indicator';

import elmApp from '../elm/built/elm.js';

const atomLinter = require('atom-linter');

export default {

    lints: [],
    linter: null,

    activate(state) {
        console.log("LinterElmAnalyse::activate");

        this.elm = elmApp.Main.worker();

        this.elmProjectPath = new ElmProjectPath();
        this.progressIndicator = new ProgressIndicator();

        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'core:save': () => this.runElmAnalyse()
        }));

        this.elm.ports.sendLints.subscribe((lints) => {
            if (this.linter) {
                this.linter.clearMessages();
                this.linter.setAllMessages(lints);
            }
        });
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    serialize() {
        return {};
    },

    consumeIndie(registerIndie) {
        console.log("LinterElmAnalyse::consumeIndie");

        const linter = registerIndie({ name: "Elm Analyse" });
        this.linter = linter;
        this.subscriptions.add(linter);

        const projectPath = this.elmProjectPath.generate();
        this.elm.ports.setProjectPath.send(projectPath);

        this.subscriptions.add(atom.workspace.observeTextEditors((textEditor) => {
            const editorPath = textEditor.getPath();
            if (!editorPath) { return; }

            const subscription = textEditor.onDidDestroy(() => {
                this.subscriptions.remove(subscription);
                linter.setMessages(editorPath, []);
            });

            this.subscriptions.add(subscription);
        }));
    },

    consumeStatusBar(statusBar) {
        console.log("LinterElmAnalyse::consumeStatusBar");
        // console.log(statusBar);

        if (!statusBar) return;
        this.progressIndicator.setStatusBar(statusBar);
        this.runElmAnalyse();
    },

    runElmAnalyse() {
        console.log("LinterElmAnalyse::runElmAnalyse");

        this.progressIndicator.show();

        const executablePath = "elm-analyse";
        const args = ["--format", "json"];
        const timeout = 20000;
        const stream = "both";
        const cwd = this.elmProjectPath.generate();
        console.log(cwd);

        if (cwd) {
            atomLinter.exec(executablePath, args, {
                timeout,
                stream,
                env: process.env,
                cwd
            }).then((object) => {
                console.log("stdout: ");

                let output = JSON.parse(object.stdout);
                this.elm.ports.processMessages.send(output.messages);

                // console.log(output);
                console.log("stderr: " + object.stderr);
                console.log("exitCode: " + object.exitCode);

                this.progressIndicator.hide();
            }).catch((object) => {
                console.log(object);
                this.progressIndicator.hide();
            });
        }
    }

};
