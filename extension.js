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

/**
 * This function is called when the extension is activated
 * 
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

	// @TODO: add a config option for users to specify a custom search directory in case they don't want
	// to search the current workspace for the language folders.
	// const configuredDirectory = vscode.workspace.getConfiguration('tovutilocalization.searchDirectory');
	// console.log(configuredDirectory);

	// Initialize localization hash table based on current workspace folder
	const currentWorkspace = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.path.slice(1);
	if (currentWorkspace) {
		// console.log('Workspace found: ' + currentWorkspace);

		// @TODO make this blocking code. These awaits aren't doing the trick yet
		// First call to tovutilocalization.findLocalizationVariable fails every time
		await tovutilocalization.initializeLocalizationTable(currentWorkspace + "/language/en-GB/", false)
        await tovutilocalization.initializeLocalizationTable(currentWorkspace + "/language/overrides/", false)
		await tovutilocalization.initializeLocalizationTable(currentWorkspace + "/administrator/language/en-GB/", false);
        await tovutilocalization.initializeLocalizationTable(currentWorkspace + "/administrator/language/overrides/", false)
	} else {
		console.log("Tovuti Localizaton extension failed to activate, root folder not found");
		return;
	}
	console.log('Localization table initialization successful');
	console.log(tovutilocalization.localizationTable)


	// The command has been defined in the package.json file
	// Now we provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	// The code placed here will be executed every time the tovutilocalization.findLocalizationVariable command is executed
	let disposable = vscode.commands.registerCommand('tovutilocalization.findLocalizationVariable', async () => {

		// If there is an open editor
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			// Retrieve the currently highlighed text
			let selectionStart = editor.selection.start;
			let selectionEnd = editor.selection.end;
			let highlightedText = editor.document.getText(new vscode.Range(selectionStart, selectionEnd));
			console.log('highlighted text: ' + highlightedText);

			// Index into the hash table based on the value of the localization variable
			let searchResults = tovutilocalization.localizationTable[highlightedText] || [];
			console.log('search results: ');
			console.log(searchResults);

            // Populate autocomplete dropdown (vscode quickpick) options
            let quickPickItems = searchResults.map(result => {
                return {
                    label: result.key,
                    detail: result.path
                };
            });
            quickPickItems.push(
                { label: CREATE_NEW_VARIABLE_LABEL, detail: CREATE_NEW_VARIABLE_DETAIL },
            );
            quickPickItems.push(
                { label: ADD_PHP_BRACKETS_LABEL, detail: ADD_PHP_BRACKETS_DETAIL },
            );
            quickPickItems.push(
                { label: TOGGLE_QUOTE_TYPE_LABEL, detail: TOGGLE_QUOTE_TYPE_DETAIL },
            );

            let picker = vscode.window.createQuickPick();
            picker.title = "Tovuti Localization Utility";
            picker.canSelectMany = false;
            picker.ignoreFocusOut = true;
            picker.placeholder = 'Please select a localization variable or action from below';
            picker.matchOnDescription = true;
            picker.items = quickPickItems;

            picker.onDidChangeSelection(async items => {
                // console.log('onDidChangeSelection');
                // console.log(items);

                // There will only ever be one selected item since .canSelectMany = false
                const selectedItem = items[0];
                let selectionReplacementText = "";
                switch (selectedItem.label) {
                    case CREATE_NEW_VARIABLE_LABEL:
                        console.log('create new var selected');
                        // hide the current picker
                        picker.hide();
                        
                        // Show an inputbox for the new variable key
                        const userInput = await vscode.window.showInputBox({
                            placeHolder: 'NEW_LOCALIZATION_VARIABLE',
                            prompt: 'Please enter a key value for the new localization variable',
                            ignoreFocusOut: true,
                            validateInput: 
                            (input) => 
                                input.search(/([^A-Z0-9_])/g) != -1
                                    ? "Only capitalized aphanumeric characters allowed, e.g. MY_LOCALIZATION_VARIABLE"
                                    : null
                            
                        });
                        // console.log('userInput : ' + userInput);
                        // @TODO make this filepath configurable
                        const localizationFilePath = currentWorkspace + "/language/overrides/en-GB.override.ini";
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

// This method is called when this extension is deactivated.
function deactivate() {
	// Do nothing
}

module.exports = {
	activate,
	deactivate
}
