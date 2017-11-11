'use babel';

import { CompositeDisposable } from 'atom';

import ElmProjectPath from './elm-project-path';

const atomLinter = require('atom-linter');

export default {

    activate(state) {
        console.log("Linter Elm Analyse::activate");

        this.elmProjectPath = new ElmProjectPath();

        this.subscriptions = new CompositeDisposable();

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
        });

    },

    deactivate() {
        this.subscriptions.dispose();
    },

    serialize() {
        return {};
    }

};
