## P01
```js

const filepath = "./inc/GithubCommits.json";
const jsonfile = require("jsonfile");
const moment = require("moment");
const simpleGit = require("simple-git");
const GithubCommits = (n) => {
    if (n === 0) {
        console.log('\x1b[36mFinished committing | Pushing to remote...\x1b[0m');
        return simpleGit().push((err) => {
            if (err) {
                console.error("Push Failed :", err);
            } else {
                console.log('\x1b[1m\x1b[33mAll commits pushed successfully\x1b[0m');
            }
            process.exit(0);
        });
    }
    const x = Math.floor(Math.random() * 55);
    const y = Math.floor(Math.random() * 7);
    const date = moment().subtract(1, "y").add(1, "d").add(x, "w").add(y, "d");
    if (date.isAfter(moment())) {
        date.set({ hour: moment().hour(), minute: moment().minute(), second: moment().second() });
    }
    const dateFormatted = date.format();
    const commits = { date: dateFormatted };
    jsonfile.writeFile(filepath, commits, (err) => {
        if (err) {
            console.error(`Failed to write to ${filepath}:`, err);
            return;
        }
        simpleGit().add([filepath]).commit(dateFormatted, { "--date": dateFormatted }, (err, result) => {
            if (err) {
                console.error("Github Commit Failed : ", err);
                return;
            }
            console.log(`\x1b[1m\x1b[33mcommit:\x1b[0m ${dateFormatted}   \x1b[1m\x1b[92mcommitted\x1b[0m`);
            GithubCommits(n - 1);
        });
    });
};
GithubCommits(10);

```

## P02
```js

/*
 * GitHub Contribution Commit Script - Important Notes:
 *
 * 1. Make sure your Git user.name and user.email match your GitHub account exactly.
 * 2. Commit dates must be within the last 365 days to appear on your contribution graph.
 * 3. Each commit must change the file content to be recognized by Git.
 * 4. Push commits to your default branch (usually "main" or "master").
 * 5. Your local repository must be linked correctly to your GitHub remote ("origin").
 * 6. Commits should be made sequentially to avoid conflicts (use async/await).
 * 7. GitHub may take a few minutes to update the contribution graph after pushing.
 * 
 */

import jsonfile from "jsonfile";
import moment from "moment";
import simpleGit from "simple-git";
import random from "random";

const path = "./data.json";
const git = simpleGit();
// Set Git user config once before commits (change to your GitHub credentials)
// Command to check your github credentials in bash        // git config --global --list
await git.addConfig("user.name", "Your GitHub Name");      // git config --global user.name
await git.addConfig("user.email", "your@email.com");       // git config --global user.email

/*
 * markCommit(x, y):
 * Creates a single commit at a specific week (x) and day (y) relative to one year ago.
 * x: week index (0-52)
 * y: day of the week (0=Sunday, 6=Saturday)
 */
const markCommit = async (x, y) => {
    // Calculate date based on x weeks and y days ago from 364 days back
    const date = moment().startOf("day").subtract(364 - (x * 7 + y), "days");
    const isoDate = date.toISOString();
    // Write data.json with date and random number to force file change
    const data = {
        date: isoDate,
        random: Math.random()
    };
    await jsonfile.writeFile(path, data);
    await git.add(path);
    await git.commit(isoDate, { "--date": isoDate });
    await git.push("origin", "main");
};

/*
 * makeCommits(n):
 * Creates n commits randomly distributed over the last year.
 * Commits are made sequentially and pushed at the end.
 */
const makeCommits = async (n) => {
    if (n === 0) {
        await git.push("origin", "main");
        return;
    }
    // Random day within last 365 days
    const date = moment().startOf("day").subtract(random.int(0, 364), "days");
    const isoDate = date.toISOString();
    const data = {
        date: isoDate,
        random: Math.random()
    };
    await jsonfile.writeFile(path, data);
    await git.add(path);
    await git.commit(isoDate, { "--date": isoDate });
    await makeCommits(n - 1); // Await recursive call for sequential commits
};

// Example usage:
markCommit(2, 10); // single commit at week 2, day 10
makeCommits(10);   // create 10 random commits over the last year

```

## P03
```js

const moment = require('moment');
const dotenv = require('dotenv').config();
const jsonfile = require('jsonfile');
const { join } = require('path');
const { promisify } = require('util');
const { promises: fs } = require('fs');
const git = require('simple-git')();

// Constants for configuration
const DEFAULT_COMMIT_COUNT = 5;
const REMOTE_NAME = 'origin';
const DEFAULT_FILE_PATH = join(__dirname, '..', 'inc', 'GithubCommits.json');
const REQUIRED_ENV_VARS = ['GIT_USER', 'GIT_EMAIL', 'GIT_SIGNING_KEY', 'GIT_COMMIT_GPGSIGN', 'GIT_TAG_GPGSIGN'];
const COMMIT_FILE_PATH = process.env.COMMIT_FILE_PATH || DEFAULT_FILE_PATH;

// Promisify jsonfile.writeFile for async/await compatibility
const writeFileAsync = promisify(jsonfile.writeFile);

// Sanitize environment variables to prevent command injection
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/[`$|;<>&]/g, '');
};

// Initialize JSON file for commit tracking
const getInitFile = async () => {
    try {
        const fileExists = await fs.access(COMMIT_FILE_PATH).then(() => true).catch(() => false);
        if (!fileExists) {
            await fs.mkdir(join.dirname(COMMIT_FILE_PATH), { recursive: true });
            await fs.writeFile(COMMIT_FILE_PATH, JSON.stringify({}));
            console.log(`\x1b[1m\x1b[92mSuccess:\x1b[0m Initialized file: ${COMMIT_FILE_PATH}`);
        }
    } catch (error) {
        throw new Error(`Failed to initialize file ${COMMIT_FILE_PATH}: ${error.message}`);
    }
};

// Validate Git repository and remote
const validateRepo = async () => {
    try {
        const isRepo = await git.checkIsRepo();
        if (!isRepo) throw new Error('Invalid Git repository found');
        
        const remotes = await git.getRemotes(true);
        if (!remotes.some(remote => remote.name === REMOTE_NAME)) {
            throw new Error(`No remote repository named "${REMOTE_NAME}" found`);
        }
        console.log(`\x1b[1m\x1b[92mSuccess:\x1b[0m Validated Git repository with remote "${REMOTE_NAME}"`);
    } catch (error) {
        throw new Error(`Git repository check failed: ${error.message}`);
    }
};

// Verify GPG signing capability
const verifyGPG = async () => {
    try {
        await git.raw(['commit', '--dry-run', '--gpg-sign']);
        console.log(`\x1b[1m\x1b[92mSuccess:\x1b[0m GPG key verification passed`);
    } catch (error) {
        throw new Error(`GPG key verification failed: ${error.message}`);
    }
};

// Configure Git with environment variables
const configureGit = async () => {
    try {
        // Validate environment variables
        for (const variable of REQUIRED_ENV_VARS) {
            if (!process.env[variable]) {
                throw new Error(`Required environment variable not found: ${variable}`);
            }
        }

        // Configure Git with sanitized inputs
        await git.addConfig('user.name', sanitizeInput(process.env.GIT_USER));
        await git.addConfig('user.email', sanitizeInput(process.env.GIT_EMAIL));
        await git.addConfig('user.signingkey', sanitizeInput(process.env.GIT_SIGNING_KEY));
        await git.addConfig('commit.gpgsign', process.env.GIT_COMMIT_GPGSIGN || 'true');
        await git.addConfig('tag.gpgsign', process.env.GIT_TAG_GPGSIGN || 'true');
        
        if (process.env.GIT_GPG_PROGRAM) {
            await git.addConfig('gpg.program', sanitizeInput(process.env.GIT_GPG_PROGRAM));
        }

        await validateRepo();
        await verifyGPG();
        console.log(`\x1b[1m\x1b[92mSuccess:\x1b[0m Git configuration completed`);
    } catch (error) {
        throw new Error(`Git configuration failed: ${error.message}`);
    }
};

// Validate start date
const validateDate = (startDate, endDate = moment()) => {
    const sd = moment(startDate, 'YYYY-MM-DD', true);
    if (!sd.isValid()) {
        throw new Error('Invalid date format: Expected YYYY-MM-DD');
    }
    if (sd.isAfter(endDate)) {
        throw new Error('Start date cannot be in the future');
    }
    if (endDate.diff(sd, 'days') < 0) {
        throw new Error('Start date cannot be after the current date');
    }
    return sd;
};

// Generate random commit date within range
const generateRandomDate = (startDate, endDate) => {
    const maxDays = endDate.diff(startDate, 'days') + 1;
    const randomDays = Math.floor(Math.random() * maxDays);
    const date = startDate.clone().add(randomDays, 'days');
    date.set({
        hour: Math.floor(Math.random() * 24),
        minute: Math.floor(Math.random() * 60),
        second: Math.floor(Math.random() * 60)
    });
    return date.isBefore(startDate) ? startDate.clone() : date.isAfter(endDate) ? endDate.clone() : date;
};

// Create and push commits
const createCommits = async (commits, startDate, count = 0) => {
    if (!Number.isInteger(commits) || commits < 0) {
        throw new Error('Commits must be a non-negative integer');
    }

    const endDate = moment();
    const sd = validateDate(startDate, endDate);

    if (commits === 0) {
        try {
            await git.push();
            console.log(`\x1b[1m\x1b[92mSuccess:\x1b[0m All commits pushed to ${REMOTE_NAME}`);
            return;
        } catch (error) {
            throw new Error(`Failed to push commits: ${error.message}`);
        }
    }

    const commitCount = count === 0 ? Math.floor(Math.random() * DEFAULT_COMMIT_COUNT) + 1 : count;
    const commitDate = generateRandomDate(sd, endDate);
    const formattedDate = commitDate.format('YYYY-MM-DD HH:mm:ss ZZ');

    try {
        await writeFileAsync(COMMIT_FILE_PATH, { date: formattedDate });
        await git.add(COMMIT_FILE_PATH);
        await git.commit(formattedDate, { '--date': formattedDate, '--gpg-sign': true });
        console.log(`\x1b[1m\x1b[35mCommit:\x1b[0m ${formattedDate} \x1b[1m\x1b[92mPassed\x1b[0m`);
        
        // Recursively create next commit
        await createCommits(commits - 1, startDate, commitCount - 1);
    } catch (error) {
        console.error(`\x1b[1m\x1b[33mCommit:\x1b[0m ${formattedDate} \x1b[1m\x1b[31mFailed\x1b[0m`);
        throw new Error(`Commit failed: ${error.message}`);
    }
};

// Main execution
const main = async () => {
    try {
        await getInitFile();
        await configureGit();
        await createCommits(5, '2024-12-15');
    } catch (error) {
        console.error(`\x1b[1m\x1b[31mError:\x1b[0m GitHub commit automation failed: ${error.message}`);
        throw error; // Allow caller to handle exit or recovery
    }
};

main().catch((error) => {
    console.error(`\x1b[1m\x1b[31mFatal Error:\x1b[0m ${error.message}`);
    process.exit(1);
});

```

## P04
```js

async function GithubCommits(commits, jd, count = 0) {
    const sd = moment(jd, "YYYY-MM-DD");
    const ed = moment();

    if (!sd.isValid()) {
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mInvalid Date Format:\x1b[0m ${jd}`);
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[33m--reason\x1b[0m \x1b[1m\x1b[37mRequired Expected Format: YYYY-MM-DD\x1b[0m`);
        process.exit(1);
    }

    if (sd.isAfter(ed)) {
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mInvalid Date Format:\x1b[0m ${jd}`);
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[33m--reason\x1b[0m \x1b[1m\x1b[37mThe start date cannot be in the future.\x1b[0m`);
        process.exit(1);
    }

    const md = ed.diff(sd, "days");
    const rd = Math.floor(Math.random() * (md + 1));
    const cd = count === 0 ? Math.floor(Math.random() * 5) + 1 : count;

    let date = sd.clone().add(rd, "days");
    date.set({
        hour: Math.floor(Math.random() * 24),
        minute: Math.floor(Math.random() * 60),
        second: Math.floor(Math.random() * 60)
    });

    const fd = date.format(); // ISO format

    if (commits === 0) {
        try {
            await git.push();
            process.exit(0);
        } catch (err) {
            console.error(`\x1b[1m\x1b[33mcommit:\x1b[0m ${fd}   \x1b[1m\x1b[31mfailed\x1b[0m`);
            process.exit(1);
        }
    }

    try {
        await jsonfile.writeFile(filepath, { date: fd });
        await git.add([filepath]);
        await git.commit(fd, { "--date": fd, "--gpg-sign": true });

        process.stdout.write(`\x1b[1m\x1b[35mcommit:\x1b[0m ${fd}   \x1b[1m\x1b[92mpassed\x1b[0m`);
        await new Promise((res) => setTimeout(res, 10));
        process.stdout.write(`\x1b[37m ➜  \x1b[0m`);
        await new Promise((res) => setTimeout(res, 10));
        process.stdout.write(`\x1b[1m\x1b[33mpushed\x1b[0m\n`);

        if (cd > 1) {
            await GithubCommits(commits - 1, jd, cd - 1);
        } else {
            await GithubCommits(commits - 1, jd);
        }

    } catch (e) {
        console.log(`\x1b[1m\x1b[33mcommit:\x1b[0m ${fd}   \x1b[1m\x1b[31mfailed\x1b[0m`);
    }
}

```

## P05
```js

const moment = require('moment');
const dotenv = require('dotenv').config();
const jsonfile = require('jsonfile');
const joinpath = require('path');
const filepath = joinpath.join(__dirname, '..', 'inc', 'GithubCommits.json');

const fs = require('fs').promises;
const getinitfile = async () => {
    try {
        if (!(await fs.access(filepath).then(() => true).catch(() => false))) {
            await fs.mkdir(joinpath.dirname(filepath), { recursive: true });
            await fs.writeFile(filepath, JSON.stringify({}));
        }
    }
    catch (errors) {
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m Required File Initialization Failed: ${filepath}`);
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[35m--reason\x1b[0m Failed to initialize file due to ${errors.message}`);
        process.exit(1);
    }
};

const reposGithub = async () => {
    try {
        const isRepo = await new Promise((resolve) => git.checkIsRepo((err, result) => resolve(!err && result)));
        if (!isRepo) throw new Error('\x1b[1m\x1b[31merror:\x1b[0m Invalid Github Repository Found.');
        const remotes = await new Promise((resolve, reject) => {
            git.getRemotes(true, (err, result) => (err ? reject(err) : resolve(result)));
        });
        if (!remotes.some(remote => remote.name === 'origin')) {
            throw new Error('\x1b[1m\x1b[31merror:\x1b[0m No remote repository named "origin" found');
        }
    } catch (error) {
        throw new Error(`\x1b[1m\x1b[31merror:\x1b[0m Git repository check failed: ${error.message}`);
    }
};

const verifiedGPG = async () => {
    try {
        await new Promise((resolve, reject) => {
            git.raw(['commit', '--dry-run', '--gpg-sign'], (err) => {
                if (err) reject(new Error('\x1b[1m\x1b[31merror:\x1b[0m GPG KEY Verification Failed:'));
                else resolve();
            });
        });
    } catch (error) {
        throw new Error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[35m--reason\x1b[0m GPG KEY verification Failed due to ${error.message}`);
    }
};

const git = require('simple-git')();
const GithubConfigs = async () => {
    const variables = ['GIT_USER', 'GIT_EMAIL', 'GIT_SIGNING_KEY', 'GIT_COMMIT_GPGSIGN', 'GIT_TAG_GPGSIGN', 'GIT_GPG_PROGRAM'];
    for (const values of variables) {
        if (!process.env[values]) {
            throw new Error(`\x1b[1m\x1b[31merror:\x1b[0m Required Environment Variable Not Found: ${values}`);
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
    catch (errors) {
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m Github Configuration Errors:  ${errors.message}`);
        throw errors;
    }
}

const GithubCommits = async (commits, jd, count = 0) => {
    const sd = moment(jd, "YYYY-MM-DD");
    const ed = moment();
    if (!sd.isValid()) {
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m Invalid Date Format: ${jd}`);
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[35m--reason\x1b[0m Required Expected Format: YYYY-MM-DD`);
        process.exit(1);
    }
    if (sd.isAfter(ed)) {
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m Invalid Date Format: ${jd}`);
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[35m--reason\x1b[0m The start date cannot be in the future.`);
        process.exit(1);
    }
    const md = ed.diff(sd, "days");
    if (md < 0) {
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m Invalid Date Format: ${jd}`);
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[35m--reason\x1b[0m The start date cannot be after the current date.`);
        process.exit(1);
    }
    const rd = Math.floor(Math.random() * (md + 1));
    const cd = count === 0 ? Math.floor(Math.random() * 5) + 1 : count;
    const date = sd.clone().add(rd, "days");
    date.set({
        hour: Math.floor(Math.random() * 24),
        minute: Math.floor(Math.random() * 60),
        second: Math.floor(Math.random() * 60)
    });
    const fd = date.format('YYYY-MM-DDTHH:mm:ssZ');
    if (date.isBefore(sd)) {
        date = sd.clone();
    }
    else if (date.isAfter(ed)) {
        date = ed.clone();
    }
    if (commits === 0) {
        return git.push((errors) => {
            if (errors) {
                console.error(`\x1b[1m\x1b[33mcommit:\x1b[0m ${fd}   \x1b[1m\x1b[31mfailed\x1b[0m`);
                process.exit(1);
            } else {
                process.exit(0);
            }
        });
    }
    jsonfile.writeFile(filepath, { date: fd }, (errors) => {
        if (errors) {
            console.error(`${filepath}`);
            return;
        }
        git.add([filepath]).commit(fd, { "--date": fd, "--gpg-sign": true }, (err, result) => {
            if (err) {
                console.log(`\x1b[1m\x1b[33mcommit:\x1b[0m ${fd}   \x1b[1m\x1b[31mfailed\x1b[0m`);
                return;
            }
            process.stdout.write(`\x1b[1m\x1b[35mcommit:\x1b[0m ${fd}   \x1b[1m\x1b[92mpassed\x1b[0m`);
            setTimeout(() => {
                process.stdout.write(`\x1b[37m ➜  \x1b[0m`);
                setTimeout(() => {
                    process.stdout.write(`\x1b[1m\x1b[33mpushed\x1b[0m\n`);
                    if (cd > 1) {
                        GithubCommits(commits - 1, jd, cd - 1);
                    } else {
                        GithubCommits(commits - 1, jd);
                    }
                }, 10);
            }, 10);
        });
    });
}

getinitfile().then(GithubConfigs).then(() => {
    GithubCommits(10, "2024-12-15");         
}).catch((error) => {
    console.error(`\x1b[1m\x1b[31merror: Github Configurations Initialization Failed\x1b[0m ${error.message}`);
    process.exit(1);
});

```

## P06
```js

const dotenv = require('dotenv').config();
const moment = require('moment');
const jsonfile = require('jsonfile');
const joinpath = require('path');
const filepath = joinpath.join(__dirname, '..', 'inc', 'GithubCommits.json');

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
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mRequired File Initialization Failed:\x1b[0m ${filepath}`);
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[33m--reason\x1b[0m \x1b[1m\x1b[37mFailed to initialize file due to\x1b[0m ${e.message}`);
        throw e;
    }
};

const git = require('simple-git')();
async function reposGithub() {
    try {
        const isRepo = await new Promise((resolve) => git.checkIsRepo((e, result) => resolve(!e && result)));
        if (!isRepo) throw new Error('\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mInvalid Github Repository Found.\x1b[0m');
        const remotes = await new Promise((resolve, reject) => {
            git.getRemotes(true, (e, result) => (e ? reject(e) : resolve(result)));
        });
        if (!remotes.some(remote => remote.name === 'origin')) {
            throw new Error('\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mNo remote repository named "origin" found\x1b[0m');
        }
    }
    catch (error) {
        throw new Error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mGit repository check failed:\x1b[0m ${error.message}`);
    }
};

async function verifiedGPG() {
    try {
        await new Promise((resolve, reject) => {
            git.raw(['commit', '--dry-run', '--gpg-sign'], (e) => {
                if (e) reject(new Error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mGPG KEY Verification Failed:\x1b[0m ${e.message}`));
                else resolve();
            });
        });
    }
    catch (error) {
        throw new Error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[33m--reason\x1b[0m \x1b[1m\x1b[37mGPG KEY verification Failed due to\x1b[0m ${error.message}`);
    }
};

async function GithubConfigs() {
    const variables = ['GIT_USER', 'GIT_EMAIL', 'GIT_SIGNING_KEY', 'GIT_COMMIT_GPGSIGN', 'GIT_TAG_GPGSIGN', 'GIT_GPG_PROGRAM'];
    for (const values of variables) {
        if (!process.env[values]) {
            throw new Error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mRequired Environment Variable Not Found:\x1b[0m ${values}`);
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
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mGithub Configuration Errors:\x1b[0m  ${e.message}`);
        throw e;
    }
}

async function GithubCommits(commits, jd, count = 0) {
    const sd = moment(jd, "YYYY-MM-DD");
    const ed = moment();
    if (!sd.isValid()) {
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mInvalid Date Format:\x1b[0m ${jd}`);
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[33m--reason\x1b[0m \x1b[1m\x1b[37mRequired Expected Format: YYYY-MM-DD\x1b[0m`);
        process.exit(1);
    }
    if (sd.isAfter(ed)) {
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mInvalid Date Format:\x1b[0m ${jd}`);
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[33m--reason\x1b[0m \x1b[1m\x1b[37mThe start date cannot be in the future.\x1b[0m`);
        process.exit(1);
    }
    const md = ed.diff(sd, "days");
    if (md < 0) {
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mInvalid Date Format:\x1b[0m ${jd}`);
        console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[33m--reason\x1b[0m \x1b[1m\x1b[37mThe start date cannot be after the current date.\x1b[0m`);
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
            throw new Error(`\x1b[1m\x1b[33mcommit:\x1b[0m ${fd}   \x1b[1m\x1b[31mfailed\x1b[0m`);
        });
    }
    jsonfile.writeFile(filepath, { date: fd }, (e) => {
        if (e) {
            console.error(`${filepath}`);
            return;
        }
        git.add([filepath]).commit(fd, { "--date": fd, "--gpg-sign": true }, (e) => {
            if (e) {
                console.log(`\x1b[1m\x1b[33mcommit:\x1b[0m ${fd}   \x1b[1m\x1b[31mfailed\x1b[0m`);
                return;
            }
            process.stdout.write(`\x1b[1m\x1b[35mcommit:\x1b[0m ${fd}   \x1b[1m\x1b[92mpassed\x1b[0m`);
            setTimeout(() => {
                process.stdout.write(`\x1b[37m ➜  \x1b[0m`);
                setTimeout(() => {
                    process.stdout.write(`\x1b[1m\x1b[33mpushed\x1b[0m\n`);
                    if (cd > 1) {
                        GithubCommits(commits - 1, jd, cd - 1);
                    }
                    else {
                        GithubCommits(commits - 1, jd);
                    }
                }, 1000);
            }, 1000);
        });
    });
}

initializeFile().then(GithubConfigs).then(() => {
    GithubCommits(10, "2024-12-15");
}).catch((e) => {
    console.error(`\x1b[1m\x1b[31merror:\x1b[0m \x1b[1m\x1b[37mGithub Configurations Initialization Failed:\x1b[0m ${e.message}`);
    process.exit(1);
});

```