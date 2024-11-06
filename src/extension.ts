import * as vscode from 'vscode';

let redactedWords: string[] = [];
let redact = false;

redactedWords = vscode.workspace.getConfiguration("redact-code").get<string[]>("redactedWords", []);
console.log(redactedWords)

const decorationType = vscode.window.createTextEditorDecorationType({
	color: 'transparent',  // Makes the original text invisible
	textDecoration: 'none',
	letterSpacing: '-0.5em', // Adjust spacing if needed for clean overlay
});

function updateRedactions(editor: vscode.TextEditor, words: string[]) {
	if (!editor || words.length === 0) return;
	const text = editor.document.getText();
	const decorations: vscode.DecorationOptions[] = [];

	words.forEach(word => {
			let match;
			const regex = new RegExp(`\\b${word}\\b`, 'g');  // Word boundary to avoid partial matches
			while ((match = regex.exec(text)) !== null) {
					const start = editor.document.positionAt(match.index);
					const end = editor.document.positionAt(match.index + word.length);

					decorations.push({
							range: new vscode.Range(start, end),
							hoverMessage: word,
							renderOptions: {
									before: {
											contentText: '█'.repeat(word.length),
											color: 'black',
											fontWeight: 'bold',
											textDecoration: 'none'
									},
									// Hide the actual text by setting it to transparent
									after: {
											color: 'transparent',
											textDecoration: 'none'
									}
							}
					});
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
		redact = word === 'Activate';
	});

	
}

export function deactivate() { }
