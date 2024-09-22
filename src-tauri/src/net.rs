use std::{path::PathBuf, str::FromStr, sync::Mutex};

use lazy_static::lazy_static;
use reqwest::{Error, Response};
use s3::{creds::Credentials, Bucket};
use serde_json::json;
use tauri::async_runtime::JoinHandle;
use walkdir::WalkDir;
use tokio::{fs::File, io::BufReader};

use crate::structs::{parse_json, BulkMetaData, BulkNode, CommandResponse, SessionData, SyncTask, TaskData, UserData};

static mut ENDPOINT: String = String::new();
static mut USERNAME: String = String::new();
lazy_static! {
	pub static ref SESSION: Mutex<SessionData> = Mutex::new(SessionData::default());
	pub static ref SYNC_HANDLERS: Mutex<Vec<(String, JoinHandle<()>)>> = Mutex::new(vec![]);
}

fn get_endpoint() -> String {
	let mut endpoint = unsafe {
		ENDPOINT.clone()
	};

	if endpoint.ends_with("/") {
		endpoint = endpoint[0..endpoint.len()-1].to_string()
	}

	endpoint
}

fn get_jwt() -> String {
	let session = SESSION.lock().unwrap();
	session.JWT.clone()
}

async fn post<T: ToString>(api: T, data: String) -> Result<Response, Error> {
	let client = reqwest::Client::new();
	let endpoint = get_endpoint();

	println!("Posting {} with body: {}", api.to_string(), &data);
	client.post(format!("{}{}", &endpoint, api.to_string()))
		.body(data)
		.bearer_auth(get_jwt())
		.send().await
}

async fn post_without_bearer<T: ToString>(api: T, data: String) -> Result<Response, Error> {
	let client = reqwest::Client::new();
	let endpoint = get_endpoint();

	println!("Posting {} without bearer with body: {}", api.to_string(), &data);
	client.post(format!("{}{}", &endpoint, api.to_string()))
		.body(data)
		.send().await
}

async fn get<T: ToString>(api: T) -> Result<Response, Error> {
	let client = reqwest::Client::new();
	let endpoint = get_endpoint();

	println!("Getting {}", api.to_string());
	client.get(format!("{}{}", &endpoint, api.to_string()))
		.bearer_auth(get_jwt())
		.send().await
}

#[tauri::command]
pub async fn connect(endpoint: String, username: String) -> String {
	unsafe {
		ENDPOINT = endpoint.clone();
		USERNAME = username.clone();
	}

	let res = get(format!("/a/user/{}", username.to_lowercase())).await;
	if res.is_ok() {
		let t = res.unwrap().text().await.unwrap();
		let data: UserData = parse_json(&t);

		CommandResponse::ok(data).to_string()
	} else {
		CommandResponse::<UserData>::err(
			res.err().unwrap().to_string()
		).to_string()
	}
}

#[tauri::command]
pub async fn list(p: String) -> String {
	let mut remote_path = p.clone();

	if remote_path.ends_with("/") {
		remote_path = p[0..p.len()-1].to_string();
	}

	let res = post(
		"/a/meta/bulk/get",
		json!({
			"NodePaths": [
				format!("{}/*", &remote_path)
			]
		}).to_string()
	).await;

	if res.is_ok() {
		let t = res.unwrap().text().await.unwrap();
		let data: BulkMetaData = parse_json(&t);

		CommandResponse::ok(data).to_string()
	} else {
		CommandResponse::<Vec<BulkMetaData>>::err(
			res.err().unwrap().to_string()
		).to_string()
	}
}

#[tauri::command]
pub async fn login(endpoint: String, username: String, password: String) -> String {
	unsafe {
		ENDPOINT = endpoint.clone();
		USERNAME = username.clone();
	}

	let res = post_without_bearer(
		"/a/frontend/session",
		json!({
			"AuthInfo": {
				"login": username.to_lowercase(),
				"password": password,
				"type": "credentials"
			}
		}).to_string()
	).await;

	if res.is_ok() {
		let t = res.unwrap().text().await.unwrap();
		if t.contains("Login failed") {
			return CommandResponse::<SessionData>::err(
				"Login failed"
			).to_string();
		}

		let data: SessionData = parse_json(&t);
		let mut session = SESSION.lock().unwrap();
		*session = data.clone();

		CommandResponse::ok(data).to_string()
	} else {
		CommandResponse::<SessionData>::err(
			res.err().unwrap().to_string()
		).to_string()
	}
}

#[tauri::command]
pub async fn sync(tasks: Vec<TaskData>, ignores: Vec<String>) -> String {
	let session = SESSION.lock().unwrap();
	let access_token = session.Token.AccessToken.clone();
	let id_token = session.Token.IDToken.clone();
	drop(session);

	for task in tasks {
		if !task.paused {
			let global_ignores = [&ignores.clone()[..], &task.ignores[..]].concat();
			let this_access_token = access_token.clone();
			let this_id_token = id_token.clone();
			println!("Sync Task {:?}", &task);
			let handler = tauri::async_runtime::spawn(async move {
				_sync(
					task.localDir,
					task.remoteDir,
					global_ignores,
					this_access_token,
					this_id_token
				).await;
			});
			let mut handlers = SYNC_HANDLERS.lock().unwrap();
			handlers.push((task.uuid.clone(), handler));
		}
	}

	CommandResponse::<()>::ok(()).to_string()
}

async fn _sync(local: String, remote: BulkNode, ignores: Vec<String>, access_token: String, id_token: String) {
	let bucket = Bucket::new(
		"io",
		s3::Region::Custom { region: "".to_string(), endpoint: get_endpoint() },
		Credentials::new(
			Some(&access_token),
			Some(&id_token),
			None,
			None,
			Some("s3")
		).unwrap()
	);
	if bucket.is_err() {
		return ;
	}
	let bucket = bucket.unwrap();

	let remote_path = remote.Path;
	let local_path = PathBuf::from_str(&local).unwrap();
	if !local_path.exists() {
		return ;
	}

	let walk = WalkDir::new(&local_path);
	let mut syncTasks: Vec<SyncTask> = vec![];

	'walk_loop: for p in walk {
		let p = p.unwrap();
		if p.file_type().is_file() {
			let path = p.path();
			for component in path.components() {
				let name = component.as_os_str().to_str().unwrap();
				let str_name = name.to_string();
				if ignores.contains(&str_name) {
					continue 'walk_loop;
				}
			}
			let partial_path = path.strip_prefix(&local_path).unwrap();
			let partial_path_str = partial_path.as_os_str().to_str();
			let s3_path = format!("{}/{}", &remote_path, partial_path_str.unwrap());
			syncTasks.push(SyncTask { from: path.to_path_buf(), to: s3_path.clone() });
		}
	}

	// upload
	for syncTask in syncTasks {
		let f = File::open(syncTask.from.clone()).await.unwrap();
		let mut reader = BufReader::new(f);
		println!("Put {:?} to \"{}/io/{}\"", &syncTask.from, get_endpoint(), &syncTask.to);
		let res = bucket.put_object_stream(
			&mut reader,
			syncTask.to.clone()
		).await;
		if res.is_ok() {
			println!("Success");
		} else {
			println!("Failed: {:?}", &res);
		}
	}
}

#[tauri::command]
pub fn pause(uuid: String) -> String {
	let mut handlers = SYNC_HANDLERS.lock().unwrap();
	for i in 0..handlers.len() {
		if let Some((task_uuid, handler)) = handlers.get(i) {
			if task_uuid == &uuid {
				handler.abort();
				println!("Pause task {}", &uuid);
				handlers.remove(i);
				return CommandResponse::<()>::ok(()).to_string();
			}
		}
	}

	CommandResponse::<()>::err("Task is not running").to_string()
}
