import React from 'react';
import classNames from 'classnames';

import Text from '../text/text';

export type TLoadingProps = React.HTMLProps<HTMLDivElement> & {
    is_fullscreen: boolean;
    is_slow_loading: boolean;
    status: string[];
    theme: string;
};

const Loading = ({ className, id, is_fullscreen = true, is_slow_loading, status, theme }: Partial<TLoadingProps>) => {
    // Theme is now automatically determined from CSS variables, but we maintain the prop for backward compatibility
    const theme_class = 'barspinner-auto-theme';
    return (
        <div
            data-testid='dt_initial_loader'
            className={classNames(
                'initial-loader',
                {
                    'initial-loader--fullscreen': is_fullscreen,
                },
                className
            )}
        >
            <div id={id} className={classNames('initial-loader__barspinner', 'barspinner', theme_class)}>
                {Array.from(new Array(5)).map((x, inx) => (
                    <div
                        key={inx}
                        className={`initial-loader__barspinner--rect barspinner__rect barspinner__rect--${
                            inx + 1
                        } rect${inx + 1}`}
                    />
                ))}
            </div>
            {is_slow_loading &&
                status?.map((text, inx) => (
                    <Text as='h3' color='prominent' size='xs' align='center' key={inx}>
                        {text}
                    </Text>
                ))}
        </div>
    );
};

export default Loading;
