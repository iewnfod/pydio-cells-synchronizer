use md5::{Digest, Md5};
use std::fs::File;
use std::io::Read;
use std::path::Path;

pub fn calculate_etag(file_path: &Path) -> Result<String, std::io::Error> {
    let mut file = File::open(file_path)?;
    let mut buffer = [0u8; 1024];
    let mut md5 = Md5::new();

    while let Ok(bytes_read) = file.read(&mut buffer) {
        if bytes_read == 0 {
            break;
        }
        md5.update(&buffer[..bytes_read]);
    }

    let result = md5.finalize();

    let etag = format!("{:x}", result);

    Ok(etag)
}
