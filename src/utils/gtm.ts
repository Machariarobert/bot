import { TStatistics } from '@/components/transaction-details/transaction-details.types';
import { ProposalOpenContract } from '@deriv/api-types';

declare global {
    interface Window {
        dataLayer?: any[];
    }
}

const GTM = (() => {
    const pushDataLayer = (data: Record<string, unknown>): void => {
        window.dataLayer?.push(data);
    };

    const init = () => {
        // TODO:  initialize GTM - STANDALONE
    };

    const onRunBot = (login_id: string, server_time: number, statistics: TStatistics): void => {
        try {
            const run_id = `${login_id}-${server_time}`;
            const counters = `tr:${statistics.number_of_runs},\
                ts:${statistics.total_stake},\
                py:${statistics.total_payout},\
                lc:${statistics.lost_contracts},\
                wc:${statistics.won_contracts},\
                pr:${statistics.total_profit}`;

            const data = {
                counters: counters.replace(/\s/g, ''),
                event: 'dbot_run',
                run_id,
            };
            pushDataLayer(data);
        } catch (error) {
            console.warn('Error pushing run data to datalayer ', error); // eslint-disable-line no-console
        }
    };

    const onTransactionClosed = (contract: ProposalOpenContract): void => {
        const data = {
            event: 'dbot_run_transaction',
            reference_id: contract.contract_id,
        };
        pushDataLayer(data);
    };

    return {
        init,
        pushDataLayer,
        onTransactionClosed,
        onRunBot,
    };
})();

export default GTM;
