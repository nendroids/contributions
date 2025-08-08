const moment = require('moment');
const dotenv = require('dotenv').config();
const jsonfile = require('jsonfile');
const joinpath = require('path');
const fs = require('fs').promises;
const git = require('simple-git')();

const filepath = joinpath.join(__dirname, '..', 'inc', 'GithubCommits.json');

const log = {
    info: (msg) => console.log(`\x1b[1m\x1b[35mINFO:\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[1m\x1b[92mSUCCESS:\x1b[0m ${msg}`),
    error: (msg) => console.error(`\x1b[1m\x1b[31mERROR:\x1b[0m ${msg}`)
};

const initializeFile = async () => {
    try {
        if (!(await fs.access(filepath).then(() => true).catch(() => false))) {
            await fs.mkdir(joinpath.dirname(filepath), { recursive: true });
            await fs.writeFile(filepath, JSON.stringify({ commits: [] }));
        }
    }
    catch (error) {
        log.error(`Failed to initialize file ${filepath}: ${error.message}`);
        process.exit(1);
    }
};

const checkGitRepo = async () => {
    try {
        const isRepo = await new Promise((resolve) => git.checkIsRepo((err, result) => resolve(!err && result)));
        if (!isRepo) throw new Error('Not a Git repository');
        const remotes = await new Promise((resolve, reject) => {
            git.getRemotes(true, (err, result) => (err ? reject(err) : resolve(result)));
        });
        if (!remotes.some(remote => remote.name === 'origin')) {
            throw new Error('No remote repository named "origin" found');
        }
    }
    catch (error) {
        throw new Error(`Git repository check failed: ${error.message}`);
    }
};

const verifyGpgKey = async () => {
    try {
        await new Promise((resolve, reject) => {
            git.raw(['commit', '--dry-run', '--gpg-sign'], (err) => {
                if (err) reject(new Error('GPG key verification failed'));
                else resolve();
            });
        });
    }
    catch (error) {
        throw new Error(`GPG key verification failed: ${error.message}`);
    }
};

const GithubConfigs = async () => {
    const requiredEnvVars = ['GIT_USER', 'GIT_EMAIL', 'GIT_SIGNING_KEY'];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Environment variable ${envVar} is missing or empty`);
        }
    }
    try {
        await checkGitRepo();
        await git.addConfig('user.name', process.env.GIT_USER);
        await git.addConfig('user.email', process.env.GIT_EMAIL);
        await git.addConfig('user.signingkey', process.env.GIT_SIGNING_KEY);
        await git.addConfig('commit.gpgsign', process.env.GIT_COMMIT_GPGSIGN || 'true');
        await git.addConfig('tag.gpgsign', process.env.GIT_TAG_GPGSIGN || 'true');
        if (process.env.GIT_GPG_PROGRAM) {
            await git.addConfig('gpg.program', process.env.GIT_GPG_PROGRAM);
        }
        await verifyGpgKey();
    }
    catch (error) {
        throw new Error(`Github Configuration Failed: ${error.message}`);
    }
};

const updateJsonFile = async (filepath, date) => {
    try {
        let data = { commits: [] };
        if (await fs.access(filepath).then(() => true).catch(() => false)) {
            data = await jsonfile.readFile(filepath);
        }
        data.commits = data.commits || [];
        data.commits.push(date);
        await jsonfile.writeFile(filepath, data);
    }
    catch (error) {
        throw new Error(`Failed to update JSON file: ${error.message}`);
    }
};

const GithubCommits = async (commits, jd) => {
    const sd = moment(jd, 'YYYY-MM-DD');
    const ed = moment();
    if (!sd.isValid()) {
        log.error(`Invalid Date Format: ${jd}`);
        log.error(`Required Expected Format: YYYY-MM-DD`);
        process.exit(1);
    }
    if (sd.isAfter(ed)) {
        log.error(`Invalid Date Format: ${jd}`);
        log.error(`The start date cannot be in the future.`);
        process.exit(1);
    }
    const md = ed.diff(sd, 'days');
    for (let i = 0; i < commits; i++) {
        const rd = Math.floor(Math.random() * (md + 1));
        const date = sd.clone().add(rd, 'days');
        date.set({
            hour: Math.floor(Math.random() * 24),
            minute: Math.floor(Math.random() * 60),
            second: Math.floor(Math.random() * 60)
        });
        const fd = date.format('YYYY-MM-DD HH:mm:ss ZZ');
        try {
            await updateJsonFile(filepath, fd);
            await new Promise((resolve, reject) => {
                git.add([filepath]).commit(fd, { '--date': fd, '--gpg-sign': true }, (err) => {
                    if (err) {
                        log.error(`commit: ${fd} failed: ${err.message}`);
                        reject(err);
                    }
                    else {
                        log.success(`commit: ${fd} passed`);
                        resolve();
                    }
                });
            });
            await new Promise((resolve, reject) => {
                git.push((err) => {
                    if (err) {
                        log.error(`push failed: ${err.message}`);
                        reject(err);
                    }
                    else {
                        log.info(`pushed`);
                        resolve();
                    }
                });
            });
        }
        catch (error) {
            log.error(`Failed to process commit ${fd}: ${error.message}`);
            process.exit(1);
        }
    }
};

(async () => {
    try {
        await initializeFile();
        await GithubConfigs();
        await GithubCommits(5, '2024-12-15');
    }
    catch (error) {
        log.error(error.message);
        process.exit(1);
    }
})();