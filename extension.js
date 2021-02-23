// External Dependencies
const vscode = require('vscode');

// Local Dependencies
const tovutilocalization = require('./tovutilocalization');

const CREATE_NEW_VARIABLE_LABEL = "Create New";
const CREATE_NEW_VARIABLE_DETAIL = "Write a new localization variable with the value of the selected text";

const ADD_PHP_BRACKETS_LABEL = "Add PHP Brackets";
const ADD_PHP_BRACKETS_DETAIL = "Adds <?php ?> around the currently selected text";

const TOGGLE_QUOTE_TYPE_LABEL = "Toggle Quote Type";
const TOGGLE_QUOTE_TYPE_DETAIL = "Swaps double quotes for single quotes (and vice versa). If more than one type of quotes are found, convert single to double.";

const REPLACE_JTEXT_LABEL = "Replace JText";
const REPLACE_JTEXT_DETAIL = "Converts a JText to AxsLanguage::text";

const REMOVE_SURROUNDING_QUOTATIONS_LABEL = "Surrounding quotations remove";
const REMOVE_SURROUNDING_QUOTATIONS_DETAIL = "Removes single or double quotations around the current selection, if they exist"

const currentWorkspace = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.path.slice(1);

/**
 * This function is called when the extension is activated
 * 
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Initialize localization hash table based on current workspace folder
    initializeLocalizationTable();

	// The command has been defined in the package.json file
	// Now we provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	// The code placed here will be executed every time the tovutilocalization.findLocalizationVariable command is executed
	let disposable = vscode.commands.registerCommand('tovutilocalization.findLocalizationVariable', async () => {
        
		// If there is an open editor
		let editor = vscode.window.activeTextEditor;
		if (editor) {

			// Get the currently highlighed text			
            const highlightedText = getHighlightedText(editor);
			console.log('highlighted text: ' + highlightedText);

			// Check for the string 'administrator' in the filepath of the active file in the editor
            let openedFile = editor.document.uri;
            let isAdminSection = openedFile.path.search('administrator') != -1;

            // Check for any directories in the filepath with a com_ or mod_ prefix
            let subsetId = null;
            let filepathArr = openedFile.path.split("/");
            for (let i = 0; i < filepathArr.length; i++) {
                let fileOrDir = filepathArr[i];
                if (fileOrDir.search("com_") != -1) {
                    subsetId = fileOrDir;
                    i = filepathArr.length;
                }
                if (fileOrDir.search("mod_") != -1) {
                    subsetId = fileOrDir;
                    i = filepathArr.length;
                }
            }

            // Search for the localization variable
			let searchResults = tovutilocalization.localizationTable[isAdminSection ? 'administrator' : 'site'][highlightedText] || [];
            // If we are in a module or component, filter out any variables not in the subset
            searchResults = searchResults.filter(result => {
                return result.subsetId == null || result.subsetId == subsetId
            });
			// console.log('search results: ');
			// console.log(searchResults);

            // Populate autocomplete dropdown (vscode quickpick) options
            let quickPickItems = searchResults.map(result => {
                return {
                    label: result.key,
                    detail: result.path
                };
            })
            quickPickItems.push(
                { label: CREATE_NEW_VARIABLE_LABEL, detail: CREATE_NEW_VARIABLE_DETAIL },
            );
            quickPickItems.push(
                { label: ADD_PHP_BRACKETS_LABEL, detail: ADD_PHP_BRACKETS_DETAIL },
            );
            quickPickItems.push(
                { label: TOGGLE_QUOTE_TYPE_LABEL, detail: TOGGLE_QUOTE_TYPE_DETAIL },
            );
            quickPickItems.push(
                { label: REPLACE_JTEXT_LABEL, detail: REPLACE_JTEXT_DETAIL },
            );
            quickPickItems.push(
                { label: REMOVE_SURROUNDING_QUOTATIONS_LABEL, detail: REMOVE_SURROUNDING_QUOTATIONS_DETAIL },
            );

            let picker = vscode.window.createQuickPick();
            picker.title = "Tovuti Localization Utility";
            picker.canSelectMany = false;
            picker.ignoreFocusOut = true;
            picker.placeholder = 'Please select a localization variable or action from below';
            picker.matchOnDescription = true;
            picker.items = quickPickItems;

            picker.onDidChangeSelection(async items => {
                // There will only ever be one selected item since .canSelectMany = false
                const selectedItem = items[0];
                console.log(selectedItem);
                let selectionReplacementText = "";
                switch (selectedItem.label) {
                    case CREATE_NEW_VARIABLE_LABEL:
                        // hide the current picker
                        picker.hide();
                        
                        // Show an inputbox for the new variable key
                        const userInput = await vscode.window.showInputBox({
                            placeHolder: 'NEW_LOCALIZATION_VARIABLE',
                            prompt: 'Please enter a key value for the new localization variable',
                            ignoreFocusOut: true,
                            validateInput: (input) => {
                                return input.search(/([^A-Z0-9_])/g) != -1
                                    ? "Only capitalized aphanumeric characters allowed, e.g. MY_LOCALIZATION_VARIABLE"
                                    : null;
                            }
                        });

                        // @TODO make this filepath configurable
                        const localizationFilePath = 
                            currentWorkspace + (isAdminSection ? "/administrator" : "")
                            + "/language/overrides/en-GB.override.ini";
                        tovutilocalization.createLocalizationVariable(userInput, highlightedText, localizationFilePath);
                    return;
                    case ADD_PHP_BRACKETS_LABEL:
                        // console.log('add php brackets label selected');
                        selectionReplacementText = `<?php echo ${highlightedText} ?>`;
                    break;
                    case TOGGLE_QUOTE_TYPE_LABEL:
                        // console.log('toggle quote type label ');
                        const hasDoubleQuote = highlightedText.indexOf(`"`) != -1;
                        const hasSingleQuote = highlightedText.indexOf(`'`) != -1;
                        if (hasDoubleQuote && hasSingleQuote) {
                            selectionReplacementText = highlightedText.replaceAll(`'`, `"`);
                        } else if (hasDoubleQuote && !hasSingleQuote) {
                            selectionReplacementText = highlightedText.replaceAll(`"`, `'`);
                        } else if (!hasDoubleQuote && hasSingleQuote){
                            selectionReplacementText = highlightedText.replaceAll(`'`, `"`);
                        }
                    break;
                    case REPLACE_JTEXT_LABEL:
                        let variable = highlightedText.split(`"`)[1];
                        if (!variable) {
                            variable = highlightedText.split(`'`)[1];
                        }
                        let value = tovutilocalization.localizationTableByVariable[isAdminSection ? "administrator" : "site"][variable];
                        selectionReplacementText = `AxsLanguage::text("${variable}", "${value}")`;
                    break;
                    case REMOVE_SURROUNDING_QUOTATIONS_LABEL:
                        let start = editor.selection.start.translate(0, -1);
                        let end = editor.selection.end.translate(0, 1);
                        let text = editor.document.getText(new vscode.Range(start, end));
                        if (text.slice(0, 1) == `"` || text.slice(0, 1) == `'`) {
                            text = text.slice(1);
                        }
                        if (text.slice(text.length-1, text.length) == `"` || text.slice(text.length-1, text.length) == `'`) {
                            text = text.slice(0, text.length-1);
                        }
                        let newSelection = new vscode.Selection(start, end);
                        vscode.window.activeTextEditor.edit(editBuilder => {
                            editBuilder.replace(newSelection, text);
                        });
                        picker.hide();
                    return;
                    default:
                        // Selected item is a localization variable
                        selectionReplacementText = `AxsLanguage::text("${selectedItem.label}", "${highlightedText}")`;
                }
                
                // Replace the text
                vscode.window.activeTextEditor.edit(editBuilder => {
                    editBuilder.replace(editor.selection, selectionReplacementText);
                });

                picker.hide();
            }),
            picker.show();
		};
	});

	context.subscriptions.push(disposable);
}

async function initializeLocalizationTable() {
    if (currentWorkspace) {
		tovutilocalization.initializeLocalizationTable(currentWorkspace + "/language/en-GB/", false)
        tovutilocalization.initializeLocalizationTable(currentWorkspace + "/language/overrides/en-GB.override.ini", false)
		tovutilocalization.initializeLocalizationTable(currentWorkspace + "/administrator/language/en-GB/", false);
        tovutilocalization.initializeLocalizationTable(currentWorkspace + "/administrator/language/overrides/en-GB.override.ini", false)
	} else {
		console.log("Tovuti Localizaton extension failed to activate, open workspace folder not found");
		return;
	}
	console.log('Localization table initialization successful');
	console.log(tovutilocalization.localizationTable)
    return;
}

/**
 * 
 * @param {vscode.TextEditor} editor 
 */
function getHighlightedText(editor) {
    let selectionStart = editor.selection.start;
    let selectionEnd = editor.selection.end;
    let highlightedText = editor.document.getText(new vscode.Range(selectionStart, selectionEnd));
    return highlightedText;
}

// This method is called when this extension is deactivated.
function deactivate() {
	// Do nothing
}

module.exports = {
	activate,
	deactivate
}
