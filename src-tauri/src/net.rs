use std::{collections::{HashMap, VecDeque}, path::PathBuf, str::FromStr, sync::Mutex, thread::sleep, time::Duration};

use aws_config::{AppName, BehaviorVersion, Region, SdkConfig};
use aws_sdk_s3::{config::{Credentials, SharedCredentialsProvider}, error::SdkError, primitives::ByteStream, Client};
use lazy_static::lazy_static;
use serde_json::json;
use surf::StatusCode;
use tauri::async_runtime::JoinHandle;
use walkdir::WalkDir;

use crate::{etag::calculate_etag, structs::{parse_json, BulkMetaData, BulkNode, CommandResponse, SessionData, SyncTask, TaskData, TaskProgress, UserData}};

const BUCKET_NAME: &str = "io";

static mut ENDPOINT: String = String::new();
static mut USERNAME: String = String::new();
static mut PASSWORD: String = String::new();

lazy_static! {
	pub static ref SESSION: Mutex<SessionData> = Mutex::new(SessionData::default());
	pub static ref SYNC_HANDLERS: Mutex<HashMap<String, JoinHandle<()>>> = Mutex::new(HashMap::new());
	pub static ref SYNC_PROGRESS: Mutex<HashMap<String, TaskProgress>> = Mutex::new(HashMap::new());
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

async fn solve_res(res: Result<surf::Response, surf::Error>) -> Result<surf::Response, surf::Error> {
	println!("{:?}", res);
	match res {
		Ok(r) => Ok(r),
		Err(e) => {
			let status = e.status();
			if status == StatusCode::Unauthorized {
				refresh_login().await;
			}
			Err(e)
		}
	}
}

async fn post<T: ToString>(api: T, data: String) -> Result<surf::Response, surf::Error> {
	let endpoint = get_endpoint();

	println!("Posting {}{} with body: {}", &endpoint, api.to_string(), &data);
	let res = surf::post(format!("{}{}", &endpoint, api.to_string()))
		.body(data)
		.header("Authorization", format!("Bearer {}", get_jwt()))
		.send().await;

	solve_res(res).await
}

async fn post_without_bearer<T: ToString>(api: T, data: String) -> Result<surf::Response, surf::Error> {
	println!("Posting {}{} without bearer with body: {}", get_endpoint(), api.to_string(), &data);

	surf::post(format!("{}{}", &get_endpoint(), api.to_string()))
		.body(data)
		.send().await
}

async fn get<T: ToString>(api: T) -> Result<surf::Response, surf::Error> {
	let endpoint = get_endpoint();

	println!("Getting {}{}", &endpoint, api.to_string());
	let res = surf::get(format!("{}{}", &endpoint, api.to_string()))
		.header("Authorization", format!("Bearer {}", get_jwt()))
		.send().await;

	solve_res(res).await
}

#[tauri::command]
pub async fn connect(endpoint: String, username: String) -> String {
	unsafe {
		ENDPOINT = endpoint.clone();
		USERNAME = username.clone();
	}

	let res = get(format!("/a/user/{}", username.to_lowercase())).await;
	if res.is_ok() {
		let t = res.unwrap().body_string().await.unwrap();
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
		let t = res.unwrap().body_string().await.unwrap();
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
		PASSWORD = password.clone();
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
		let t = res.unwrap().body_string().await.unwrap();
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
pub async fn sync(task: TaskData, ignores: Vec<String>) -> String {
	let session = SESSION.lock().unwrap();
	let access_token = session.Token.AccessToken.clone();
	let id_token = session.Token.IDToken.clone();

	let handlers = SYNC_HANDLERS.lock().unwrap();
	for (uuid, handler) in handlers.iter() {
		if uuid == &task.uuid {
			if !handler.inner().is_finished() {
				println!("Task {} is already running", uuid);
				return CommandResponse::<()>::err("").to_string();
			} else {
				pause(uuid.clone());
				break;
			}
		}
	}
	drop(handlers);

	if !task.paused {
		let all_ignores = [&ignores.clone()[..], &task.ignores[..]].concat();
		let this_access_token = access_token.clone();
		let this_id_token = id_token.clone();
		let uuid = task.uuid.clone();
		println!("Sync Task {:?}", &task);
		let handler = tauri::async_runtime::spawn(async move {
			_sync(
				task.localDir,
				task.remoteDir,
				all_ignores,
				this_access_token,
				this_id_token,
				uuid
			).await;
		});
		let mut handlers = SYNC_HANDLERS.lock().unwrap();
		handlers.insert(task.uuid.clone(), handler);
	}

	CommandResponse::<()>::ok(()).to_string()
}

async fn _sync(
	local: String, remote: BulkNode, ignores: Vec<String>,
	access_token: String, id_token: String, uuid: String
) {
	let config = SdkConfig::builder()
		.endpoint_url(get_endpoint())
		.app_name(AppName::new("s3").unwrap())
		.behavior_version(BehaviorVersion::latest())
		.region(Region::new("auto"))
		.credentials_provider(
			SharedCredentialsProvider::new(
				Credentials::new(
					access_token,
					id_token,
					None, None,
					"cells"
				)
			)
		).build();

	let s3_client = Client::new(&config);

	let remote_path = remote.Path;
	let local_path = PathBuf::from_str(&local).unwrap();
	if !local_path.exists() {
		return ;
	}

	let walk = WalkDir::new(&local_path);
	let mut sync_tasks: VecDeque<SyncTask> = VecDeque::new();

	println!("Start to collect files for task {}", &uuid);
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

			sync_tasks.push_back(SyncTask { from: path.to_path_buf(), to: s3_path.clone() });
		}
	}

	new_progress(&uuid, sync_tasks.len());

	// upload
	'upload_loop: while let Some(sync_task) = sync_tasks.pop_front() {
		let body = ByteStream::from_path(&sync_task.from).await;
		if body.is_ok() {
			let this_node = post(
				"/a/meta/bulk/get",
				json!({
					"NodePaths": [
						&sync_task.to
					]
				}).to_string()
			).await;

			if let Ok(mut node) = this_node {
				let t = node.body_string().await.unwrap();
				let node_data: BulkMetaData = parse_json(&t);
				if node_data.Nodes.len() > 0 {
					let etag = calculate_etag(&sync_task.from);
					if let Ok(tag) = etag {
						if node_data.Nodes[0].Etag == tag {
							progress_add_one(&uuid);
							println!("Skip {:?}", sync_task.from);
							continue 'upload_loop;
						}
					}
				}
			}

			println!("Putting {} to {}", &sync_task.from.to_str().unwrap(), &sync_task.to);
			let res = s3_client
				.put_object()
				.bucket(BUCKET_NAME)
				.key(&sync_task.to)
				.body(body.unwrap())
				.send()
				.await;
			match res {
				Ok(_) => {
					progress_add_one(&uuid);
					println!("Success");
				},
				Err(e) => {
					println!("Failed: {:?}", &e);
					match e {
						SdkError::ServiceError(se) => {
							if se.err().meta().code().unwrap() == "AccessDenied" {
								refresh_login().await;
							}
						},
						_ => {}
					};
					sync_tasks.push_back(sync_task.clone());
				}
			}
			sleep(Duration::from_secs(1));
		} else {
			println!("Failed to read file: {:?}", &body.err());
		}
	}

	pause(uuid.clone());
}

fn progress_add_one(uuid: &str) {
	let mut progresses = SYNC_PROGRESS.lock().unwrap();
	if let Some(progress) = progresses.get_mut(uuid) {
		progress.current += 1;
	}
}

fn new_progress(uuid: &str, total: usize) {
	let mut progress = TaskProgress::default();
	progress.total = total;
	let mut progresses = SYNC_PROGRESS.lock().unwrap();
	progresses.insert(uuid.to_string(), progress);
}

#[tauri::command]
pub fn pause(uuid: String) -> String {
	let mut handlers = SYNC_HANDLERS.lock().unwrap();
	let mut task_progress = SYNC_PROGRESS.lock().unwrap();
	if let Some(handler) = handlers.get(&uuid) {
		handler.abort();
		println!("Pause task {}", &uuid);
		handlers.remove(&uuid);
		task_progress.remove(&uuid);
	}
	CommandResponse::<()>::ok(()).to_string()
}

#[tauri::command]
pub fn progress(uuid: String) -> String {
	let progresses = SYNC_PROGRESS.lock().unwrap();
	if let Some(progress) = progresses.get(&uuid) {
		if progress.current == progress.total && progress.total != 0 {
			pause(uuid.clone());
		}
		CommandResponse::ok(progress.clone()).to_string()
	} else {
		CommandResponse::<()>::err("").to_string()
	}
}

async fn refresh_login() {
	login(unsafe {
			ENDPOINT.clone()
		}, unsafe {
			USERNAME.clone()
		}, unsafe {
			PASSWORD.clone()
		}).await;
}
