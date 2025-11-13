# BGP.Tools-OpenDB

🌍 **BGP.Tools-OpenDB** provides daily updated BGP data packages for researchers, developers, and network engineers.

Data is sourced from [bgp.tools](https://bgp.tools) HTTP API, processed and packaged in multiple formats using Node.js.

---

[简体中文](./README.zh.md) | English version

---

## 📦 Data Formats

### Compression Format Specifications

- **Release Versions**: Use both `.xz` (high compression ratio) and `.gz` (fast decompression) formats
- **Auto-update Branch**: Uses only `.gz` format to balance storage space and update efficiency

### Full-Table Archive

#### `table.jsonl`

- **Data Content**: All prefix-to-origin ASN mappings from the global routing table
- **Data Fields**:
  - `CIDR`: IP prefix (IPv4/IPv6)
  - `ASN`: Origin AS number
  - `Hits`: Number of occurrences in BGP routing table
- **Data Source**: [https://bgp.tools/table.jsonl](https://bgp.tools/table.jsonl)
- **Sample Data**:

  ```jsonl
  {"CIDR":"2a0c:2f07:d::/48","ASN":206924,"Hits":509}
  {"CIDR":"2a0c:2f07:f::/48","ASN":206924,"Hits":508}
  {"CIDR":"185.230.223.0/24","ASN":206924,"Hits":1862}
  ```

#### `table.mmdb`

- **Use Case**: Fast IP → ASN lookup
- **Technical Features**:
  - Based on [MaxMind DB (MMDB)](https://maxmind.github.io/MaxMind-DB/) format
  - Supports both IPv4/IPv6 dual-stack queries

### ASN-Mapping Table

#### `asns.csv`

- **Data Fields**:
  - `asn`: AS number (format: AS+number)
  - `name`: AS registered name
  - `class`: AS type classification (Unknown/Eyeball/Transit, etc.)
  - `cc`: Country code (IATA 3166-1 alpha-2)
- **Typical Applications**: ASN information display, network attribution analysis
- **Sample Data**:

  ```csv
  asn,name,class,cc
  AS1,"Level 3 Parent, LLC",Unknown,US
  AS10,CSNET Coordination and Information Center (CSNET-CIC),Unknown,US
  AS100,FMC Central Engineering Laboratories,Unknown,US
  AS10000,Nagasaki Cable Media Inc.,Eyeball,JP
  ```

### ASN-Tags Data

#### Tag Index (`tags.txt`)

- **Data Format**: One tag definition per line, format: `tag_name,data_count`
- **Typical Tag Categories**:
  - Network Types: `dsl`, `mobile`, `satnet`
  - Service Types: `cdn`, `vpn`, `anycast`
  - Organizations: `gov`, `uni`, `corp`
- **Sample Data**:

  ```txt
  perso,1337
  dsl,2735
  cdn,107
  a10k,1315
  vpn,769
  ```

#### Tag Details (`tags-[tag-name].csv`)

- **Data Format**: One ASN record per line, format: `ASN,AS_name`
- **Typical Applications**: Filtering and analysis of specific ASN types
- **Sample Data (CDN tags)**:

  ```csv
  AS13335,"Cloudflare, Inc."
  AS395403,NSONE Inc
  AS16276,OVH SAS
  AS19551,Incapsula Inc
  ```

---

## ⏱ Workflow Strategy

### Archived Data (Release)

- **Update Frequency**: Daily automatic packaging at `UTC 00:30`
- **Data Source**: Pulls latest data from `auto-update` branch

### Auto-Update Branch

#### Routing Table Data

- **Update Frequency**: Every 2 hours
- **Version Retention**: Maximum 24 versions
- **Metadata Fields**:

  ```json
  {
    "timestamp": 1735689600,
    "version": "1.0",
    "hash_list": {
      "ipv4.jsonl": "<SHA256 Hash>",
      "ipv6.jsonl": "<SHA256 Hash>"
    }
  }
  ```

#### ASN Mapping Data

- **Update Frequency**: Daily
- **Version Retention**: Maximum 3 versions
- **Metadata Fields**: Similar structure as routing table data

#### ASN Tags Data

- **Update Frequency**: Daily
- **Version Retention**: Maximum 3 versions
- **Metadata Fields**: Similar structure as above, with individual metadata for each tag category

---

## 🚀 Usage

### Environment Requirements

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### Basic Commands

```bash
# Install dependencies
pnpm install

# Fetch routing table data (approximately 2-3 minutes)
pnpm fetch:table

# Fetch ASN mapping data (approximately 30 seconds)
pnpm fetch:asns

# Fetch all tags data (approximately 1 minute)
pnpm fetch:tags

# Fetch all data (recommended)
pnpm fetch:all
```

### Advanced Usage

#### Development Mode

```bash
pnpm dev  # Watch mode with automatic updates
```

---

## 📚 Related Resources

- [BGP.Tools](https://bgp.tools)
- [MaxMind DB](https://maxmind.github.io/MaxMind-DB/)
