import { workspace, ExtensionContext, window, languages, Hover, commands, ConfigurationTarget } from 'vscode';
import { updateRedactions } from './redacting';
import { getCommand, getConfig, getConfigStore, getStore } from './utils';
import { availableChars, C } from './constants';


export const activate = (context: ExtensionContext) => {
	updateRedactions();

	window.onDidChangeActiveTextEditor(updateRedactions, null, context.subscriptions);

	window.onDidChangeTextEditorSelection(updateRedactions);

	languages.registerHoverProvider('*', {
		provideHover: (document, position) => {
			const word = document.getText(document.getWordRangeAtPosition(position));
			const redactedWords = getConfigStore<string[]>(C.wordConfig, []);
			if (redactedWords.includes(word)) {
				return new Hover(`**${word}**`);
			}
			return null;
		},
	});

	workspace.onDidChangeConfiguration(event => {
		const configChanged = [
			getStore(C.wordConfig),
			getStore(C.activeConfig),
			getStore(C.charConfig),
		].map(c => event.affectsConfiguration(c))
			.some(Boolean)
		if (configChanged) {
			updateRedactions();
		}
	});

	commands.registerCommand(getCommand(C.addWordCommand), async () => {
		const newWord = await window.showInputBox({ prompt: 'Enter a word to redact' });
		if (!newWord) return;
		const config = getConfig();
		const words = getConfigStore<string[]>(C.wordConfig, []);
		words.push(newWord);
		await config.update(C.wordConfig, words, ConfigurationTarget.Global);
	});

	commands.registerCommand(getCommand(C.activateCommand), async () => {
		const word = await window.showQuickPick(['Activate', 'Reveal']);
		if (!word) return;
		const isActive = word === 'Activate';
		getConfig().update(C.activeConfig, isActive, ConfigurationTarget.Global)
			.then(() => {
				const nowActive = 'Code redacted!';
				const nowInactive = 'Code revealed!';

				window.showInformationMessage(isActive ? nowActive : nowInactive);
			}, (error) => {
				window.showErrorMessage('Error updating configuration: ' + error);
			});
	});

	commands.registerCommand(getCommand(C.charCommand), async () => {
		const choice = await window.showQuickPick(availableChars);
		if (!choice) return;
		getConfig().update(C.charConfig, choice, ConfigurationTarget.Global)
			.then(() => {
				console.log('character set successfully');
			}, (error) => {
				console.log("failure!", error)
			});
	});
}

export const deactivate = () => {
	// empty
};
