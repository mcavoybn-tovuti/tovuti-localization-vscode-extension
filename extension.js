// External Dependencies
const vscode = require('vscode');

// Local Dependencies
const tovutilocalization = require('./tovutilocalization');

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
		await tovutilocalization.initializeLocalizationTable(currentWorkspace + "/administrator/language/", false);
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
	let disposable = vscode.commands.registerCommand('tovutilocalization.findLocalizationVariable', () => {

		// If there is an open editor
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			// Retrieve the currently highlighed text
			let selectionStart = editor.selection.start;
			let selectionEnd = editor.selection.end;
			let highlight = editor.document.getText(new vscode.Range(selectionStart, selectionEnd));
			// console.log('highlighted text: ' + highlight);

			// Index into the hash table based on the value of the localization variable
			let searchResults = tovutilocalization.localizationTable[highlight];
			// console.log('search results: ');
			// console.log(searchResults);
			// @TODO build out a search function that doesn't require an exact match

			if (searchResults.length > 0) {
				// Populate quickpick options (basically a dropdown) of each variable to be replaced
				let quickPickItems = searchResults.map(result => {
					return {
						label: result.key,
						detail: result.path
					};
				});

				const replaceSelectionWithLocalizationCode = item => {
					console.log('optionselected');
					console.log(item);

					// @TODO if selected option is the create new variable
					// option, then we create a new variable here before
					// replacing the text

					vscode.window.activeTextEditor.edit(editBuilder => {
						// @TODO each one of these replaces adds a new change to the clipboard,
						// we should remove that, as a user I only want to do a single undo command
						editBuilder.replace(editor.selection, `AxsLanguage::text("${item.label}", "${highlight}")`);
					});
				};
				vscode.window.showQuickPick(quickPickItems, {
					canPickMany: false,
					ignoreFocusOut: true,
					matchOnDescription: true,
					placeHolder: 'Please select the language variable you want to use',
					onDidSelectItem: replaceSelectionWithLocalizationCode
				});

				
			}
			// @TODO dropdown should also include an option to add a new variable

			// @TODO add php brackets based on context
		};
	});

	context.subscriptions.push(disposable);
}

// This method is called when this extension is deactivated.
// In general, we shouldn't need to use this function.
function deactivate() {
	// Do nothing
}

module.exports = {
	activate,
	deactivate
}
