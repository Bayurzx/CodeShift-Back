const OpenAI = require('openai');
require('dotenv').config();


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API,
});



const llm2048 = async (text, metaText) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-16k",

            messages: [
                {
                    role: 'system', content: `You are a GitHub code documentation expert generator. Follow this format and return the html of each of this one JSON object

    - Table of Contents
    - Documentation Title
    - Brief Introduction
    - Installation and/or Usage
    - File Structure
    - Core Functions/Methods

    ###
    Here is some  useful metadata:
    ${metaText}
`
                },

                {
                    role: 'user', content: `Create a clear concise documentation. Follow this instructions and use the example below as foundation for output

    - Return the documentation content as JSON!
    - The data is arranged as: file directory and then file code data. Each file is separated by "###"
    - any where you find the following "should generate * data" it's an instruction to generate 

    The expected JSON will look like:
    {
        "Documentation Title": "should generate a title from data",
        "Brief Introduction": "should generate a introduction from data",
        "Installation and/or Usage": "should add installation and / or uasge from data ",
        "File Structure": [
            {
            "name": "App.js",
            "path": "src/App.js"
            },
            {
            "name": "{file_name.ext}",
            "path": "{path_to_file/file_name.ext}"
            },
            // {more examples}
        ],
        "Core Functions/Methods": [
            {
            "name": "allModels()",
            "description": "This function makes a call to the Sketchfab API to fetch all models.",
            "example": "allModels()\n.then((response) => {\n   console.log(response);\n});\n"
            },
            // {more examples}
        ]
        "Conclusion": "Write a fantastic conclusion..."
    }

    Data:
    ###

    ${text}
`
                },
            ],

        });

        // Extract and return the assistant's reply, which contains the summary.
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error:', error);
        return 'An error occurred during summarization.';
    }

}



const llmPush = async (oldtext, newChanges) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-16k",

            messages: [
                {
                    role: 'system', content: `You are a GitHub code documentation updater. You make sure to do your best to not deviate too far from the original documentation. You alway return a JSON object with the following keys.

    - Table of Contents
    - Documentation Title
    - Brief Introduction
    - Installation and/or Usage
    - File Structure
    - Core Functions/Methods

`
                },

                {
                    role: 'user', content: `Update the documentation with the part labelled "new changes". Use the part labelled "old JSON" below as foundation for output

    ###
    "new changes":

    ${newChanges}

    ###
    "old JSON":

    ${oldtext}
`
                },
            ],

        });

        // Extract and return the assistant's reply, which contains the summary.
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error:', error);
        return 'An error occurred during summarization.';
    }

}


const llmPush2 = async (oldtext, newChanges) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-16k",

            messages: [
                {
                    role: 'system', content: `You are a GitHub code documentation expert generator. Follow this format and return the html of each of this one JSON object

    - Table of Contents
    - Documentation Title
    - Brief Introduction
    - Installation and/or Usage
    - File Structure
    - Core Functions/Methods

`
                },

                {
                    role: 'user', content: `Update the documentation with these indicated (changes). Follow these instructions and use the example below as foundation for output

    - Return the documentation content as JSON!
    - use the changes to update the documentation. The changes include "removed change" and "added change" each as a file path and the changed data. 

    - any where you find the following "should update * ...", only update it if necessary

    The expected JSON will look like:
    {
        "Documentation Title": "should update a title from data",
        "Brief Introduction": "should update a introduction from data",
        "Installation and/or Usage": "should update installation and / or uasge from data ",
        "File Structure": [
            {
            "name": "App.js",
            "path": "src/App.js"
            },
            {
            "name": "{file_name.ext}",
            "path": "{path_to_file/file_name.ext}"
            },
            // {more examples}
        ],
        "Core Functions/Methods": [
            {
            "name": "allModels()",
            "description": "This function makes a call to the Sketchfab API to fetch all models.",
            "example": "allModels()\n.then((response) => {\n   console.log(response);\n});\n"
            },
            // {more examples}
        ]
        "Conclusion": "should update a fantastic conclusion..."
    }


    ###
    changes:

    ${newChanges}

    ###
    data:

    ${oldtext}
`
                },
            ],

        });

        // Extract and return the assistant's reply, which contains the summary.
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error:', error);
        return 'An error occurred during summarization.';
    }

}

function countTokens(text) {
    const regex = /\S+/g;
    const matches = text.match(regex);
    return ~~(matches.length * 1.33); // return int
}

module.exports = { llm2048, llmPush, countTokens };
