const dotenv = require('dotenv').config();
const moment = require('moment');
const jsonfile = require('jsonfile');
const joinpath = require('path');
const filepath = joinpath.join(__dirname, '..', 'inc', 'GithubCommits.json');

function color(value, statement) {
    //color = { red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36, white: 37 };
    return `\x1b[1m\x1b[${value}m${statement}\x1b[0m`;
}
const fs = require('fs').promises;
async function initializeFile() {
    try {
        const exists = await fs.access(filepath).then(() => true).catch(() => false);
        if (!exists) {
            await fs.mkdir(joinpath.dirname(filepath), { recursive: true });
            await fs.writeFile(filepath, JSON.stringify({}));
        }
    }
    catch (e) {
        console.error(`${color("31", "error:")} ${color("37", "Required File Initialization Failed:")} ${filepath}`);
        console.error(`${color("31", "error:")} ${color("33", "--reason")} ${color("37", "Failed to initialize file due to")} ${e.message}`);
        throw e;
    }
};

const git = require('simple-git')();
async function reposGithub() {
    try {
        const isRepo = await new Promise((resolve) => git.checkIsRepo((e, result) => resolve(!e && result)));
        if (!isRepo) throw new Error(`${color("31", "error:")} ${color("37", "Invalid Github Repository Found.")}`);
        const remotes = await new Promise((resolve, reject) => {
            git.getRemotes(true, (e, result) => (e ? reject(e) : resolve(result)));
        });
        if (!remotes.some(remote => remote.name === 'origin')) {
            throw new Error(`${color("31", "error:")} ${color("37", "No remote repository named \"origin\" found.")}`);
        }
    }
    catch (error) {
        throw new Error(`${color("31", "error:")} ${color("37", "Git repository check failed:")} ${error.message}`);
    }
};

async function verifiedGPG() {
    try {
        await new Promise((resolve, reject) => {
            git.raw(['commit', '--dry-run', '--gpg-sign'], (e) => {
                if (e) reject(new Error(`${color("31", "error:")} ${color("37", "GPG KEY Verification Failed:")} ${e.message}`));
                else resolve();
            });
        });
    }
    catch (error) {
        throw new Error(`${color("31", "error:")} \x1b[1m\x1b[33m--reason" ${color("37", "GPG KEY verification Failed due to")} ${error.message}`);
    }
};

async function GithubConfigs() {
    const variables = ['GIT_USER', 'GIT_EMAIL', 'GIT_SIGNING_KEY', 'GIT_COMMIT_GPGSIGN', 'GIT_TAG_GPGSIGN', 'GIT_GPG_PROGRAM'];
    for (const values of variables) {
        if (!process.env[values]) {
            throw new Error(`${color("31", "error:")} ${color("37", "Required Environment Variable Not Found:")} ${values}`);
        }
    }
    try {
        await reposGithub();
        await git.addConfig('user.name', process.env.GIT_USER);
        await git.addConfig('user.email', process.env.GIT_EMAIL);
        await git.addConfig('user.signingkey', process.env.GIT_SIGNING_KEY);
        await git.addConfig('commit.gpgsign', process.env.GIT_COMMIT_GPGSIGN || 'true');
        await git.addConfig('tag.gpgsign', process.env.GIT_TAG_GPGSIGN || 'true');
        if (process.env.GIT_GPG_PROGRAM) {
            await git.addConfig('gpg.program', process.env.GIT_GPG_PROGRAM);
        }
        await verifiedGPG();
    }
    catch (e) {
        console.error(`${color("31", "error:")} ${color("37", "Github Configuration Errors:")}  ${e.message}`);
        throw e;
    }
}

async function GithubCommits(commits, jd, count = 0) {
    const sd = moment(jd, "YYYY-MM-DD");
    const ed = moment();
    if (!sd.isValid()) {
        console.error(`${color("31", "error:")} ${color("37", "Invalid Date Format:")} ${jd}`);
        console.error(`${color("31", "error:")} ${color("33", "--reason")} ${color("37", "Required Expected Format: YYYY-MM-DD")}`);
        process.exit(1);
    }
    if (sd.isAfter(ed)) {
        console.error(`${color("31", "error:")} ${color("37", "Invalid Date Format:")} ${jd}`);
        console.error(`${color("31", "error:")} ${color("33", "--reason")} ${color("37", "The start date cannot be in the future.")}`);
        process.exit(1);
    }
    const md = ed.diff(sd, "days");
    if (md < 0) {
        console.error(`${color("31", "error:")} ${color("37", "Invalid Date Format:")} ${jd}`);
        console.error(`${color("31", "error:")} ${color("33", "--reason")} ${color("37", "The start date cannot be after the current date.")}`);
        process.exit(1);
    }
    const rd = Math.floor(Math.random() * (md + 1));
    const cd = count === 0 ? Math.floor(Math.random() * 5) + 1 : count;
    let date = sd.clone().add(rd, "days");
    date.set({
        hour: Math.floor(Math.random() * 24),
        minute: Math.floor(Math.random() * 60),
        second: Math.floor(Math.random() * 60)
    });
    const fd = date.format();       // 'YYYY-MM-DDTHH:mm:ssZ'
    if (date.isBefore(sd)) {
        date = sd.clone();
    }
    else if (date.isAfter(ed)) {
        date = ed.clone();
    }
    if (commits === 0) {
        return git.push().catch((e) => {
            throw new Error(`${color("35", "commit:")} ${fd}    ${color("31", "failed")}`);
        });
    }
    jsonfile.writeFile(filepath, { date: fd }, (e) => {
        if (e) {
            console.error(`${filepath}`);
            return;
        }
        git.add([filepath]).commit(fd, { "--date": fd, "--gpg-sign": true }, (e) => {
            if (e) {
                console.log(`${color("35", "commit:")} ${fd}    ${color("31", "failed")}`);
                return;
            }
            process.stdout.write(`${color("35", "commit:")} ${fd}    ${color("32", "passed")}`);
            setTimeout(() => {
                process.stdout.write(`${color("37", " ➜  ")}`);
                setTimeout(() => {
                    process.stdout.write(`${color("33", "pushed")}\n`);
                    if (cd > 1) {
                        GithubCommits(commits - 1, jd, cd - 1);
                    }
                    else {
                        GithubCommits(commits - 1, jd);
                    }
                }, 10);
            }, 10);
        });
    });
}

initializeFile().then(GithubConfigs).then(() => {
    GithubCommits(1, "2024-12-15");
}).catch((e) => {
    console.error(`${color("31", "error:")} ${color("37", "Github Configurations Initialization Failed:")} ${ e.message }`);
    process.exit(1);
});