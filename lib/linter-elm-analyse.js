'use babel';

import { CompositeDisposable } from 'atom';

import ElmProjectPath from './elm-project-path';
import ProgressIndicator from './progress-indicator';

import elmApp from '../elm/built/elm.js';

const atomLinter = require('atom-linter');

export default {

    activate(state) {
        console.log("LinterElmAnalyse::activate");

        this.elm = elmApp.Main.worker();

        this.elmProjectPath = new ElmProjectPath();
        this.progressIndicator = new ProgressIndicator();

        this.subscriptions = new CompositeDisposable();
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    serialize() {
        return {};
    },

    provideLinter() {
        const projectPath = this.elmProjectPath.generate();

        return {
            name: "Elm Analyse",
            scope: "project",
            lintsOnChange: false,
            grammarScopes: ['source.elm'],
            lint(editor) {
                const editorPath = editor.getPath();
                // console.log(editorPath);

                return [
                    /*{
                        severity: 'warning',
                        location: {
                            file: editorPath,
                            position: [ [0, 0], [0, 4] ]
                        },
                        excerpt: 'This is a a test.',
                        description: "Just a test I'm putting together to validate behavior."
                    }*/
                ];
            }
        };
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

                console.log(output);
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
