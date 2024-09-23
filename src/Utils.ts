import {invoke} from "@tauri-apps/api";
import toast from "react-hot-toast";

export function randomNum(minNum: number, maxNum: number){
    switch (arguments.length) {
        case 1:
            return parseInt(String(Math.random() * minNum + 1),10);
        case 2:
            return parseInt(String(Math.random() * (maxNum - minNum + 1) + minNum),10);
        default:
            return 0;
    }
}

export async function callBackend(name: string, args: any) {
    try {
        let res = JSON.parse(await invoke(name, args));
        if (res.success) {
            return res;
        } else {
            if (res.message.length > 0) {
                toast.error(res.message, {id: res.message});
            }
        }
    } catch {
        toast.error("Unknown Backend Error");
        throw "Unknown Backend Error";
    }
}
