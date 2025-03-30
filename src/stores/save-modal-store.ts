import localForage from 'localforage';
import LZString from 'lz-string';
import { action, makeObservable, observable } from 'mobx';
import { MAX_STRATEGIES } from '@/constants/bot-contents';
import { button_status } from '@/constants/button-status';
import {
    getSavedWorkspaces,
    observer as globalObserver,
    save,
    save_types,
    saveWorkspaceToRecent,
} from '@/external/bot-skeleton';
import { localize } from '@deriv-com/translations';
import { TStrategy } from 'Types';
import RootStore from './root-store';
import { XmlHelper } from '@/XmlHelper';

type IOnConfirmProps = {
    is_local: boolean;
    save_as_collection: boolean;
    bot_name: string;
};

interface ISaveModalStore {
    is_save_modal_open: boolean;
    button_status: { [key: string]: string } | number;
    bot_name: { [key: string]: string } | string;
    toggleSaveModal: () => void;
    validateBotName: (values: string) => { [key: string]: string };
    onConfirmSave: ({ is_local, save_as_collection, bot_name }: IOnConfirmProps) => void;
    updateBotName: (bot_name: string) => void;
    setButtonStatus: (status: { [key: string]: string } | string | number) => void;
}

const Blockly = window.Blockly;

export default class SaveModalStore implements ISaveModalStore {
    root_store: RootStore;

    constructor(root_store: RootStore) {
        makeObservable(this, {
            is_save_modal_open: observable,
            button_status: observable,
            bot_name: observable,
            toggleSaveModal: action.bound,
            validateBotName: action.bound,
            onConfirmSave: action.bound,
            updateBotName: action.bound,
            onDriveConnect: action.bound,
            setButtonStatus: action.bound,
        });

        this.root_store = root_store;
    }
    is_save_modal_open = false;
    button_status = button_status.NORMAL;
    bot_name = '';

    toggleSaveModal = (): void => {
        if (!this.is_save_modal_open) {
            this.setButtonStatus(button_status.NORMAL);
        }

        this.is_save_modal_open = !this.is_save_modal_open;
    };

    validateBotName = (values: string): { [key: string]: string } => {
        const errors = {};

        if (values.bot_name.trim() === '') {
            errors.bot_name = localize('Strategy name cannot be empty');
        }

        return errors;
    };

    addStrategyToWorkspace = async (
        workspace_id: string,
        is_local: boolean,
        save_as_collection: boolean,
        bot_name: string,
        xml: string
    ) => {
        try {
            const workspace = await getSavedWorkspaces();
            const current_workspace_index = workspace.findIndex((strategy: TStrategy) => strategy.id === workspace_id);
            const {
                load_modal: { getSaveType },
            } = this.root_store;
            const local_type = is_local ? save_types.LOCAL : save_types.GOOGLE_DRIVE;
            const save_collection = save_as_collection ? save_types.UNSAVED : local_type;
            const type = save_collection;

            const save_type = getSaveType(type)?.toLowerCase();

            const workspace_structure = {
                id: workspace_id,
                xml: window.Blockly.Xml.domToText(xml),
                name: bot_name,
                timestamp: Date.now(),
                save_type,
            };

            if (current_workspace_index >= 0) {
                const current_workspace = workspace_structure;
                workspace[current_workspace_index] = current_workspace;
            } else {
                workspace.push(workspace_structure);
            }

            workspace
                .sort((a: TStrategy, b: TStrategy) => {
                    return new Date(a.timestamp) - new Date(b.timestamp);
                })
                .reverse();

            if (workspace.length > MAX_STRATEGIES) {
                workspace.pop();
            }
            const { load_modal } = this.root_store;
            const { setRecentStrategies } = load_modal;
            localForage.setItem('saved_workspaces', LZString.compress(JSON.stringify(workspace)));
            const updated_strategies = await getSavedWorkspaces();
            setRecentStrategies(updated_strategies);
            const {
                dashboard: { setStrategySaveType },
            } = this.root_store;
            setStrategySaveType(save_type);
        } catch (error) {
            globalObserver.emit('Error', error);
        }
    };

    onConfirmSave = async ({ is_local, save_as_collection, bot_name }: IOnConfirmProps) => {
        try {
            this.setButtonStatus(button_status.LOADING);
            const workspace = window.Blockly?.derivWorkspace;
            if (!workspace) throw new Error('Workspace not found');

            // Get current workspace XML
            const blocksXml = window.Blockly.Xml.domToPrettyText(
                window.Blockly.Xml.workspaceToDom(workspace)
            );

            // Generate bot file content
            const bfxContent = XmlHelper.generateBotFormat({ 
                bot_name,
                save_as_collection,
                variables: workspace.getAllVariables(),
            }, blocksXml);

            if (is_local) {
                // Save locally
                XmlHelper.downloadBotFile(bfxContent, bot_name);
            } else {
                // Save to Google Drive
                await this.root_store.google_drive.saveFile({
                    name: bot_name,
                    content: bfxContent,
                    mimeType: 'application/x-bfx',
                });
            }

            // Update workspace metadata
            workspace.current_strategy_id = window.Blockly.utils.idGenerator.genUid();
            await saveWorkspaceToRecent(bfxContent, is_local ? save_types.LOCAL : save_types.GOOGLE_DRIVE);
            
            this.setButtonStatus(button_status.SUCCESS);
            setTimeout(() => this.toggleSaveModal(), 500);
        } catch (error) {
            console.error('Error saving bot:', error);
            this.setButtonStatus(button_status.ERROR);
        }
    };

    updateBotName = (bot_name: string): void => {
        this.bot_name = bot_name;
    };

    onDriveConnect = async () => {
        const { google_drive } = this.root_store;

        if (google_drive.is_authorised) {
            google_drive.signOut();
        } else {
            google_drive.signIn();
        }
    };

    setButtonStatus = (status: { [key: string]: string } | string | number) => {
        this.button_status = status;
    };
}
