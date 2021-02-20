// node dependencies
var fs = require('fs');


let localizationTable = {};
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
async function initializeLocalizationTable(directory, removeExisting = false) {
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
            await fs.readFile(completeFilepath, 'utf8', (error, data) => {

                if (error) {
                    console.log(`error opening file ${completeFilepath}`);
                    console.log(`${error}`);
                    return;
                }
                // console.log('file opened successfully.');

                // If we are updating varaibles after a file has been changed
                if (removeExisting) {
                    // Remove each entry in localizationTable from this file
                    Object.keys(localizationTable).forEach(key  => {
                        localizationTable[key] = localizationTable[key].filter(entry => {
                            return entry.path != fileOrDirectory;
                        })
                    })
                }

                // Cycle through each line of the file
                data.split("\n").forEach(line => {
                    const lineHasVariable = line.split('=').length == 2;
                    const isNotAComment = line.slice(0, 1) != ';';
                    if (lineHasVariable && isNotAComment){
                        // Add the variable to localizationTable

                        // The localization variable key value, e.g. AXS_PAY
                        const localizationKey = line.split('=')[0].trim();

                        // @TODO get rid of this annoying warning suppression
                        // @ts-ignore
                        // The value of the localization variable with the given key, e.g. "Pay"
                        const value = line.split('=')[1].replaceAll('"', '').trim();
                        
                        if (!localizationTable[value]) {
                            localizationTable[value] = [];
                        }
                        const localizationData = {
                            key: localizationKey,
                            path: completeFilepath
                        }
                        
                        localizationTable[value].push(localizationData);
                    }
                })
            });

            // @TODO Put a watch on the file so the localizationTable
            // is updated if a variable is added or removed
            // fs.watch(fileOrDirectory, (event, filename) => {
            //     if (filename) {
            //         console.log(`${filename} file changed, updating localizationTable`);
            //         initializeLocalizationTable(directory, true);
            //     }
            // });
            
            return;
        } else if (filepathArray.length == 1) {
            // Recurse into directory
            return await initializeLocalizationTable(completeFilepath + '/', false);
        }
    });
}

function createLocalizationVariable(key, value, filepath) {
    // Write a new localization variable to the file at filepath
    fs.readFile(filepath, 'utf8', function(err, data) {
        if (err) {
            throw err;
        }
        console.log('file opened');
        console.log(data);
    });
    return false;
}

module.exports = {
    localizationTable,
    initializeLocalizationTable,
    createLocalizationVariable
}
