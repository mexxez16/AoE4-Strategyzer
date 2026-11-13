fn main() {
    // Set the current directory to ensure icon paths are resolved correctly
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    std::env::set_current_dir(&manifest_dir).expect("Failed to set current directory");

    tauri_build::build()
}
