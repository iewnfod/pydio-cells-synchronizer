use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct CommandResponse<T: Default+Serialize> {
	success: bool,
	data: T,
	message: String
}

impl<T: Default+Serialize> CommandResponse<T> {
	pub fn ok(data: T) -> Self {
		Self { success: true, data, message: "".to_string() }
	}
	pub fn err(message: String) -> Self {
		Self { success: false, data: T::default(), message }
	}
}

impl<T: Default+Serialize> ToString for CommandResponse<T> {
	fn to_string(&self) -> String {
		json!(self).to_string()
	}
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct UserData {
	Uuid: String,
	Attributes: AttributeData
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct AttributeData {
	displayName: String,
	email: String,
	profile: String
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct BulkMetaData {
    Nodes: Vec<BulkNode>
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct BulkNode {
    Uuid: String,
	Path: String,
	Type: String,
	#[serde(default)]
	ETag: String,
	#[serde(default)]
	MetaStore: BulkMetaStore
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct BulkMetaStore {
	#[serde(default)]
	ws_label: String,
	#[serde(default)]
	ws_syncable: String,
	#[serde(default)]
	name: String
}

pub fn parse_json<'a, T: Default + Deserialize<'a>>(data: &'a str) -> T {
	let result: Result<T, serde_json::Error> = serde_json::from_str(data);
	match result {
		Ok(r) => r,
		Err(e) => {
			println!("Error parsing json: {}", e);
			T::default()
		}
	}
}
