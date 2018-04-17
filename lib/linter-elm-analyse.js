'use babel';

import fs from 'fs';
import request from 'request';
import path from 'path';
import { CompositeDisposable } from 'atom';
import { BufferedProcess } from 'atom';
import PortPrompt from './port-prompt';
import ProgressIndicator from './progress-indicator';

const connectCommand = [
  {
    label: 'Packages',
    submenu: [
      {
        label: 'Linter Elm Analyse',
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
        label: 'Linter Elm Analyse',
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

export default {
  lints: [],
  linter: null,
  connection: null,
  portPrompt: null,

  activate(state) {
    atom.menu.add(connectCommand);

    this.progressIndicator = new ProgressIndicator();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'elm-analyse:connect': () => this.askPort(),
        'elm-analyse:disconnect': () => this.disconnect()
      })
    );

    this.portPrompt = new PortPrompt(port => {
      this.connect(port)
    });
  },

  askPort() {
    if (this.connection) {
      atom.notifications.addInfo('Already connected to elm-analyse.');
      return;
    }
    this.portPrompt.open();
  },
  connect(port) {
    console.log(`Connect with port: ${port}`);
    if (this.connection) {
      atom.notifications.addInfo('Already connected to elm-analyse.');
      return;
    }

    var connection = {
      status: 'connecting',
      value: null
    };
    this.connection = connection;

    this.getInfo(port)
      .then(info => this.cachedEditorElmJs(info, port))
      .then(info => this.connectToElmAnalyse(info, port))
      .then(c => {
        connection.status = 'connected';
        connection.value = c;
        this.onConnectedState();
      })
      .catch(error => {
        connection.status = 'failed';
        console.error(error);
        this.onConnectionFailedState(error);
      });
  },

  consumeIndie(registerIndie) {
    const linter = registerIndie({
      name: 'Elm Analyse'
    });
    this.linter = linter;
    this.subscriptions.add(linter);

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

  disconnect() {
    if (!this.connection) {
      atom.notifications.addInfo(
        "Can't disconnect from elm-analyse while not connected"
      );
      return;
    }
    this.connection.value.stop();
    this.connection = null;
    this.progressIndicator.hide();
    this.linter.clearMessages();

    atom.menu.add(connectCommand);
    atom.menu.remove(disconnectCommand);
    atom.notifications.addSuccess('Disconnected connected to elm-analyse.');
  },

  onConnectedState() {
    atom.menu.add(disconnectCommand);
    atom.menu.remove(connectCommand);
    atom.notifications.addSuccess('Connected to elm-analyse.');
  },

  onConnectionFailedState(error) {
    atom.notifications.addWarning(
      'Could not connect to elm-analyse due to error.\nIs elm-analyse running in server mode?',
      {
        detail: error
      }
    );
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

  consumeStatusBar(statusBar) {
    if (!statusBar) return;
    this.progressIndicator.setStatusBar(statusBar);
  },

  getInfo(port) {
    return new Promise((accept, reject) => {
      request(`http://localhost:${port}/info`, (error, response, body) => {
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

    return path.resolve(__dirname, '../tmp', `linter-editor-elm-${version}.js`);
  },

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
  },

  connectToElmAnalyse(info, port) {
    this.progressIndicator.show();
    const fileName = this.cachedFileName(info.version);

    const ElmAnalyseEditor = require(fileName);
    const elmAnalyseEditor = ElmAnalyseEditor(port);

    elmAnalyseEditor.onState(state =>
      this.processElmAnalyseMessage(info, state)
    );
    elmAnalyseEditor.start();
    return elmAnalyseEditor;
  },

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
        message.location.file = path.resolve(info.cwd, message.location.file);
        allMessages.push(message);
      });
    });

    this.linter.setAllMessages(allMessages);
  }
};
