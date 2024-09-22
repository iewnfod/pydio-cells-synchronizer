// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(non_snake_case)]

mod net;
mod structs;

use net::*;
use tauri::{AppHandle, Manager, RunEvent, WindowEvent};

fn main_loop(app_handle: &AppHandle, event: RunEvent) {
    match event {
        RunEvent::WindowEvent { label, event, .. } => match event {
            WindowEvent::CloseRequested { api, .. } => {
                #[cfg(target_os = "macos")]
                tauri::AppHandle::hide(
                    &app_handle.get_window(label.as_str()).unwrap().app_handle(),
                )
                .unwrap();

                #[cfg(not(target_os = "macos"))]
                app_handle
                    .get_window(label.as_str())
                    .unwrap()
                    .hide()
                    .unwrap();

                api.prevent_close();
            }
            _ => {}
        },
        _ => {}
    }
}

fn main() {
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            connect,
            list,
            login,
            sync,
            pause
        ])
        .build(tauri::generate_context!()).unwrap();

    app.run(main_loop);
}
