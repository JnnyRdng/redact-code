import { DecorationOptions, Position, Range, Selection, window, } from "vscode";
import { C } from "./constants";
import { getConfigStore } from "./utils";


const decorationType = window.createTextEditorDecorationType({
  color: 'transparent',
  textDecoration: 'none',
  letterSpacing: '-1em',
});

export const updateRedactions = () => {

  const editor = window.activeTextEditor;
  const words = getConfigStore<string[]>(C.wordConfig, []);
  const isActive = getConfigStore<boolean>(C.activeConfig, false);
  const character = getConfigStore<string>(C.charConfig, C.defaultChar);

  if (!editor || words.length === 0) {
    return;
  }

  const text = editor.document.getText();
  const decorations: DecorationOptions[] = [];

  words.forEach(word => {
    let match;
    const regex = new RegExp(`${word}`, 'g');
    while ((match = regex.exec(text)) !== null) {
      const start = editor.document.positionAt(match.index);
      const end = editor.document.positionAt(match.index + match.length);
      const cursors = editor.selections;

      const inRange = isCursorInRange(cursors, start, end);
      if (!inRange || !isActive) {
        continue;
      }

      let currentPos = start;
      while (currentPos.isBefore(end) && end.isAfter(start)) {
        let next: Position;
        if (currentPos.character < editor.document.lineAt(currentPos.line).range.end.character) {
          next = currentPos.translate(0, 1);
        } else {
          next = new Position(currentPos.line + 1, 0);
        }
        const range = new Range(currentPos, next);
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

const isCursorInRange = (cursors: readonly Selection[], start: Position, end: Position) => {
  for (const cursor of cursors) {
    if (cursor.active.isAfter(start) &&
      cursor.active.isBefore(end)) {
      return true;
    }
  }
  return false;
}
