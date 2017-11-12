'use babel';

import { CompositeDisposable } from 'atom';
import { BufferedProcess } from 'atom';

import ElmProjectPath from './elm-project-path';
import ProgressIndicator from './progress-indicator';

import elmApp from '../elm/built/elm.js';

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
            console.log(lints);

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
        if (projectPath) {
            this.elm.ports.setProjectPath.send(projectPath);
        }

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

        const cwd = this.elmProjectPath.generate();
        console.log(cwd);

        const command = "elm-analyse";
        const args = ["--format", "json"];
        const options = { cwd };
        const stdout = (output) => this.processStdout(output);
        const stderr = (error) => this.processStderr(error);
        const exit = (code) => this.processExit(code);

        if (cwd) {
            this.progressIndicator.show();

            this.elmAnalyse = new BufferedProcess({command, args, options, stdout, stderr, exit});
            console.log(this.elmAnalyse);
        }
    },

    processStdout(output) {
        console.log(output);
        let json = {};

        try {
            json = JSON.parse(output);
            this.elm.ports.processMessages.send(json.messages);
        } catch (exception) {
            console.log(exception);
        }

        this.progressIndicator.hide();
    },

    processStderr(error) {
        console.log(error);
        this.progressIndicator.hide();
    },

    processExit(code) {
        console.log(code);
    }

};
