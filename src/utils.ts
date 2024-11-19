import { workspace } from 'vscode';
import { C, Command, Store } from './constants';

export const getStore = (store: Store) => `${C.AppName}.${store}`;

export const getCommand = (command: Command) => `${C.AppName}.${command}`;

export const getConfig = () => workspace.getConfiguration(C.AppName);

export const getConfigStore = <T>(store: string, defaultValue: T) => getConfig().get<T>(store, defaultValue);
