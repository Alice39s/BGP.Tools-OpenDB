# MMDB Writer

A Go program to convert ASN CSV files to MaxMind MMDB format for efficient IP address lookups.

## Features

- Converts ASN CSV data to MMDB format
- Supports IPv4 and IPv6 networks
- Progress tracking for large files
- Flexible CSV format support
- Error handling and validation

## Usage

```bash
# Compile the program
go build -o mmdbwriter

# Convert CSV to MMDB
./mmdbwriter <csv-file> [output-file]

# Example
./mmdbwriter asn-blocks.csv asn.mmdb
```

## CSV Format

The program supports CSV files with the following formats:

### Format 1: Network, ASN, Organization

```csv
network,asn,organization
1.0.0.0/24,13335,Cloudflare Inc
8.8.8.0/24,15169,Google LLC
```

### Format 2: Network, ASN only

```csv
network,asn
1.0.0.0/24,13335
8.8.8.0/24,15169
```

## MMDB Record Structure

Each record in the generated MMDB contains:

- `autonomous_system_number`: ASN number (uint32)
- `autonomous_system_organization`: ASN organization name (string, if available)

## Dependencies

- `github.com/maxmind/mmdbwriter`: MaxMind MMDB writer library
