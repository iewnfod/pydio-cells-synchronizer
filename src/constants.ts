import {randomNum} from "./Utils.ts";
import {TimeUnit} from "./interfaces.ts";

export const ASPECT_RATIO = 1/0.618;
export const SMALL_PART = 38.2;
export const LARGE_PART = 61.8;

export const PAD = 1.618;
export const PAD2 = PAD * 2;
export const PAD3 = PAD * 3;
export const PAD4 = PAD * 4;
export const PAD5 = PAD * 5;

export const BG_URL = `/bg/0${randomNum(1, 6)}.jpg`;

export const BASE_URL_STORAGE_KEY = 'baseUrl';
export const URL_PREFIX_STORAGE_KEY = 'urlPrefix';
export const PAT_STORAGE_KEY = 'pat';
export const USERNAME_STORAGE_KEY = 'username';
export const USER_DATA_STORAGE_KEY = 'userData';
export const TASKS_STORAGE_KEY = 'tasks';

export function getValueFromStorage(key: string, defaultValue: any) {
    return localStorage.getItem(key) || defaultValue;
}

export const MINUTE_UNIT: TimeUnit = {
    name: "minute",
    level: 60
}

export const HOUR_UNIT: TimeUnit = {
    name: "hour",
    level: 60 * 60
}

export const DAY_UNIT: TimeUnit = {
    name: "day",
    level: 60 * 60 * 24
}

export const UNITS: TimeUnit[] = [
    MINUTE_UNIT,
    HOUR_UNIT,
    DAY_UNIT
]
