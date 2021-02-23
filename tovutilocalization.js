// node dependencies
var fs = require('fs');


let localizationTable = {
    site: {},
    administrator: {}
};

let localizationTableByVariable = {};
/**
 * 
 * If there is a variable:
 * AXS_PAY = "Pay"
 * 
 * defined in the file:
 * /languages/en-GB/en-GB.overrides.ini
 * 
 * it will be added to the localizationTable under the 'Pay' key
 * localizationTable["Pay"].push({ key: "AXS_PAY", path: "/languages/en-GB/en-GB.overrides.ini"})
 * 
 * This is done by traversing the current workspace directory (or a user specified directory)
 * If an .ini file is found, it is opened and the localization variables inside
 * are loaded into localizationTable.
 * 
 * @param {string} directory the directory to traverse
 * 
 */
function initializeLocalizationTable(directory, removeExisting = false) {
    // console.log('starting traversal from directory : ' + directory);

    if (!fs.existsSync(directory)) {
        console.log("directory not found, exiting: " + directory);
        return;
    }

    var fileExtension = directory.split('.')[directory.split('.').length - 1];

    // This check is for debug purposes. Sometimes it's nice to 
    // reduce the number of localization variables that show up in the debug console
    // and this piece enables us to pass a single file to the first parameter of this function.
    var folderList = 
        fileExtension == 'ini' 
            ? [ directory ] 
            : fs.readdirSync(directory);
    // console.log('folderList:');
    // console.log(folderList);

    let siteOrAdministrator = "site";
    if (directory.search('administrator') != -1) {
        siteOrAdministrator = "administrator";
    }

    folderList.forEach(async fileOrDirectory => {
        // If fileOrDirectory is the same as the directory parameter
        // then we are debugging with a single file, so we don't need
        // to create a new variable to get the complete filepath.
        var completeFilepath = 
            fileOrDirectory == directory 
                ? directory 
                : directory + fileOrDirectory;
        // console.log('completeFilepath: ' + completeFilepath);
        // console.log(fs.lstatSync(completeFilepath).isFile());
        // console.log(fileOrDirectory.split('.')[1]);

        // Get the file extension, we only want to open .ini files
        // and if fileOrDirectory doesn't have an extension, it is a directory.
        var filepathArray = fileOrDirectory.split('.');
        var subsetId = null;
        filepathArray.forEach(fileOrDir => {
            if (fileOrDir.search("com") != -1) {
                subsetId = fileOrDir;
            }
            if (fileOrDir.search("mod") != -1) {
                subsetId = fileOrDir;
            }
        });
        var fileExtension = filepathArray[filepathArray.length - 1];
        const aFileExistsThere = fs.lstatSync(completeFilepath).isFile();
        const itsExtensionIsDotIni = fileExtension == 'ini'
        // console.log('filePathArray:');
        // console.log(filepathArray);
        // console.log('fileExtension:');
        // console.log(fileExtension);
        // console.log('aFileExistsThere: ' + aFileExistsThere);
        // console.log('itsExtensionIsDotIni: ' + itsExtensionIsDotIni);

        
        if (aFileExistsThere && itsExtensionIsDotIni) {

            // Open the file 
            // console.log(`attempting to open file at ${completeFilepath}`);
            let data = fs.readFileSync(completeFilepath, {encoding: 'utf8'});
            if (!data){
                console.log(`error opening file ${completeFilepath}`);
                console.log(`${data}`);
            } else {
                // console.log('file opened successfully.');

                // Cycle through each line of the file
                data.split("\n").forEach(async line => {
                    const lineHasVariable = line.split('=').length == 2;
                    const isNotAComment = line.slice(0, 1) != ';';
                    if (lineHasVariable && isNotAComment){
                        // Add the variable to localizationTable

                        // The localization variable key value, e.g. AXS_PAY
                        const localizationKey = line.split('=')[0].trim();

                        // @TODO get rid of this annoying warning suppression
                        // The value of the localization variable with the given key, e.g. "Pay"
                        const value = line.split('=')[1].replaceAll('"', '').trim();

                        if (!localizationTable[siteOrAdministrator][value]) {
                            localizationTable[siteOrAdministrator][value] = [];
                        }
                        
                        const localizationData = {
                            key: localizationKey,
                            path: completeFilepath,
                            subsetId
                        }
                        
                        localizationTable[siteOrAdministrator][value].push(localizationData);
                        localizationTableByVariable[localizationKey] = value;
                    }
                });
            }

            return;
        } else if (filepathArray.length == 1) {
            // Recurse into directory
            return initializeLocalizationTable(completeFilepath + '/', false);
        }
    });
}

function createLocalizationVariable(key, value, filepath) {
    // Write a new localization variable to the file at filepath
    const newVariableText = `${key.toUpperCase()} = "${value}"\n`;
    let siteOrAdministrator = "site";
    if (filepath.search('administrator') != -1) {
        siteOrAdministrator = "administrator";
    }

    if (!localizationTable[siteOrAdministrator][value]) {
        localizationTable[siteOrAdministrator][value] = [];
    }
    localizationTable[siteOrAdministrator][value].push({
        key,
        path: filepath
    });
    fs.appendFile(filepath, newVariableText, function(err, data) {
        if (err) {
            console.log('error writing to file:' + filepath);
            console.log(err);
        }
    });
}

module.exports = {
    localizationTable,
    localizationTableByVariable,
    initializeLocalizationTable,
    createLocalizationVariable
}
