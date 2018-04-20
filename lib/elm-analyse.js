'use babel';
import fs from 'fs';
import request from 'request';
import path from 'path';

const connectCommand = [
    {
        label: 'Packages',
        submenu: [
            {
                label: 'Elm Analyse',
                submenu: [
                    {
                        label: 'Connect',
                        command: 'elm-analyse:connect'
                    }
                ]
            }
        ]
    }
];

const disconnectCommand = [
    {
        label: 'Packages',
        submenu: [
            {
                label: 'Elm Analyse',
                submenu: [
                    {
                        label: 'Disconnect',
                        command: 'elm-analyse:disconnect'
                    }
                ]
            }
        ]
    }
];

class ElmAnalyseListener {
    constructor(port, fileName, stateCallback) {
        const ElmAnalyseEditor = require(fileName);
        this.editor = ElmAnalyseEditor(port);
        this.stateCallback = stateCallback;
    }

    start() {
        if (this.listener) {
            return;
        }
        this.listener = this.editor.onState(this.stateCallback);
        this.editor.start();
    }

    stop() {
        this.listener();
        this.listener = null;
        this.eidtor.stop();
    }
}

export default class ElmAnalyse {
    linter = null;

    constructor(progressIndicator) {
        atom.menu.add(connectCommand);
        this.progressIndicator = progressIndicator;
    }

    setLinter(linter) {
        this.linter = linter;
    }

    isConnected() {
        return !!this.connection;
    }

    connect(port) {
        this.getInfo(port)
            .then(info => this.cachedEditorElmJs(info, port))
            .then(info => this.connectToElmAnalyse(info, port))
            .then(listener => {
                this.connection = {
                    status: 'connected',
                    value: listener
                };
                this.onConnectedState();
            })
            .catch(error => {
                console.error(error);
                this.onConnectionFailedState(error);
            });
    }

    disconnect() {
        this.connection.value.stop();
        this.connection = null;
        this.progressIndicator.hide();
        this.linter.clearMessages();

        atom.menu.add(connectCommand);
        atom.menu.remove(disconnectCommand);
        atom.notifications.addSuccess('Disconnected connected to elm-analyse.');
    }

    onConnectedState() {
        atom.menu.add(disconnectCommand);
        atom.menu.remove(connectCommand);
        atom.notifications.addSuccess('Connected to elm-analyse.');
    }

    onConnectionFailedState(error) {
        atom.notifications.addWarning(
            'Could not connect to elm-analyse due to error.\nIs elm-analyse running in server mode?',
            {
                detail: error
            }
        );
    }

    getInfo(port) {
        return new Promise((accept, reject) => {
            request(
                `http://localhost:${port}/info`,
                (error, response, body) => {
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
                            reject(
                                'Could not parse elm-analyse info response.'
                            );
                        }
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
    }

    cachedEditorElmJs(info, port) {
        const fileName = this.cachedFileName(info.version);
        return new Promise((accept, reject) => {
            if (fs.existsSync(fileName)) {
                accept(info);
                return;
            }
            request(
                `http://localhost:${port}/editor-elm.js`,
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
    }
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
    }

    connectToElmAnalyse(info, port) {
        this.progressIndicator.show();
        const fileName = this.cachedFileName(info.version);
        const listener = new ElmAnalyseListener(port, fileName, state => {
            console.log('State');
            this.processElmAnalyseMessage(info, state);
        });
        listener.start();
        return listener;
    }

    processElmAnalyseMessage(info, state) {
        if (state.progress === 'idle') {
            this.progressIndicator.hide();
        } else {
            this.progressIndicator.show();
        }

        this.linter.clearMessages();

        const allMessages = [];
        const messsagesList = Object.keys(state.files).forEach(fileName => {
            const messages = state.files[fileName];
            messages.forEach(message => {
                message.location.file = path.resolve(
                    info.cwd,
                    message.location.file
                );
                allMessages.push(message);
            });
        });

        this.linter.setAllMessages(allMessages);
    }
}
