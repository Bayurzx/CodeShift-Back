const { createClient } = require("@astrajs/rest");
require('dotenv').config();


// const astraClient = await createClient({
//     astraDatabaseId: process.env.ASTRA_DB_ID,
//     astraDatabaseRegion: process.env.ASTRA_DB_REGION,
//     applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN,
// });

async function initAstraClient() {
    try {
        const astraClient = await createClient({
            astraDatabaseId: process.env.ASTRA_DB_ID,
            astraDatabaseRegion: process.env.ASTRA_DB_REGION,
            applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN,
        });

        return astraClient;
    } catch (error) {
        // console.error("Astra client initialization error:", error);
        throw error; // Re-throw the error for higher-level handling
    }
}

// Initialize the Astra client
const astraClientPromise = initAstraClient();


// const basePath = `/api/rest/v2/namespaces/hack/collections/autodocs`;
// const basePathError = `/api/rest/v2/namespaces/hack/collections/errors`;
const basePath = `/api/rest/v2/namespaces/hack/collections/autodocsTest`;
const basePathError = `/api/rest/v2/namespaces/hack/collections/errorsTest`;




// In a case users want to add more repos selection
const addMoreDocinDb = async (repoUserName, docArr) => {
    const astraClient = await astraClientPromise;

    try {
        const { status: repoCountStatus, data: repoCountData } = await astraClient.get(
            `${basePath}/${repoUserName}/repoCount`
        );

        if (repoCountStatus === 200 && repoCountData > 3) {
            throw new Error("In developent, you can only process a maximum of 4 repos")
        }


        const { status: docListStatus, data: docListData } = await astraClient.get(
            `${basePath}/${repoUserName}/docList`
        );

        console.log("docListData\n", JSON.stringify(docListData));
        console.log("docArr\n", JSON.stringify(docArr));
        
        const newDocArr = convertData(docArr)

        console.log("docListData\n", JSON.stringify(docListData));
        console.log("newDocArr\n", JSON.stringify(newDocArr));
        
        const allNewArr = compareArrays(newDocArr, docListData)

        const repoAllowed = allNewArr.slice(0, 4)

        console.log("repoAllowed\n", JSON.stringify(repoAllowed));

        const newListOfRepo = repoAllowed.map((obj) => Object.keys(obj)[0])

        const { data: newDocListData, status: newDocListStatus } = await astraClient.put(`${basePath}/${repoUserName}/docList`, repoAllowed);
        const { data: newListOfRepoData, status: newListOfRepoStatus } = await astraClient.put(`${basePath}/${repoUserName}/listOfRepo`, newListOfRepo);
        const { data: newRepoCountData, status: newrepoCountStatus } = await astraClient.put(`${basePath}/${repoUserName}/repoCount`, newListOfRepo.length);

        console.log(`newDocListStatus: ${newDocListStatus}`);
        console.log(`newDocListData: ${JSON.stringify(newDocListData)}`);
        console.log(`newListOfRepoStatus: ${newListOfRepoStatus}`);
        console.log(`newListOfRepoData: ${JSON.stringify(newListOfRepoData)}`);
        console.log(`newrepoCountStatus: ${newrepoCountStatus}`);
        console.log(`newRepoCountData: ${JSON.stringify(newRepoCountData)}`);

        return { newDocListData, newDocListStatus }


    } catch (error) {
        console.error("Error in addMoreDocinDb:", error);
        throw error;
    }

}

const createDocinDbList = async (repoUserName, docArr) => {
    const astraClient = await astraClientPromise;

    console.log("repoUserName", repoUserName);
    console.log("docArr", docArr);

    try {

        const listOfRepo = []
        // Send a PUT request to create the initial document

        const docList = docArr.map((docData) => {
            console.log("docData", docData);
            listOfRepo.push(docData.repoName)
            return {
                [docData.repoName]: {
                    "first": docData.aiResponse,
                    "current": docData.aiResponse
                }
            }
        })

        const initialDocument = {

            "docList": docList,
            "listOfRepo": listOfRepo,
            "repoCount": docArr.length,
            "lastUpdatedTimestamp": Date.now(),
            "latestCommit": "no-commit"
        };


        // Send a PUT request to create the initial document
        const { data, status } = await astraClient.put(`${basePath}/${repoUserName}`, initialDocument);

        console.log(`Status: ${status}`);
        console.log(`data: ${JSON.stringify(data)}`);

        return { data, status }


    } catch (error) {
        console.error("Error in createDocinDbList:", error);
        throw error;
    }

}

const createDocOnPush = async (repoUserName, repoName, aiResponse, commitHash) => {
    const astraClient = await astraClientPromise;

    function filterObjectsByKeyAndPopulate(array, keyToFind, valueToPopulate, commitHash) {
        return array.filter((object) => {
            if (keyToFind in object) {
                object[keyToFind][commitHash] = valueToPopulate;
                object[keyToFind]["current"] = valueToPopulate;
                return true;
            }
            return false;
        });
    }

    try {


        const { data: docListData, docListStatus } = await astraClient.get(
            `${basePath}/${repoUserName}/docList`
        );

        console.log("docListData", JSON.stringify(docListData));
        const oldDocListData = docListData;

        console.log("docListData is now");
        // console.log(JSON.stringify(filterObjectsByKeyAndPopulate(docListData, repoName, aiResponse, commitHash)))
        // const latestDocListData = filterObjectsByKeyAndPopulate(docListData, repoName, aiResponse, commitHash)
        const latestDocListData = filterObjectsByKeyAndPopulate(docListData, repoName, aiResponse, commitHash)
        console.log('docListData', docListData)
        console.log("latestDocListData")
        console.log(latestDocListData)

        if (docListData.length < 1) {
            throw new Error("Something went wrong! The 'filterObjectsByKeyAndPopulate' function returned an empty array")
            
        }

        const { data, status } = await astraClient.put(
            `${basePath}/${repoUserName}/docList`, docListData);

        const { data: newLatestCommitData, status: newLatestCommitStatus } = await astraClient.put(
            `${basePath}/${repoUserName}/latestCommit`, commitHash);

        console.log(`Status: ${status}`);
        console.log(`data: ${JSON.stringify(data)}`);

        console.log(`newLatestCommitStatus: ${newLatestCommitStatus}`);
        console.log(`newLatestCommitData: ${JSON.stringify(newLatestCommitData)}`);

        return { data, status }

    } catch (error) {
        console.error("Error in createDocOnPush:", error);
        throw error;
    }

}




const getUserDocListInDb = async (repoUserName) => {
    const astraClient = await astraClientPromise;

    try {
        const getSubdocumentRes = await astraClient.get(
            `${basePath}/${repoUserName}/docList`
        );

        return getSubdocumentRes

    } catch (error) {
        console.error("Error in getUserDocListInDb:", error);
        throw error;
    }

}


const getUserRepoInDb = async (repoUserName, repoName) => {
    const astraClient = await astraClientPromise;

    try {
        const {status, data: getSubdocumentRes} = await astraClient.get(
            `${basePath}/${repoUserName}/docList`
        );
        console.log("repoUserName", repoUserName);

        console.log("getSubdocumentRes", getSubdocumentRes);

        const resultArray = getSubdocumentRes
            ?.filter(item => repoName in item)
            ?.map(item => item[repoName].current);


        return resultArray[0]

    } catch (error) {
        console.error("Error in getUserRepoInDb:", error);
        throw error;
    }

}


const getUserDataInDb = async (repoUserName) => {
    const astraClient = await astraClientPromise;

    try {
        const getSubdocumentRes = await astraClient.get(
            `${basePath}/${repoUserName}`
        );

        console.log("getUserDataInDb", JSON.stringify(getSubdocumentRes));
        return getSubdocumentRes

    } catch (error) {
        console.error("Error in getUserDataInDb:", error);
        throw error;
    }

}

const getAllDataInDb = async () => {
    const astraClient = await astraClientPromise;

    try {
        const getSubdocumentRes = await astraClient.get(
            `${basePath}`
        );

        console.log("getUserDataInDb", JSON.stringify(getSubdocumentRes));
        return getSubdocumentRes

    } catch (error) {
        console.error("Error in getAllDataInDb:", error);
        throw error;
    }

}

const deleteRepoInDb = async (repoUserName, repoName) => {
    const astraClient = await astraClientPromise;

    try {

        const { data: getDocListData, status: getDocListStatus } = await astraClient.get(
            `${basePath}/${repoUserName}/docList`
        );

        const filteredArray = getDocListData.filter(obj => !obj[repoName]);
        console.log("filteredArray", JSON.stringify(filteredArray));

        const { data, status } = await astraClient.put(
            `${basePath}/${repoUserName}/docList`, filteredArray);


        const newListOfRepo = filteredArray.map((obj) => Object.keys(obj)[0])

        const { data: newListOfRepoData, status: newListOfRepoStatus } = await astraClient.put(`${basePath}/${repoUserName}/listOfRepo`, newListOfRepo);
        const { data: newRepoCountData, status: newrepoCountStatus } = await astraClient.put(`${basePath}/${repoUserName}/repoCount`, newListOfRepo.length);



        // console.log(`Status: ${status}`);
        // console.log(`data: ${JSON.stringify(data)}`);
        // console.log(`newListOfRepoStatus: ${newListOfRepoStatus}`);
        // console.log(`newListOfRepoData: ${JSON.stringify(newListOfRepoData)}`);
        // console.log(`newrepoCountStatus: ${newrepoCountStatus}`);
        // console.log(`newRepoCountData: ${JSON.stringify(newRepoCountData)}`);


        return { data, status }

    } catch (error) {
        console.error("Error in deleteRepoInDb:", error);
        throw error;
    }

}

const deleteUserInDb = async (repoUserName) => {
    const astraClient = await astraClientPromise;


    try {

        const { data, status } = await astraClient.delete(
            `${basePath}/${repoUserName}`
        );

        console.log(`Status: ${status}`);
        console.log(`data: ${JSON.stringify(data)}`);

        return { data, status }

    } catch (error) {
        console.error("Error in deleteUserInDb:", error);
        throw error;
    }
}



const getErrInDb = async (repoUserName) => {
    const astraClient = await astraClientPromise;



    try {
        const { data, status } = await astraClient.get(`${basePathError}/${repoUserName}`);

        console.log(`Status: ${status}`);
        console.log(`data: ${JSON.stringify(data)}`);

        return { data, status }
    } catch (error) {
        console.error("Error in addErrToDb:", error);
        throw error;
    }

}



const addErrToDb = async (repoUserName, repoName, errorMsg) => {
    const astraClient = await astraClientPromise;


    const errorDocument = {
        [Date.now()]: {
            errorMsg
        }
    }

    try {
        const { data, status } = await astraClient.put(`${basePathError}/${repoUserName}/${repoName}`, errorDocument);

        console.log(`Status: ${status}`);
        console.log(`data: ${JSON.stringify(data)}`);

        return { data, status }
    } catch (error) {
        console.error("Error in addErrToDb:", error);
        throw error;
    }

}


function compareArrays(Array1, Array2) {
    // Create a set of keys from Array2
    const existingKeys = new Set();

    Array2.forEach((obj) => {
        const keys = Object.keys(obj);
        keys.forEach((key) => {
            existingKeys.add(key);
        });
    });

    // Filter and push items from Array1 to Array2
    Array1.forEach((obj) => {
        const keys = Object.keys(obj);
        const shouldPush = keys.every((key) => !existingKeys.has(key));

        if (shouldPush) {
            Array2.push(obj);
        }
    });

    return Array2;
}


function convertData(inputData) {
    return inputData.map((item) => {
        const { aiResponse, repoName } = item;

        // Create the desired structure
        return {
            [repoName]: {
                current: { ...aiResponse },
                first: { ...aiResponse },
            },
        };
    });
}


// *****************************************************************
// ******************* Testing Begins Here! *************************

const dataGen = [
    // {
    //     repoName: "repo1",
    //     aiResponse: {
    //         "Documentation Title": "Title 1",
    //         "Brief Introduction": "Introduction 1",
    //         "Installation and/or Usage": "Usage 1",
    //         "Conclusion": "Conclusion 1",
    //     },
    // },
    // {
    //     repoName: "repo2",
    //     aiResponse: {
    //         "Documentation Title": "Title 2",
    //         "Brief Introduction": "Introduction 2",
    //         "Installation and/or Usage": "Usage 2",
    //         "Conclusion": "Conclusion 2",
    //     },
    // },
    {
        repoName: "repo3x",
        aiResponse: {
            "Documentation Title": "Title 3",
            "Brief Introduction": "Introduction 3",
            "Installation and/or Usage": "Usage 3",
            "Conclusion": "Conclusion 3",
        },
    },
];

const dataGen2 = [
    {
        repoName: "test-geist",
        aiResponse: {
            "Documentation Title": "Title 1",
            "Brief Introduction": "Introduction 1",
            "Installation and/or Usage": "Usage 1",
            "Conclusion": "Conclusion 1",
        },
    },
    {
        repoName: "sketchfab",
        aiResponse: {
            "Table of Contents": [
                "- Table of Contents",
                "- Documentation Title",
                "- Brief Introduction",
                "- Installation and/or Usage",
                "- File Structure",
                "- Explanation of core Functions/Methods with usage examples"
            ],
            "Documentation Title": "sketchfab-frontend-tech-exercise",
            "Brief Introduction": "The purpose of this project is to demonstrate the usage of the Sketchfab API to fetch and display 3D models. The project is built using React and Materialize CSS.",
            "Installation and/or Usage": "To install and run the project, please follow the steps below:\n\n1. Clone the repository\n2. Run `npm install` to install the dependencies\n3. Run `npm start` to start the development server\n4. Open `http://localhost:3000` in your browser",
            "File Structure": [
                {
                    "name": "App.js",
                    "path": "src/App.js"
                },
                {
                    "name": "App.test.js",
                    "path": "src/App.test.js"
                },
                {
                    "name": "card.js",
                    "path": "src/components/card/card.js"
                },
                {
                    "name": "modal.js",
                    "path": "src/components/modal/modal.js"
                },
                {
                    "name": "modelList.js",
                    "path": "src/components/modelList/modelList.js"
                },
                {
                    "name": "navigation.js",
                    "path": "src/components/navigation/navigation.js"
                },
                {
                    "name": "pagination.js",
                    "path": "src/components/pagination/pagination.js"
                },
                {
                    "name": "search.js",
                    "path": "src/components/search/search.js"
                },
                {
                    "name": "tools.js",
                    "path": "src/helpers/tools.js"
                },
                {
                    "name": "index.js",
                    "path": "src/index.js"
                },
                {
                    "name": "serviceWorker.js",
                    "path": "src/serviceWorker.js"
                },
                {
                    "name": "apiService.js",
                    "path": "src/services/apiService.js"
                }
            ],
            "Explanation of core Functions/Methods with usage examples": [
                {
                    "name": "allModels()",
                    "description": "This function makes a call to the Sketchfab API to fetch all models.",
                    "example": "allModels()\n    .then((response) => {\n       console.log(response);\n    });"
                },
                {
                    "name": "myModels()",
                    "description": "This function makes a call to the Sketchfab API to fetch the user's models.",
                    "example": "myModels()\n    .then((response) => {\n       console.log(response);\n    });"
                },
                {
                    "name": "myFavoriteModels()",
                    "description": "This function makes a call to the Sketchfab API to fetch the user's favorite models.",
                    "example": "myFavoriteModels()\n    .then((response) => {\n       console.log(response);\n    });"
                },
                {
                    "name": "searchOnAllModels(query)",
                    "description": "This function makes a call to the Sketchfab API to search for models in all models.",
                    "example": "searchOnAllModels('car')\n    .then((response) => {\n       console.log(response);\n    });"
                },
                {
                    "name": "searchOnMyModels(query)",
                    "description": "This function makes a call to the Sketchfab API to search for models in user's models.",
                    "example": "searchOnMyModels('car')\n    .then((response) => {\n       console.log(response);\n    });"
                },
                {
                    "name": "fetchNewPage(url)",
                    "description": "This function makes a call to the Sketchfab API to fetch the next or previous page of models.",
                    "example": "fetchNewPage('https://api.sketchfab.com/v3/models?page=2')\n    .then((response) => {\n       console.log(response);\n    });"
                }
            ],
            "Conclusion": "This documentation provides an overview of the code structure and the core functions/methods used in the sketchfab-frontend-tech-exercise project. It also includes installation and usage instructions. For more detailed information, please refer to the comments in the code."
        },
    },

];

const dataGen3 = [
    {
        repoName: "repo1",
        aiResponse: {
            "Documentation Title": "Title 1",
            "Brief Introduction": "Introduction 1",
            "Installation and/or Usage": "Usage 1",
            "Conclusion": "Conclusion 1",
        },
    },
    {
        repoName: "repo2",
        aiResponse: {
            "Documentation Title": "Title 2",
            "Brief Introduction": "Introduction 2",
            "Installation and/or Usage": "Usage 2",
            "Conclusion": "Conclusion 2",
        },
    },
    {
        repoName: "repo3",
        aiResponse: {
            "Documentation Title": "Title 3",
            "Brief Introduction": "Introduction 3",
            "Installation and/or Usage": "Usage 3",
            "Conclusion": "Conclusion 3",
        },
    },
];



const aiResponse = {
    "Brief Introductionxxx": "Introduction 3",
    "Conclusion": "Conclusion 3",
    "Documentation Title": "Titlexxx 3",
    "Installation and/or Usage": "Usage 3"
}

// createDocinDbList("bayurzxsmtp", dataGen2)
// getUserDataInDb("bayurzxsmtp")
// getAllDataInDb()
// createDocOnPush2("userB")
// createDocOnPush("userB", "repo3x", aiResponse, "nfu9wfo30s2")
// getAllDataInDb()
// deleteRepoInDb("userBayurzx", "repo1")
// deleteUserInDb("userB")
// addErrToDb("userB", "repo3", "I have deleted anything that has to do with userB")
// getErrInDb("userB")


module.exports = { addMoreDocinDb, createDocinDbList, createDocOnPush, getUserDocListInDb, getUserDataInDb, getAllDataInDb, deleteRepoInDb, deleteUserInDb, getErrInDb, addErrToDb, getUserRepoInDb };