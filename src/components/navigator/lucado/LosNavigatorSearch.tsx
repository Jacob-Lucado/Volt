import { NavigatorSearchResultSet } from '@volt/renderer';
import { FC, FormEvent, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, SearchFilterOptions } from '../../../api';
import { LosIcon } from '../../../common/lucadoos';
import { useNavigatorUiStore } from '../../../hooks';

/** The search row: what to search by, the text, and a refresh once a search is showing. */
export const LosNavigatorSearch: FC<{ searchResult: NavigatorSearchResultSet | null }> = ({ searchResult }) => {
    const [filterIndex, setFilterIndex] = useState(0);
    const [text, setText] = useState('');
    const version = useNavigatorUiStore((state) => state.searchResultVersion);
    const searched = (searchResult?.data ?? '').length > 0;

    // Mirrors the search the server answered, so a quick link or a tag click shows up in the box.
    useEffect(() => {
        if (!searchResult) return;

        const index = Math.max(
            0,
            SearchFilterOptions.findIndex((option) => option.query && searchResult.data.startsWith(option.query + ':'))
        );
        const query = SearchFilterOptions[index].query;

        setFilterIndex(index);
        setText(query ? searchResult.data.slice(query.length + 1) : searchResult.data);
    }, [searchResult, version]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const query = SearchFilterOptions[filterIndex]?.query;
        useNavigatorUiStore.getState().setFilter((query ? query + ':' : '') + text);
    };

    return (
        <form className="los-nav-search" onSubmit={submit}>
            <select
                className="los-select"
                value={filterIndex}
                aria-label={LocalizeText('navigator.tooltip.filter.input')}
                onChange={(event) => setFilterIndex(Number(event.target.value))}
            >
                {SearchFilterOptions.map((option, index) => (
                    <option key={option.name} value={index}>
                        {localizeWithFallback('navigator.filter.' + option.name, option.name)}
                    </option>
                ))}
            </select>
            <label className="los-nav-search__field">
                <LosIcon name="search" size={14} />
                <input
                    className="los-input"
                    name="q"
                    type="text"
                    value={text}
                    placeholder={LocalizeText('navigator.filter.input.placeholder')}
                    aria-label={LocalizeText('navigator.tooltip.filter.input')}
                    onChange={(event) => setText(event.target.value)}
                />
                {text.length > 0 && (
                    <button type="button" className="los-icon-button" aria-label={LocalizeText('generic.clear')} onClick={() => setText('')}>
                        <LosIcon name="close" size={12} />
                    </button>
                )}
            </label>
            {searched && (
                <button
                    type="button"
                    className="los-icon-button"
                    aria-label={LocalizeText('generic.refresh')}
                    title={LocalizeText('generic.refresh')}
                    onClick={() => useNavigatorUiStore.getState().requestSearch()}
                >
                    <LosIcon name="refresh" size={15} />
                </button>
            )}
        </form>
    );
};
