use md5::{Digest, Md5};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

pub fn calculate_etag(file_path: &Path) -> Result<String, std::io::Error> {
    let file = File::open(file_path)?;
    let mut reader = BufReader::new(file);
    let mut buffer = Vec::new();

    reader.read_to_end(&mut buffer)?;

    let mut md5 = Md5::new();
    md5.update(&buffer);
    let result = md5.finalize();

    let etag = format!("{:x}", result);

    Ok(etag)
}
