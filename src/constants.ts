const commands = {
  activateCommand: 'activate',
  charCommand: 'character',
  addWordCommand: 'addRedactedWord',
} as const;

const stores = {
  activeConfig: 'active',
  charConfig: 'char',
  wordConfig: 'redactedWords',
} as const;

export type Command = typeof commands[keyof typeof commands];
export type Store = typeof stores[keyof typeof stores];

export const availableChars = ['*', '█'];

export const C = {
  AppName: 'redact-code',
  defaultChar: availableChars[0],
  ...stores,
  ...commands,
} as const;
