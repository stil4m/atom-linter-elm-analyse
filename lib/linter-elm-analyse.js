'use babel';

import { CompositeDisposable } from 'atom';

import ElmProjectPath from './elm-project-path';
import ProgressIndicator from './progress-indicator';

const atomLinter = require('atom-linter');

export default {

    activate(state) {
        console.log("LinterElmAnalyse::activate");

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

    consumeStatusBar(statusBar) {
        console.log("LinterElmAnalyse::consumeStatusBar");
        console.log(statusBar);

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

        atomLinter.exec(executablePath, args, {
            timeout,
            stream,
            env: process.env,
            cwd
        }).then((object) => {
            console.log("stdout: ");
            let output = JSON.parse(object.stdout);
            console.log(output);
            console.log("stderr: " + object.stderr);
            console.log("exitCode: " + object.exitCode);

            this.progressIndicator.hide();
        });
    }

};
