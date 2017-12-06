'use babel';

import fs from 'fs';
import request from 'request';
import path from 'path';
import { CompositeDisposable } from 'atom';
import { BufferedProcess } from 'atom';

import ElmProjectPath from './elm-project-path';
import ProgressIndicator from './progress-indicator';

export default {
    lints: [],
    linter: null,

    activate(state) {
        this.elmProjectPath = new ElmProjectPath();
        this.progressIndicator = new ProgressIndicator();
        this.subscriptions = new CompositeDisposable();

        this.getInfo()
            .then(info => this.cachedEditorElmJs(info))
            .then(info => this.connect(info))
            .catch(error => console.log(error));
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
        const linter = registerIndie({ name: 'Elm Analyse' });
        this.linter = linter;
        this.subscriptions.add(linter);

        const projectPath = this.elmProjectPath.generate();
        if (projectPath) {
            this.elm.ports.setProjectPath.send(projectPath);
        }

        this.subscriptions.add(
            atom.workspace.observeTextEditors(textEditor => {
                const editorPath = textEditor.getPath();
                if (!editorPath) {
                    return;
                }

                const subscription = textEditor.onDidDestroy(() => {
                    this.subscriptions.remove(subscription);
                    linter.setMessages(editorPath, []);
                });

                this.subscriptions.add(subscription);
            })
        );
    },

    consumeStatusBar(statusBar) {
        if (!statusBar) return;
        this.progressIndicator.setStatusBar(statusBar);
    },

    getInfo() {
        return new Promise(function(accept, reject) {
            request('http://localhost:3000/info', (error, response, body) => {
                if (error) {
                    this.progressIndicator.hide();
                    reject('Got error while fetching elm-analyse info.');
                    return;
                }

                if (response.statusCode === 200) {
                    try {
                        const info = JSON.parse(body);
                        console.log('Accept');
                        accept(info);
                    } catch (e) {
                        this.progressIndicator.hide();
                        reject('Could not parse elm-analyse info response.');
                    }
                } else {
                    this.progressIndicator.hide();
                    reject(
                        'Invalid status code when fetching elm-analyse info: ',
                        response.statusCode
                    );
                }
            });
        });
    },

    cachedFileName(version) {
        const tmpDirPath = path.resolve(__dirname, '../tmp');
        if (!fs.existsSync(tmpDirPath)) {
            fs.mkdirSync(tmpDirPath);
        }

        return path.resolve(
            __dirname,
            '../tmp',
            `linter-editor-elm-${version}.js`
        );
    },

    cachedEditorElmJs(info) {
        const fileName = this.cachedFileName(info.version);
        return new Promise(function(accept, reject) {
            request(
                'http://localhost:3000/editor-elm.js',
                (error, response, body) => {
                    if (error) {
                        this.progressIndicator.hide();
                        reject(
                            `Could not fetch editor elm for elm-analyse version: ${
                                info.version
                            }`
                        );
                        return;
                    }

                    if (response.statusCode === 200) {
                        fs.writeFileSync(fileName, body);
                        accept(info);
                    } else {
                        this.progressIndicator.hide();
                        reject(
                            'Invalid status code when fetching elm-analyse info: ',
                            response.statusCode
                        );
                    }
                }
            );
        });
    },

    connect(info) {
        this.progressIndicator.show();
        const fileName = this.cachedFileName(info.version);

        const ElmAnalyseEditor = require(fileName);
        const elmAnalyseEditor = ElmAnalyseEditor();

        elmAnalyseEditor.onState(state =>
            this.processElmAnalyseMessage(info, state)
        );
        elmAnalyseEditor.start();
    },

    processElmAnalyseMessage(info, state) {
        console.log('Process elm analyse message');
        console.log(typeof state);

        if (state.progress === 'idle') {
            this.progressIndicator.hide();
        } else {
            this.progressIndicator.show();
        }

        this.linter.clearMessages();

        const allMessages = [];
        const messsagesList = Object.keys(state.files).forEach(fileName => {
            console.log(fileName);
            const messages = state.files[fileName];
            messages.forEach(m => {
                m.location.file = path.resolve(info.cwd, m.location.file);
                allMessages.push(m);
            });
        });

        this.linter.setAllMessages(allMessages);
    }
};
