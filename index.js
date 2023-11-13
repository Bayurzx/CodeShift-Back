const { CloudEvent } = require('cloudevents');

const { llm2048, llmPush, countTokens } = require('./llm');
const { separateAddedAndRemoved } = require('./patchAddRemove');
const { githubReader, diffReader, checkCreate } = require('./repoReader');
const { addMoreDocinDb, createDocinDbList, getUserRepoInDb, createDocOnPush, getUserDocListInDb, getUserDataInDb, getAllDataInDb, deleteRepoInDb, deleteUserInDb, getErrInDb, addErrToDb } = require('./db');

/**
 * Your CloudEvent handling function, invoked with each request.
 * This example function logs its input, and responds with a CloudEvent
 * which echoes the incoming event data
 *
 * It can be invoked with 'func invoke'
 * It can be tested with 'npm test'
 *
 * @param {Context} context a context object.
 * @param {object} context.body the request body if any
 * @param {object} context.query the query string deserialzed as an object, if any
 * @param {object} context.log logging object with methods for 'info', 'warn', 'error', etc.
 * @param {object} context.headers the HTTP request headers
 * @param {string} context.method the HTTP request method
 * @param {string} context.httpVersion the HTTP protocol version
 * See: https://github.com/knative/func/blob/main/docs/function-developers/nodejs.md#the-context-object
 * @param {CloudEvent} event the CloudEvent
 */
const handle = async (context, event) => {
  // Your GitHub event handling logic
  const eventType = context.headers["x-github-event"];
  const eventData = event;

  switch (eventType) {
    case 'installation_repositories':
      handleInstallationRepositoriesEvent(eventData);
      break;
    case 'push':
      handlePushEvent(eventData);
      break;
    default:
      context.log.error(`Unsupported GitHub event type: ${eventType}`);
      // console.error(`Unsupported GitHub event type: ${eventType}`);
      break;
  }

  // Respond with a CloudEvent echoing the incoming event data
  return new CloudEvent({
    source: 'event.handler',
    type: 'echo',
    data: event.data
  });
};


// Your function to handle "installation_repositories" events
const handleInstallationRepositoriesEvent = (eventData) => {
  const action = eventData.action;

  if (action === 'added') {
    handleInstallationRepositoriesAdded(eventData);
  } else if (action === 'removed') {
    handleInstallationRepositoriesRemoved(eventData);
  } else {
    context.log.error(`Unsupported action for installation_repositories: ${action}`);
    // console.error(`Unsupported action for installation_repositories: ${action}`);
  }
};

function findCurrentByKey(array, keyToFind) {
  const foundObject = array.find(obj => Object.keys(obj).includes(keyToFind));

  if (foundObject) {
    return JSON.stringify(foundObject[keyToFind].current);
  } else {
    context.log.error(`Failed to find ${keyToFind} in DB ending operation...`)
    throw new Error(`Failed to find ${keyToFind} in DB ending operation...`)

  }
}

const handlePushEvent = async (eventData) => {

  const repoUserName = eventData.sender.login
  const [owner, repoName] = eventData?.repository?.full_name.split("/")
  const commitHash = eventData.after


  const repositoriesDiff = await diffReader(eventData)

  context.log.info(`"repositoriesDiff", ${repositoriesDiff}`);


  try {
    // Using Promise.all to run llm2048 and githubReader in parallel
    const docArrReturned = await Promise.all(
      repositoriesDiff.map(async (repo) => {

        if (repo.changes < 11) {
          context.log.info(`repo.changes: ${repo.changes}`);
          throw new Error("Sorry there wasn't enough changes to trigger operation")
        }


        const cleanedDiff = separateAddedAndRemoved(repo.patch)
        context.log.info(`cleanedDiff: ${cleanedDiff}`);
        let oldText = (await getUserRepoInDb(owner, repoName))

        oldText = findCurrentByKey(oldText, repoName)

        context.log.info(`oldText: ${oldText}`);
        const llmPushResponse = await llmPush(oldText, cleanedDiff)

        const val = await createDocOnPush(owner, repoName, llmPushResponse, commitHash)
        context.log.info(`createDocOnPush val: ${val}`);



        return val
      })
    );

    context.log.info(`"docArrReturned", ${docArrReturned}`);

    const createDocinDbListReturned = await createDocinDbList(repoUserName, docArrReturned)

    context.log.info(`"createDocinDbListReturned", ${createDocinDbListReturned}`);


    // context.log.info(`Processing createDocinDbList completed successfully: ${createDocinDbListReturned}`);
  } catch (error) {
    const newError = error.message ? error.message : error;

    context.log.error(`"Error:", ${newError}`);
    // context.log.error(`Error @ handleInstallationRepositoriesAdded: ${newError}`);

  }
};


// function to handle "installation_repositories" added action
const handleInstallationRepositoriesAdded = async (eventData) => {

  const repoUserName = eventData.sender.login


  const repositoriesAdded = eventData.repositories_added.slice(0, 4)

  try {
    // Using Promise.all to run llm2048 and githubReader in parallel
    const docArrReturned = await Promise.all(
      repositoriesAdded.map(async (repo) => {
        const [owner, repoName] = repo.full_name.split("/")
        const val = await githubReader(owner, repoName);
        const llmVal = await llm2048(val.mostPopularFilesArr, val.metaFilesArr)
        return { repoName: repoName, aiResponse: llmVal }
      })
    );

    context.log.info(`"docArrReturned", ${docArrReturned}`);

    const createDocinDbListReturned = await createDocinDbList(repoUserName, docArrReturned)

    // context.log.info(`"createDocinDbListReturned", ${createDocinDbListReturned}`);
    context.log.info(`Processing createDocinDbList completed successfully: ${createDocinDbListReturned}`);


  } catch (error) {
    const newError = error.message ? error.message : error;

    // context.log.error(`"Error:", ${newError}`);
    context.log.error(`Error @ handleInstallationRepositoriesAdded: ${newError}`);

  }
};

// Your function to handle "installation_repositories" removed action
const handleInstallationRepositoriesRemoved = async (eventData) => {


  const repositoriesRemoved = eventData.repositories_removed

  try {
    const docDeleteReturned = await Promise.all(
      repositoriesRemoved.map(async (repo) => {
        const [owner, repoName] = repo.full_name.split("/")
        const val = await deleteRepoInDb(owner, repoName);
        return val
      })
    );

    // console.log("docDeleteReturned", docDeleteReturned);
    context.log.info(`Processing createDocinDbList completed successfully: ${docDeleteReturned}`);




  } catch (error) {
    const newError = error.message ? error.message : error;
    // console.error("Error:", newError);
    context.log.error(`Error @ handleInstallationRepositoriesRemoved: ${newError}`);

  }

};




module.exports = { handle };
