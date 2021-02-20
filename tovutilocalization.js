// node dependencies
var fs = require('fs');

/**
 * Traverses the given directory and looking for .ini files.
 * If an .ini file is found, it is opened and the localization variables inside
 * are loaded into the localizationTable
 * 
 * So if there is a variable:
 * AXS_PAY = "Pay"
 * 
 * defined in the file:
 * /languages/en-GB/en-GB.overrides.ini
 * 
 * it will be added to the localizationTable under the 'Pay' key
 * localizationTable["Pay"].push({ key: "AXS_PAY", path: "/languages/en-GB/en-GB.overrides.ini"})
 * 
 * 
 * @param {string} directory the directory to traverse
 * 
 * @returns {object} table
 */
function initializeLocalizationTable(directory, removeExisting = false, table) {
    console.log('starting traversal from directory : ' + directory);
    if (!fs.existsSync(directory)) {
        console.log("file not found, exiting: " + directory);
        return;
    }

    var filepathArray = directory.split('.');
    var fileExtension = filepathArray[filepathArray.length - 1];

    var folderList = fileExtension == 'ini' ? [ directory ] : fs.readdirSync(directory);
    console.log('folderList:');
    console.log(folderList);
    folderList.forEach(fileOrDirectory => {
        // Complete the filepath for the font file
        var completeFilepath = 
            fileOrDirectory == directory 
                ? directory 
                : directory + fileOrDirectory;
        console.log('completeFilepath: ' + completeFilepath);
        console.log(fs.lstatSync(completeFilepath).isFile());
        // console.log(fileOrDirectory.split('.')[1]);
        var filepathArray = fileOrDirectory.split('.');
        var fileExtension = filepathArray[filepathArray.length - 1];
        // console.log(filepathArray);
        console.log(fileExtension);
        if (
            // It's a file
            fs.lstatSync(completeFilepath).isFile()
            // and it has a file extension
            // and its file extention is woff
            && fileExtension == 'ini'
        ) {

            if (removeExisting) {
                // remove each entry in the table taken from 
                // this file
                Object.keys(table).forEach(key  => {
                    table[key] = table[key].filter(entry => {
                        return entry.path != fileOrDirectory;
                    })
                })
            }

            // Open the file 
            fs.readFile(completeFilepath, 'utf8', (err, data) => {
                if (err) {
                    console.log(`error opening file ${completeFilepath}`);
                    console.log(`${err}`);
                    return;
                }
                
                console.log('file opened successfully');
                // console.log(data.split("\n"));
                data.split("\n").forEach(variable => {
                    // console.log('variable: ' + variable);
                    if (variable.split('=').length == 2 && variable.slice(0, 1) != ';' ){
                        const key = variable.split('=')[0].trim();
                        // @ts-ignore
                        const value = variable.split('=')[1].replaceAll('"', '').trim();
                        const path = completeFilepath;
                        
                        if (!table[value]) {
                            table[value] = [];
                        }
                        table[value].push({key, path});
                    }
                })
            });

            // console.log('returning...');
            // console.log(table);
            return table;

            // Put a watch on the file so that the localizationTable
            // so localizationTable is updated if a new variable is added
            // fs.watch(fileOrDirectory, (event, filename) => {
            //     if (filename) {
            //         console.log(`${CONSOLE_PREFIX}: ${filename} file changed, updating localizationTable`);
            //         initializeLocalizationTable(fileOrDirectory, true, table);
            //     }
            // });
            
        } else if (filepathArray.length == 1) {
            // potentialFontFile isn't a file, its a directory
            // recurse into that directory
            let subTable = initializeLocalizationTable(completeFilepath + '/', false, table);
            let combineObjects = (object1, object2) => {
                if (!object2) {
                    return object1;
                }
                Object.keys(object2).forEach(key => {
                    if (!object1[key]) {
                        object1[key] = [];
                    }
                    object1[key].push(object2[key]);
                });
                return object1;
            }
            console.log('combining stuff and returning');
            console.log(combineObjects(table, subTable));
            return combineObjects(table, subTable);
        }
    });
}

function createLocalizationVariable(key, value, filepath) {
    // write a new localization variable to the file at filepath
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
    initializeLocalizationTable,
    createLocalizationVariable
}
