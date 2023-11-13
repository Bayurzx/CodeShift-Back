const { Octokit } = require("@octokit/core");
require('dotenv').config();
const path = require('path');
// const fs = require('fs');
// const crypto = require("crypto");

const GITHUB_PAT = process.env.GITHUB_PAT; // Your GitHub Personal Access Token

const octokit = new Octokit({ auth: GITHUB_PAT });

const allowedLanguages = ["js", "py", "ts", "java", "cs", "cpp", "go", "php", "rb"];

let allFiles = [];

// function writeTextToFile(filename, content) {
//     const timestamp = crypto.randomBytes(3).toString('hex');
//     const fileName = `${filename}-${timestamp}.json`; // Create the file name

//     fs.writeFile(fileName, content.join("###"), (err) => {
//         if (err) {
//             console.error(`Error writing to ${fileName}: ${err}`);
//         } else {
//             console.log(`Text written to ${fileName}`);
//         }
//     });
// }

async function getAllFiles(owner, repoName, path = '') {
    try {
        const { data: files } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo: repoName,
            path: path,
        });

        const allRepoFiles = [];

        for (const file of files) {
            if (file.type === 'dir') {
                const subDirFiles = await getAllFiles(owner, repoName, file.path);
                allRepoFiles.push(...subDirFiles);
            } else {
                allRepoFiles.push(file);
            }
        }

        return allRepoFiles;
    } catch (error) {
        console.error(`Error fetching files: ${error.message}`);
    }
}

async function getMostPopularLanguage(files) {
    const languageCounts = {};

    files.forEach(file => {
        const language = path.extname(file.path).slice(1);

        if (language && allowedLanguages.includes(language)) {
            languageCounts[language] = (languageCounts[language] || 0) + 1;
        }
    });

    const mostPopularLanguage = Object.keys(languageCounts).reduce((a, b) =>
        languageCounts[a] > languageCounts[b] ? a : b
    );

    return mostPopularLanguage;
}

async function getContentOfFilesWithLanguage(language, owner, repoName) {
    const languageFiles = [];
    const metaFiles = [];
    const metadataFiles = {
        js: ['package.json', 'Dockerfile'],
        py: ['requirements.txt', 'Dockerfile'],
        ts: ['package.json', 'Dockerfile'],
        java: ['pom.xml', 'Dockerfile'],
        cs: ['*.csproj', 'Dockerfile'],
    };

    const files = allFiles;
    files.forEach(file => {
        if (path.extname(file.path).slice(1) === language) {
            languageFiles.push(file);
        }

        if (metadataFiles[language].includes(file.path)) {
            metaFiles.push(file);
        }
    });

    const getFileContents = async (files, owner, repoName) => {
        return Promise.all(files?.map(async (file) => {
            const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner,
                repo: repoName,
                path: file.path,
            });

            return {
                path: file.path,
                content: Buffer.from(data.content, 'base64').toString('utf8'),
            };
        }));
    }

    const fileContents = await getFileContents(languageFiles, owner, repoName);
    const metaContents = await getFileContents(metaFiles, owner, repoName);

    return { fileContents, metaContents };
}

const githubReader = async (owner, repoName) => {
    allFiles = await getAllFiles(owner, repoName);
    const mostPopularLanguage = await getMostPopularLanguage(allFiles);

    console.log(`Most popular language in the repository: ${mostPopularLanguage}`);

    const content = await getContentOfFilesWithLanguage(mostPopularLanguage, owner, repoName);

    const mostPopularFilesArr = content.fileContents?.map(file => {
        return `\n\n# ${file.path}\n\n${file.content}\n`;
    });

    // writeTextToFile(`FilesArr-${repoName}`, mostPopularFilesArr);

    const metaFilesArr = content.metaContents?.map(file => {
        return `\n\n# ${file.path}\n\n${file.content}\n`;
    });

    // writeTextToFile(`metaFilesArr-${repoName}`, metaFilesArr);

    return { mostPopularFilesArr, metaFilesArr };
};

// **********************************************************************

const diffReader = async (context) => {
    const { ref, before, after, repository } = context;
    const [headBranch, headSha] = ref.split("/").slice(-2);
    const [owner, repo] = repository.full_name.split("/")




    // Get the content of git diff
    try {
        // Make a GET request to the GitHub API to fetch the diff
        const response = await octokit.request(
            "GET /repos/:owner/:repo/compare/:base...:head",
            {
                owner: owner,
                repo: repo,
                base: before,
                head: after,
            }
        );

        // Parse the response to get the diff content
        const diffContent = response.data.files.map((file) => ({
            filename: file.filename,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: file.patch,
        }));

        // You can now work with the diff content as needed
        console.log(`Diff Content: ${JSON.stringify(diffContent)}`);

        return diffContent
    } catch (error) {
        console.error("Error fetching diff:", error);
    }


}




const checkCreate = (context, startTime) => {
    const { ref, before, after, repository } = context;
    const [headBranch, headSha] = ref.split("/").slice(-2);
    const [owner, repo] = repository.full_name.split("/")

    octokit
        .checks
        .create({
            name: "AutoDocs AI!",
            head_branch: headBranch,
            head_sha: headSha,
            status: "completed",
            started_at: startTime,
            conclusion: "success",
            completed_at: new Date().toISOString(),
            output: {
                title: "AI Doc Creation!",
                summary: `The last commit @ ${after.substring(0, 7)} was successfully tracked and we are processing it with our LLMs!`,
            },
        })
        .then(({ data }) => {
            // Data contains information about the created check
            console.log("Check created:", data);
        })
        .catch((error) => {
            console.error("Error creating check:", error);
        });

}















// githubReader('bayurzxsmtp', 'react_sketchfab_api');
// githubReader('bayurzxsmtp', 'translateReadme');
// githubReader('bayurzxsmtp', 'ytPlayerHider');
// githubReader('bayurzxsmtp', 'simpleChatGpt');
// githubReader('bayurzxsmtp', 'image-thumbnail-generator');
// githubReader('bayurzxsmtp', 'imageToText');
// githubReader('bayurzxsmtp', 'simpleChatGpt').then((res) => console.log(res));

// Takes in `repoUser` and `repoName` returns an object containing an array of string. Implement the writeTextToFile function 

// export default githubReader;
module.exports = { githubReader, diffReader, checkCreate };
