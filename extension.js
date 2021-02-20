// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const tovutilocalization = require('./tovutilocalization');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed


var localizationTable = {};
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Initialize a hash table of localizaiton varaibles where the key
	// is the value of the localization variable

	//@TODO: add a config option for users to specify a custom search directory
	// const configuredDirectory = vscode.workspace.getConfiguration('tovutilocalization.searchDirectory');
	// console.log(configuredDirectory);
	const currentWorkspace = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.path.slice(1);
	if (currentWorkspace) {
		console.log('workspace found: ' + currentWorkspace);
		 tovutilocalization.initializeLocalizationTable(currentWorkspace + "/language/en-GB/", false, localizationTable)
		 tovutilocalization.initializeLocalizationTable(currentWorkspace + "/administrator/language/", false, localizationTable);
	} else {
		console.log("tovutilocalizaton failed to activate, root folder not found");
		return;
	}
	console.log('localization table initialization successful');


	// The command has been defined in the package.json file
	// Now we provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	// The code placed here will be executed every time the tovutilocalization.findLocalizationVariable command is executed
	let disposable = vscode.commands.registerCommand('tovutilocalization.findLocalizationVariable', () => {

		// If there is an open editor
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			// Retrieve the currently highlighed text
			let cursorPosition = editor.selection.start;
			let wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
			let highlight = editor.document.getText(wordRange);
			vscode.window.showInformationMessage(highlight);

			// Check localizationTable for an existing variable
			let searchResults = tovutilocalization.localizationTable[highlight];
			if (searchResults.length > 0) {
				// create a dropdown selection of each variable to be replaced
				// once the variable is selected, it will replace the current selection
				// with the appropriate code.
				console.log('search results: ');
				console.log(searchResults);
			}
			// dropdown should also include an option to add a new variable at
			// the bottm. @TODO add that here

			// create event binding for user selection. after a user selects a variable
			// they will be asked whether they want the code snippet to be enclosed in
			// <?php ?> brackets or not. We could automate this in the future via static
			// analysis of the current editor and the file extension of the currently
			// opened file.
		};
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
