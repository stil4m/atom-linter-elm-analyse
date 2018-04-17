'use babel';

import fs from 'fs';
import request from 'request';
import path from 'path';
import { CompositeDisposable } from 'atom';
import { BufferedProcess } from 'atom';

import ProgressIndicator from './progress-indicator';

const connectCommand = [
  {
    label: 'Packages',
    submenu: [
      {
        label: 'Elm Analyse',
        submenu: [
          {
            label: 'Connect',
            command: 'linter-elm-analyse:connect'
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
            command: 'linter-elm-analyse:disconnect'
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

  activate(state) {
    atom.menu.add(connectCommand);

    this.elmProjectPath = new ElmProjectPath();
    this.progressIndicator = new ProgressIndicator();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'linter-elm-analyse:connect': () => this.connect(),
        'linter-elm-analyse:disconnect': () => this.disconnect()
      })
    );

    // atom.workspace.addModalPanel(
    //   {item : "<atom-text-editor>"}
    // )
  },

  connect() {
    var connection = {
      status: 'connecting',
      value: null
    };
    this.connection = connection;

    this.getInfo()
      .then(info => this.cachedEditorElmJs(info))
      .then(info => this.connectToElmAnalyse(info))
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

  disconnect() {
    this.connection.value.stop();
    this.connection = null;
    this.progressIndicator.hide();
    this.linter.clearMessages();

    atom.menu.add(connectCommand);
    atom.menu.remove(disconnectCommand);
  },

  onConnectedState() {
    atom.menu.add(disconnectCommand);
    atom.menu.remove(connectCommand);

  },

  onConnectionFailedState() {
    // Show error balloon
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

  getInfo() {
    return new Promise((accept, reject) => {
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

    return path.resolve(__dirname, '../tmp', `linter-editor-elm-${version}.js`);
  },

  cachedEditorElmJs(info) {
    console.log('Cached!');
    const fileName = this.cachedFileName(info.version);
    return new Promise((accept, reject) => {
      if (fs.existsSync(fileName)) {
        accept(info);
        return;
      }
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

  connectToElmAnalyse(info) {
    console.log('Connect');
    this.progressIndicator.show();
    const fileName = this.cachedFileName(info.version);

    const ElmAnalyseEditor = require(fileName);
    const elmAnalyseEditor = ElmAnalyseEditor();

    elmAnalyseEditor.onState(state =>
      this.processElmAnalyseMessage(info, state)
    );
    elmAnalyseEditor.start();
    return elmAnalyseEditor;
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
      messages.forEach(message => {
        message.location.file = path.resolve(info.cwd, message.location.file);
        allMessages.push(message);
      });
    });

    this.linter.setAllMessages(allMessages);
  }
};
