export interface UserData {
    Uuid: string,
    Attributes: {
        displayName: string,
        email: string,
        profile: string
    }
}

export const DEFAULT_USER_DATA: UserData = {
    Uuid: "",
    Attributes: {
        displayName: "",
        email: "",
        profile: ""
    }
}

export interface Task {
    uuid: string,
    localDir: string,
    ignores: string[],
    remoteDir: BulkNode,
    paused: boolean,
    repeatInterval: number,
    repeatIntervalUnit: TimeUnit
}

export interface BulkNode {
    Uuid: string,
    Path: string,
    Type: string,
    Etag: string,
    MetaStore: BulkMetaStore
}

export interface BulkMetaStore {
    ws_label: string,
    ws_syncable: boolean,
    name: string
}

export interface TimeUnit {
    name: string,
    level: number,
}

export interface Settings {
    startWithLogin: boolean,
    showTrayIcon: boolean,
    globalIgnores: string[],
    continueWhenUsingBattery: boolean,
    notificationWhenFailed: boolean,
    uploadThreadNumber: number
}
