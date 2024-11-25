use std::sync::Mutex;

use lazy_static::lazy_static;
use notify_rust::Notification;

use crate::{data::get_saved_settings, PACKAGE_NAME};

lazy_static! {
	pub static ref ERRORS: Mutex<Vec<String>> = Mutex::new(Vec::new());
}

pub fn add_error<T: ToString>(err: T) {
	let str_err = err.to_string();
	let mut errors = ERRORS.lock().unwrap();
	errors.push(str_err.clone());

	let settings = get_saved_settings();
	if settings.notificationWhenFailed {
		let _ = Notification::new()
			.summary("Sync Error")
			.body(&str_err)
			.appname(PACKAGE_NAME)
			.show();
	}
}

#[tauri::command]
pub fn get_errors() -> Vec<String> {
	let errs_lock = ERRORS.lock().unwrap();
	let errs = errs_lock.clone();
	drop(errs_lock);
	errs
}

#[tauri::command]
pub fn pop_error() -> String {
	let mut errors = ERRORS.lock().unwrap();
	let err = errors.pop().unwrap_or_else(|| "".to_string());
	err
}

pub fn clear_errors() {
	let mut errors = ERRORS.lock().unwrap();
	errors.clear();
}
