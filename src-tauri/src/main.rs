// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(non_snake_case)]

mod net;
mod structs;
mod etag;
mod data;

use data::{get_saved_settings, save_settings};
use net::*;
use structs::{parse_json, Settings};
use tauri::{
    AppHandle, CustomMenuItem, Manager, RunEvent, SystemTray,
    SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, WindowEvent,
};

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

fn build_tray() -> SystemTray {
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show".to_string(), "Show Window").accelerator("Command+S"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit".to_string(), "Quit").accelerator("Command+Q"));

    SystemTray::new().with_menu(tray_menu)
}

fn tray_event(app_handle: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "quit" => {
                std::process::exit(0);
            }
            "show" => {
                let window = app_handle.get_window("main").unwrap();

                #[cfg(target_os = "macos")]
                tauri::AppHandle::show(&window.app_handle()).unwrap();

                #[cfg(target_os = "linux")]
                window.show().unwrap();

                window.set_focus().unwrap();
            }
            _ => {}
        },
        _ => {}
    }
}

fn main() {
    let settings = get_saved_settings();

    let mut builder = tauri::Builder::default()
        .setup(|app| {
            app.listen_global("update-settings", |event| {
                let data = event.payload().unwrap();
                let new_settings: Settings = parse_json(data);
                save_settings(new_settings);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            connect,
            list,
            login,
            sync,
            pause,
            progress,
            get_username,
            get_password,
            set_username,
            set_password
        ]);

    if settings.showTrayIcon {
        builder = builder
            .system_tray(build_tray())
            .on_system_tray_event(tray_event);
    }

    let mut app = builder.build(tauri::generate_context!()).unwrap();

    #[cfg(target_os="macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);

    app.run(main_loop);
}
