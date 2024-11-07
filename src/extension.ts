import * as vscode from 'vscode';

let redactedWords: string[] = [];

redactedWords = vscode.workspace.getConfiguration("redact-code").get<string[]>("redactedWords", []);

const decorationType = vscode.window.createTextEditorDecorationType({
	color: 'transparent',  // Makes the original text invisible
	textDecoration: 'none',
	letterSpacing: '-1em',
});

const isCursorInRange = (cursors: readonly vscode.Selection[], start: vscode.Position, end: vscode.Position) => {
	for (const cursor of cursors) {
		if (cursor.active.isAfter(start) && cursor.active.isBefore(end)) {
			return true;
		}
	}
	return false;
};

function updateRedactions(editor: vscode.TextEditor, words: string[]) {
	const redact = vscode.workspace.getConfiguration("redact-code").get<boolean>("active", false);
	const character = vscode.workspace.getConfiguration("redact-code").get<string>("char", "*");
	console.log('character', character)
	if (!editor || words.length === 0) {
		return;
	}
	const text = editor.document.getText();
	const decorations: vscode.DecorationOptions[] = [];

	words.forEach(word => {
		let match;
		const regex = new RegExp(`${word}`, 'g');
		while ((match = regex.exec(text)) !== null) {
			const start = editor.document.positionAt(match.index);
			const end = editor.document.positionAt(match.index + word.length);
			const cursors = editor.selections;

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
							contentText: character,
							color: 'inherit',
							textDecoration: 'underline',
						},
					},
				});
				currentPos = next;
			}
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
		if (event.affectsConfiguration("redact-code.redactedWords") ||
			event.affectsConfiguration("redact-code.active") ||
			event.affectsConfiguration("redact-code.character")
		) {
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
				const nowActive = "Code redacted!";
				const nowInactive = "Code revealed!";
				vscode.window.showInformationMessage(isActive ? nowActive : nowInactive);
			}, (error) => {
				vscode.window.showErrorMessage('Error updating configuration: ' + error);
			});
	});

	vscode.commands.registerCommand("redact-code.character", async () => {
		const choice = await vscode.window.showQuickPick(['*', '█']);
		console.log(choice)
		if (!choice) return;
		console.log('setting....');
		vscode.workspace.getConfiguration("redact-code").update("char", choice, vscode.ConfigurationTarget.Global)
		.then(() => {
			console.log('character set successfully');
		}, (error) => {
			console.log("failure!", error)
		});
	});

}

export function deactivate() { }
