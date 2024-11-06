import * as vscode from 'vscode';

let redactedWords: string[] = [];

redactedWords = vscode.workspace.getConfiguration("redact-code").get<string[]>("redactedWords", []);

const decorationType = vscode.window.createTextEditorDecorationType({
	color: 'transparent',  // Makes the original text invisible
	textDecoration: 'none',
	letterSpacing: '-1em',
});

function updateRedactions(editor: vscode.TextEditor, words: string[]) {
	console.log('starting redaction');
	const redact = vscode.workspace.getConfiguration("redact-code").get<boolean>("active", false);
	console.log(`is ${redact ? 'on' : 'off'}`);
	if (!editor || words.length === 0) {
		return;
	}
	const text = editor.document.getText();
	const decorations: vscode.DecorationOptions[] = [];

	words.forEach(word => {
		let match;
		const regex = new RegExp(`${word}`, 'g');  // Word boundary to avoid partial matches
		while ((match = regex.exec(text)) !== null) {
			const start = editor.document.positionAt(match.index);
			const end = editor.document.positionAt(match.index + word.length);
			const cursors = editor.selections;
			const isCursorInRange = (cursors: readonly vscode.Selection[], start: vscode.Position, end: vscode.Position) => {
				for (const cursor of cursors) {
					if (cursor.active.isAfter(start) && cursor.active.isBefore(end)) {
						return true;
					}
				}
				return false;
			};
			const inRange = isCursorInRange(cursors, start, end);
			if (inRange || !redact) {
				continue;
			}

			let currentPos = start;
			while (currentPos.isBefore(end) && end.isAfter(start)) {

				let next;
				// Check if we're at the end of the line
				if (currentPos.character < editor.document.lineAt(currentPos.line).range.end.character) {
					// If not at the end of the line, move one character forward
					next = currentPos.translate(0, 1);
				} else {
					// If at the end of the line, move to the start of the next line
					next = new vscode.Position(currentPos.line + 1, 0);
				}
				const range = new vscode.Range(currentPos, next);
				decorations.push({
					range,
					renderOptions: {
						after: {
							contentText: '*',
							color: 'inherit',
							textDecoration: 'underline',
						},
					},
				});
				currentPos = next;
			}

			// decorations.push({
			// 	range: new vscode.Range(start, end),
			// 	hoverMessage: word,
			// 	renderOptions: {
			// 		after: {
			// 			contentText: '*'.repeat(word.length),
			// 			color: 'inherit',
			// 			textDecoration: 'none',
			// 		},
			// 		// Hide the actual text by setting it to transparent
			// 		// after: {
			// 		// 	color: 'transparent',
			// 		// 	textDecoration: 'none'
			// 		// }
			// 	}
			// });
		}
	});

	editor.setDecorations(decorationType, decorations);
}

export function activate(context: vscode.ExtensionContext) {

	const editor = vscode.window.activeTextEditor;
	if (editor) {
		console.log("Text document changed");
		updateRedactions(editor, redactedWords);
	}


	vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			console.log("Active editor changed");
			updateRedactions(editor, redactedWords);
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		const editor = vscode.window.activeTextEditor;
		if (editor && event.document === editor.document) {
			console.log("Text document changed");
			updateRedactions(editor, redactedWords);
		}
	}, null, context.subscriptions);

	vscode.window.onDidChangeTextEditorSelection(event => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			updateRedactions(editor, redactedWords);
		}
	});

	vscode.languages.registerHoverProvider('*', {
		provideHover(document, position) {
			const word = document.getText(document.getWordRangeAtPosition(position));
			if (redactedWords.includes(word)) {
				return new vscode.Hover(`**${word}**`);
			}
			return undefined;
		}
	});

	vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration("redact-code.redactedWords")) {
			redactedWords = vscode.workspace.getConfiguration("redact-code").get<string[]>("redactedWords", []);
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				updateRedactions(editor, redactedWords);
			}
		}
	});

	vscode.commands.registerCommand('redact-code.addRedactedWord', async () => {
		const word = await vscode.window.showInputBox({ prompt: 'Enter a word to redact' });
		if (word) {
			const config = vscode.workspace.getConfiguration('redact-code');
			const words = config.get<string[]>('redactedWords') || [];
			words.push(word);
			await config.update('redactedWords', words, vscode.ConfigurationTarget.Global);
		}
	});
	vscode.commands.registerCommand('redact-code.activate', async () => {
		const word = await vscode.window.showQuickPick(['Activate', 'Reveal']);
		const isActive = word === 'Activate';
		vscode.workspace.getConfiguration("redact-code").update("active", isActive, vscode.ConfigurationTarget.Global)
			.then(() => {
				vscode.window.showInformationMessage('Configuration updated successfully!');
				const editor = vscode.window.activeTextEditor;
				if (editor) {
					updateRedactions(editor, redactedWords);
				}
			}, (error) => {
				vscode.window.showErrorMessage('Error updating configuration: ' + error);
			});
	});


}

export function deactivate() { }
