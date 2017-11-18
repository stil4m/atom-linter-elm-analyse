'use babel';

import { CompositeDisposable } from 'atom';
import { BufferedProcess } from 'atom';
import request from 'request';

import ElmProjectPath from './elm-project-path';
import ProgressIndicator from './progress-indicator';

import elmApp from '../elm/built/elm.js';

export default {

    lints: [],
    linter: null,

    activate(state) {
        this.elm = elmApp.Main.worker();

        this.elmProjectPath = new ElmProjectPath();
        this.progressIndicator = new ProgressIndicator();
        this.subscriptions = new CompositeDisposable();

        // TODO: this either goes back in when the editor solution is finalized,
        // or it should be deleted for good.
        // this.subscriptions.add(atom.commands.add('atom-workspace', {
        //     'core:save': () => this.runElmAnalyse()
        // }));

        this.elm.ports.sendLints.subscribe((lints) => {
            if (this.linter) {
                this.linter.clearMessages();
                this.linter.setAllMessages(lints);
            }
        });
    },

    deactivate() {
        this.subscriptions.dispose();

        if (this.elmAnalyse) {
            this.elmAnalyse.kill();
        }
    },

    serialize() {
        return {};
    },

    consumeIndie(registerIndie) {
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
        if (!statusBar) return;
        this.progressIndicator.setStatusBar(statusBar);
        this.runElmAnalyse();
    },

    runElmAnalyse() {
        const cwd = this.elmProjectPath.generate();

        const command = "elm-analyse";
        const args = ["-s", "--format", "json"];
        const options = { cwd };
        const stdout = (output) => this.processStdout(output);
        const stderr = (error) => this.processStderr(error);
        const exit = (code) => this.processExit(code);

        if (cwd) {
           this.progressIndicator.show();
           this.elmAnalyse = new BufferedProcess({command, args, options, stdout, stderr, exit});
        }
    },

    processStdout(output) {
        console.log(output);
        let json = {};

        if (output.substring(0, 5) === "Found") {
            console.log("server ready");

            // ATTEMPT #1
            // request("http://localhost:3000/editor-elm.js", (error, response, body) => {
            //     console.log(error);
            //     console.log(response);
            //     console.log(body);
                // if (!error && response.statusCode == 200) {
                //     let stuff = eval(body);
                //     console.log(stuff);
                // }
            // });

            // ATTEMPT #2
            // const command = "http://localhost:3000/editor-elm.js";
            // const args = [];
            // const options = {};
            // const stdout = (output) => console.log(output);
            // const stderr = (error) => console.log(error);
            // const exit = (code) => console.log(code);
            //
            // const serverProcess = new BufferedProcess({command, args, options, stdout, stderr, exit});
            // console.log(serverProcess);

            // ATTEMPT #3
            // let tryThis = require("http://localhost:3000/editor-elm.js");
            // console.log(tryThis);

        }

        // TODO: This will either go back in when the editor solution is finalized,
        // or it should be deleted for good.
        // try {
        //     json = JSON.parse(output);
        //     this.elm.ports.processMessages.send(json.messages);
        // } catch (exception) {
        //     console.log(exception);
        // }

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
