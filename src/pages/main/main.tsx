import React, { lazy, Suspense, useEffect, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useLocation, useNavigate } from 'react-router-dom';
import ChunkLoader from '@/components/loader/chunk-loader';
import DesktopWrapper from '@/components/shared_ui/desktop-wrapper';
import Dialog from '@/components/shared_ui/dialog';
import MobileWrapper from '@/components/shared_ui/mobile-wrapper';
import Tabs from '@/components/shared_ui/tabs/tabs';
import TradingViewModal from '@/components/trading-view-chart/trading-view-modal';
import { DBOT_TABS, TAB_IDS } from '@/constants/bot-contents';
import { api_base, updateWorkspaceName } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { isDbotRTL } from '@/external/bot-skeleton/utils/workspace';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import {
    LabelPairedChartLineCaptionRegularIcon,
    LabelPairedObjectsColumnCaptionRegularIcon,
    LabelPairedPuzzlePieceTwoCaptionBoldIcon,
} from '@deriv/quill-icons/LabelPaired';
import { LegacyGuide1pxIcon } from '@deriv/quill-icons/Legacy';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import RunPanel from '../../components/run-panel';
import ChartModal from '../chart/chart-modal';
import Dashboard from '../dashboard';
import RunStrategy from '../dashboard/run-strategy';

const Chart = lazy(() => import('../chart'));
const Tutorial = lazy(() => import('../tutorials'));

const AppWrapper = observer(() => {
    const { connectionStatus } = useApiBase();
    const { dashboard, load_modal, run_panel, quick_strategy, summary_card } = useStore();
    const {
        active_tab,
        is_chart_modal_visible,
        is_trading_view_modal_visible,
        setActiveTab,
    } = dashboard;
    const { onEntered } = load_modal;
    const { is_dialog_open, dialog_options, onCancelButtonClick, onCloseDialog, onOkButtonClick, stopBot } = run_panel;
    const { cancel_button_text, ok_button_text, title, message } = dialog_options as { [key: string]: string };
    const { clear } = summary_card;
    const { DASHBOARD, BOT_BUILDER } = DBOT_TABS;
    const { isDesktop } = useDevice();
    const location = useLocation();
    const navigate = useNavigate();

    const [bots, setBots] = useState([]);

    useEffect(() => {
        if (connectionStatus !== CONNECTION_STATUS.OPENED) {
            const is_bot_running = document.getElementById('db-animation__stop-button') !== null;
            if (is_bot_running) {
                clear();
                stopBot();
                api_base.setIsRunning(false);
            }
        }
    }, [clear, connectionStatus, stopBot]);

    useEffect(() => {
        // Fetch the XML files and parse them
        const fetchBots = async () => {
            const botFiles = [
                'test1.xml',
                'test2.xml',
                // Add more paths to your XML files
            ];
            const botPromises = botFiles.map(async (file) => {
                try {
                    const response = await fetch(file);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${file}: ${response.statusText}`);
                    }
                    const text = await response.text();
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(text, 'application/xml');
                    return {
                        title: file.split('/').pop(), // Use the file name as the title
                        image: xml.getElementsByTagName('image')[0]?.textContent || 'default_image_path',
                        filePath: file,
                    };
                } catch (error) {
                    console.error(error);
                    return null;
                }
            });
            const bots = (await Promise.all(botPromises)).filter(Boolean);
            setBots(bots);
        };

        fetchBots();
    }, []);

    const runBot = (xmlContent: string) => {
        // Implement the logic to run the bot with the provided XML content
        console.log('Running bot with content:', xmlContent);
    };

    const handleTabChange = React.useCallback(
        (tab_index: number) => {
            setActiveTab(tab_index);
        },
        [setActiveTab]
    );

    const handleBotClick = async (filePath: string) => {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
            }
            const text = await response.text();
            // Run the bot with the XML content
            runBot(text);
            // Load the strategy into the bot builder
            setActiveTab(TAB_IDS.BOT_BUILDER);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <React.Fragment>
            <div className='main'>
                <div className='main__container'>
                    <Tabs active_index={active_tab} className='main__tabs' onTabItemChange={onEntered} onTabItemClick={handleTabChange} top>
                        <div label={<><LabelPairedObjectsColumnCaptionRegularIcon height='24px' width='24px' /><Localize i18n_default_text='Dashboard' /></>} id='id-dbot-dashboard'>
                            <Dashboard handleTabChange={handleTabChange} />
                        </div>
                        <div label={<><LabelPairedPuzzlePieceTwoCaptionBoldIcon height='24px' width='24px' /><Localize i18n_default_text='Bot Builder' /></>} id='id-bot-builder' />
                        <div label={<><LabelPairedChartLineCaptionRegularIcon height='24px' width='24px' /><Localize i18n_default_text='Charts' /></>} id='id-charts'>
                            <Suspense fallback={<ChunkLoader message={localize('Please wait, loading chart...')} />}>
                                <Chart show_digits_stats={false} />
                            </Suspense>
                        </div>
                        <div label={<><LegacyGuide1pxIcon height='16px' width='16px' /><Localize i18n_default_text='Tutorials' /></>} id='id-tutorials'>
                            <Suspense fallback={<ChunkLoader message={localize('Please wait, loading tutorials...')} />}>
                                <Tutorial handleTabChange={handleTabChange} />
                            </Suspense>
                        </div>
                        <div label={<><LabelPairedChartLineCaptionRegularIcon height='24px' width='24px' /><Localize i18n_default_text='Analysis Tool' /></>} id='id-analysis-tool'>
                            <iframe src='https://binaryfx.site/api_binaryfx' width='100%' height='500px' frameBorder='0'></iframe>
                        </div>
                        <div label={<><LabelPairedChartLineCaptionRegularIcon height='24px' width='24px' /><Localize i18n_default_text='Signals' /></>} id='id-signals'>
                            <iframe src='signals' width='100%' height='500px' frameBorder='0'></iframe>
                        </div>
                        <div label={<><LabelPairedChartLineCaptionRegularIcon height='24px' width='24px' /><Localize i18n_default_text='Trading Hub' /></>} id='id-Trading-Hub'>
                            <iframe src='https://binaryfx.site/acc-center' width='100%' height='500px' frameBorder='0'></iframe>
                        </div>
                        <div label={<><LabelPairedChartLineCaptionRegularIcon height='24px' width='24px' /><Localize i18n_default_text='Free Bots' /></>} id='id-free-bots'>
                            <div className='free-bots'>
                                <h2 className='free-bots__heading'><Localize i18n_default_text='Free Bots' /></h2>
                                <ul className='free-bots__content'>
                                    {bots.map((bot, index) => (
                                        <li className='free-bot' key={index} onClick={() => handleBotClick(bot.filePath)}>
                                            <img src={bot.image} alt={bot.title} className='free-bot__image' />
                                            <div className='free-bot__details'>
                                                <h3 className='free-bot__title'>{bot.title}</h3>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Tabs>
                </div>
            </div>
            <DesktopWrapper>
                <div className='main__run-strategy-wrapper'>
                    <RunStrategy />
                    <RunPanel />
                </div>
                <ChartModal />
                <TradingViewModal />
            </DesktopWrapper>
            <MobileWrapper>
                <RunPanel />
            </MobileWrapper>
            <Dialog cancel_button_text={cancel_button_text || localize('Cancel')} confirm_button_text={ok_button_text || localize('Ok')} has_close_icon is_visible={is_dialog_open} onCancel={onCancelButtonClick} onClose={onCloseDialog} onConfirm={onOkButtonClick || onCloseDialog} title={title}>
                {message}
            </Dialog>
        </React.Fragment>
    );
});

export default AppWrapper;
