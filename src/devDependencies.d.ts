
// This file is used to declare modules that are only used in development
// and are not included in the final build.
declare module 'lodash/debounce' {
    import { DebounceSettings, DebouncedFunc } from 'lodash';
    function debounce<T extends (...args: any[]) => any>(
        func: T,
        wait?: number,
        options?: DebounceSettings
    ): DebouncedFunc<T>;
    export default debounce;
}
