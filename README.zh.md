# BGP.Tools-OpenDB

🌍 **BGP.Tools-OpenDB** 提供每日更新的 BGP 数据打包版本，便于研究人员、开发者和网络工程师快速使用。

数据来自 [bgp.tools](https://bgp.tools) HTTP API，经过本项目使用 Node.js 整理并打包为多种格式。

---

简体中文 | [English version](./README.md)

---

## 📦 数据格式

### 压缩格式说明

- **发布版本(Release)**: 使用 `.xz` (高压缩率) 和 `.gz` (快速解压) 两种格式
- **自动更新分支(auto-update)**: 仅使用 `.gz` 格式以平衡存储空间和更新效率

### 全表归档 (Full-Table Archive)

#### `table.jsonl`

- **数据内容**: 全球路由表中所有前缀与起源 ASN 的映射关系
- **数据字段**:
  - `CIDR`: IP前缀 (IPv4/IPv6)
  - `ASN`: 起源 AS 编号
  - `Hits`: 在 BGP 路由表中的出现次数
- **数据来源**: [https://bgp.tools/table.jsonl](https://bgp.tools/table.jsonl)
- **样本数据**:
  ```jsonl
  {"CIDR":"2a0c:2f07:d::/48","ASN":206924,"Hits":509}
  {"CIDR":"2a0c:2f07:f::/48","ASN":206924,"Hits":508}
  {"CIDR":"185.230.223.0/24","ASN":206924,"Hits":1862}
  ```

#### `table.mmdb`

- **适用场景**: IP → ASN 快速查询
- **技术特点**:
  - 基于 [MaxMind DB (MMDB)](https://maxmind.github.io/MaxMind-DB/) 格式
  - 支持 IPv4/IPv6 双栈查询

### ASN 映射表 (ASN-Mapping Table)

#### `asns.csv`

- **数据字段**:
  - `asn`: AS编号 (格式: AS+数字)
  - `name`: AS注册名称
  - `class`: AS类型分类 (Unknown/Eyeball/Transit等)
  - `cc`: 国家代码 (IATA 3166-1 alpha-2)
- **典型应用**: ASN 信息展示、网络归属分析
- **样本数据**:
  ```csv
  asn,name,class,cc
  AS1,"Level 3 Parent, LLC",Unknown,US
  AS10,CSNET Coordination and Information Center (CSNET-CIC),Unknown,US
  AS100,FMC Central Engineering Laboratories,Unknown,US
  AS10000,Nagasaki Cable Media Inc.,Eyeball,JP
  ```

### ASN 标签数据 (ASN-Tags Data)

#### 标签索引 (`tags.txt`)

- **数据格式**: 每行一个标签定义，格式为 `标签名,数据数量`
- **典型标签分类**:
  - 网络类型: `dsl`, `mobile`, `satnet`
  - 服务类型: `cdn`, `vpn`, `anycast`
  - 组织机构: `gov`, `uni`, `corp`
- **样本数据**:
  ```txt
  perso,1337
  dsl,2735
  cdn,107
  a10k,1315
  vpn,769
  ```

#### 标签详情 (`tags-[tag-name].csv`)

- **数据格式**: 每行一个 ASN 记录，格式为 `ASN,AS名称`
- **典型应用**: 特定类型 ASN 筛选和分析
- **样本数据 (CDN标签)**:
  ```csv
  AS13335,"Cloudflare, Inc."
  AS395403,NSONE Inc
  AS16276,OVH SAS
  AS19551,Incapsula Inc
  ```

---

## ⏱ 工作流策略

### 存档数据 (Release)

- **更新频率**: 每日 `UTC 00:30` 自动打包
- **数据来源**: 从 `auto-update` 分支拉取最新数据

### 自动更新分支 (auto-update)

#### 路由表数据

- **更新频率**: 每 2 小时
- **版本保留**: 最多 24 个版本
- **元数据字段**:
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

---

## 🚀 使用方法

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- xz-utils (系统依赖)

### 基础命令

```bash
# 安装依赖
pnpm install

# 获取路由表数据 (约2-3分钟)
pnpm fetch:table

# 获取ASN映射数据 (约30秒)
pnpm fetch:asns

# 获取所有标签数据 (约1分钟)
pnpm fetch:tags

# 完整数据获取 (推荐)
pnpm fetch:all
```

### 高级用法


#### 开发模式

```bash
pnpm dev  # 监视模式自动更新
```

---

## 📚 相关资源

- [BGP.Tools](https://bgp.tools)
- [MaxMind DB](https://maxmind.github.io/MaxMind-DB/)
