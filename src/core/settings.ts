import type { InjectionKey, Ref } from 'vue'

/** The Settings header's search term, shared with the page that lists every settings module. */
export const SETTINGS_SEARCH: InjectionKey<Ref<string>> = Symbol('settings-search')
