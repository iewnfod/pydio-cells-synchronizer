use reqwest::{Error, Response};
use serde_json::json;

use crate::structs::{parse_json, BulkMetaData, CommandResponse, UserData};

static mut ENDPOINT: String = String::new();
static mut PAT: String = String::new();
static mut USERNAME: String = String::new();

fn get_endpoint() -> String {
	let mut endpoint = unsafe {
		ENDPOINT.clone()
	};

	if endpoint.ends_with("/") {
		endpoint = endpoint[0..endpoint.len()-1].to_string()
	}

	endpoint
}

fn get_pat() -> String {
	unsafe {
		PAT.clone()
	}
}

async fn post<T: ToString>(api: T, data: String) -> Result<Response, Error> {
	let client = reqwest::Client::new();
	let endpoint = get_endpoint();

	println!("Posting {} with body: {}", api.to_string(), &data);
	client.post(format!("{}{}", &endpoint, api.to_string()))
		.body(data)
		.bearer_auth(get_pat())
		.send().await
}

async fn get<T: ToString>(api: T) -> Result<Response, Error> {
	let client = reqwest::Client::new();
	let endpoint = get_endpoint();

	println!("Getting {}", api.to_string());
	client.get(format!("{}{}", &endpoint, api.to_string()))
		.bearer_auth(get_pat())
		.send().await
}

#[tauri::command]
pub async fn connect(endpoint: String, username: String, pat: String) -> String {
	unsafe {
		ENDPOINT = endpoint.clone();
		USERNAME = username.clone();
		PAT = pat.clone();
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
