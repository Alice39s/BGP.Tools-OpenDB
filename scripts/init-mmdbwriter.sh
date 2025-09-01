#!/bin/bash -e

GO_COMPILER="go"
MMDBWRITER_DIR="lib/mmdbwriter"
SOURCE_FILE="main.go"
OUTPUT_BINARY="mmdbwriter.bin"

SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../" && pwd)"

echo "[+] Project root: $PROJECT_ROOT"
echo "[+] Compiling $MMDBWRITER_DIR/$SOURCE_FILE..."

cd "$PROJECT_ROOT/$MMDBWRITER_DIR"

$GO_COMPILER build -o "$OUTPUT_BINARY" "$SOURCE_FILE"

if [ $? -ne 0 ]; then
    echo "[!] Compilation failed."
    exit 1
fi

echo "[+] Moving binary to project root..."

mv "$OUTPUT_BINARY" "$PROJECT_ROOT/"

if [ $? -ne 0 ]; then
    echo "[!] Moving failed."
    exit 1
fi

cd "$PROJECT_ROOT"

echo "[+] Granting executable permission to $OUTPUT_BINARY..."

chmod +x "$OUTPUT_BINARY"

if [ $? -ne 0 ]; then
    echo "[!] Permission setting failed."
    exit 1
fi

echo "[+] Script execution completed successfully!"
echo "[+] You can now run: ./$OUTPUT_BINARY"