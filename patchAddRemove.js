// write a function that iterates through an array of objects and returns concatenated string including the filepath


function separateAddedAndRemoved(patch) {
    const lines = patch.split('\n');
    let added = '';
    let removed = '';

    for (const line of lines) {
        if (line.startsWith('+')) {
            added += line.substring(1) + '\n';
        } else if (line.startsWith('-')) {
            removed += line.substring(1) + '\n';
        }
    }

    // return { added, removed };
    return `Added: \n ${added} \n\n Removed: \n ${removed} `;
}

// const patchData = "@@ -1,5 +1,13 @@\n terraform {\r\n-  backend \"remote\" {\r\n+  #backend \"remote\" {\r\n+  #  hostname = \"app.terraform.io\"\r\n+  #  organization = \"ExamPro\"\r\n+\r\n+  #  workspaces {\r\n+  #    name = \"getting-started\"\r\n+  #  }\r\n+  #}\r\n+  cloud {\r\n     hostname = \"app.terraform.io\"\r\n     organization = \"ExamPro\"\r\n \r\n@@ -11,7 +19,7 @@ terraform {\n   required_providers {\r\n     aws = {\r\n       source  = \"hashicorp/aws\"\r\n-      version = \"3.58.0\"\r\n+      version = \"~> 5.0\"\r\n     }\r\n   }\r\n }\r";

// const { added, removed } = separateAddedAndRemoved(patchData);
// console.log('Added Lines:');
// console.log(added);
// console.log('Removed Lines:');
// console.log(removed);

module.exports = { separateAddedAndRemoved };
