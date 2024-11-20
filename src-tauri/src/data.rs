use std::{fs::{create_dir_all, File, OpenOptions}, io::{Read, Write}, path::PathBuf, sync::Mutex};

use auto_launch::AutoLaunchBuilder;
use tauri::api::path::home_dir;
use lazy_static::lazy_static;

use crate::{structs::{parse_json, Settings}, PACKAGE_NAME};

const SETTINGS_FILE_NAME: &str = "settings.json";

lazy_static! {
	pub static ref SETTINGS: Mutex<Settings> = Mutex::new(Settings::default());
}

fn get_config_dir() -> PathBuf {
	let mut home = home_dir().unwrap();
	home.push(".config");
	home.push(PACKAGE_NAME);
	home
}

fn get_settings_path() -> PathBuf {
	let mut f = get_config_dir();
	f.push(SETTINGS_FILE_NAME);
	f
}

pub fn get_saved_settings() -> Settings {
	let p = get_settings_path();
	if p.exists() {
		let mut file = File::open(get_settings_path()).unwrap();
		let mut settings_string = String::new();
		file.read_to_string(&mut settings_string).unwrap();
		parse_json(&settings_string)
	} else {
		Settings::default()
	}
}

pub fn save_settings(new_settings: Settings) {
	// check auto startup
	let current_exe = std::env::current_exe().unwrap();
	let auto = AutoLaunchBuilder::new()
		.set_app_name("Pydio Cells Synchronizer")
		.set_app_path(current_exe.as_os_str().to_str().unwrap())
		.build().unwrap();

	if new_settings.startWithLogin {
		if !auto.is_enabled().unwrap() {
			println!("Enable start at login");
			auto.enable().unwrap();
		}
	} else {
		if auto.is_enabled().unwrap() {
			println!("Disable start at login");
			auto.disable().unwrap();
		}
	}

	// save to static
	let mut settings = SETTINGS.lock().unwrap();
	*settings = new_settings.clone();
	drop(settings);

	// save to file
	let settings_string = new_settings.clone().to_string();
	let save_path = get_settings_path();
	if !save_path.exists() {
		create_dir_all(save_path.parent().unwrap()).unwrap();
	}

	let mut file = OpenOptions::new()
		.write(true)
		.create(true)
		.truncate(true)
		.open(save_path.clone())
		.unwrap();

	file.write_all(settings_string.as_bytes()).unwrap();

	println!("Save settings to {:?}", &save_path);
}
