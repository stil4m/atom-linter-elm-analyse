'use babel';

import fs from 'fs';
import request from 'request';

import { CompositeDisposable } from 'atom';
import { BufferedProcess } from 'atom';

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

            this.getVersion()
                .then(version => this.cachedEditorElmJs(version))
                .then(version => this.connect(version))
                .catch(error => console.log(error));
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
    },

    getVersion() {
        return new Promise(function(accept, reject) {
            request("http://localhost:3000/info", (error, response, body) => {
                if (error) {
                    reject("Got error on fetching elm-analyse info.");
                    return;
                }

                if (response.statusCode === 200) {
                    try {
                        const info = JSON.parse(body);
                        accept(info.version);
                    } catch (e) {
                        reject("Could not parse elm-analyse info response.");
                    }
                } else {
                    reject("Invalid status code when fetching elm-analyse info: ", response.statusCode);
                }
            });
        });
    },

    cachedFileName(version) {
        return `/Users/matthewbuscemi/.elm-analyse/linter-editor-elm-${version}.js`;
    },

    cachedEditorElmJs(version) {
        const fileName = this.cachedFileName(version);
        return new Promise(function(accept, reject) {
            request("http://localhost:3000/editor-elm.js", (error, response, body) => {
                if (error) {
                    reject("Could not fetch editor elm for elm-analyse version: " + version);
                    return;
                }

                if (response.statusCode === 200) {
                    fs.writeFileSync(fileName, body);
                    accept(version);
                } else {
                    reject("Invalid status code when fetching elm-analyse info: ", response.statusCode);
                }
            });
        });
    },

    connect(version) {
        const fileName = this.cachedFileName(version);
        console.log(fileName);

        const ElmAnalyseEditor = require(fileName);
        const elmAnalyseEditor = ElmAnalyseEditor();

        elmAnalyseEditor.onState((state) => {
            console.log("Do something here. See src/Editor.elm in elm-analyse for the data format.");
            console.log(state);
        });

        elmAnalyseEditor.start();
    },

};
