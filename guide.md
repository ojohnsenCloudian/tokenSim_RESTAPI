# 🧠 Automatic Token Simulator (ATS)

**Automatic Token Simulator (ATS)** is a tool that automatically attempts cluster expansion with the most optimal configuration.  
It allows a single configuration file to run tens or even hundreds of simulations with one command.

ATS simplifies the process by calculating both the **optimal number of nodes** to be added and the **storage capacity** for the new nodes.

---

## ⚙️ Overview

ATS is distributed as a single **Docker image** containing everything you need to run simulations — fully preconfigured and operational with just two commands.

---

## 🛠️ Setting Up the Tool

### 1. Load the Docker Image

Load the image into your local Docker repository:

```bash
docker load -i ./ats-runtime-0.0.1.tar.gz
```

---

### 2. Prepare a Directory

ATS writes files to a local directory.  
You’ll need to create one with **full permissions (777)**.

#### Windows
```bash
mkdir %USERPROFILE%\Documents\ats
icacls "%USERPROFILE%\Documents\ats" /grant Everyone:F /T
```

#### Linux
```bash
mkdir $HOME/Documents/ats
sudo chmod -R 777 $HOME/Documents/ats
```

#### macOS
```bash
mkdir ~/Documents/ats
sudo chmod -R 777 ~/Documents/ats
```

---

### 3. Start the Docker Container

```bash
docker run --detach --volume $HOME/Documents/ats:/home/ats/files \
-it --name ats-runtime --hostname="runtime" ats-runtime:0.0.1 sleep infinity
```

---

### 4. Start a Bash Shell

To enter the container:

```bash
docker exec -it ats-runtime /bin/bash
```

---

## 🚀 Using ATS

Once inside the container, check that ATS is available:

```bash
ats --help
```

**Output Example:**

```
Automatic Token Simulator (ATS)
Usage:
  ats [command]
Available Commands:
  add         Add nodes to a cluster
  manual      Manual run of token simulator
```

---

## 🧩 Key Commands

ATS has two main commands:

- `manual` — Runs the simulator manually (old format)
- `add` — Runs automated simulation with optimization

---

## 🧰 Command: `manual`

Runs ATS manually using the legacy configuration format.

Example config file:  
`/home/ats/docs/ManualConfigExample.yaml`

```yaml
customer_name: "test"
hss_ring_output: "/home/ats/files/ref/hsstool_ring.txt"
hss_status_output: "/home/ats/files/ref/hsstool_status.txt"
dc_for_nodes:
  - "dc-1;3;129;3,1;rack-1:3"
nodes_to_add:
  - "cloudian-node4:dc-1:rack-1"
  - "cloudian-node5:dc-1:rack-1"
  - "cloudian-node6:dc-1:rack-1"
region: "region-1"
cumulative: "false"
output_dir: "/home/ats/files/ref/gen/"
```

### Field Explanations

| Field | Description |
|-------|--------------|
| `customer_name` | Customer name |
| `hss_ring_output` | Path to HSS tool ring output file |
| `hss_status_output` | Path to HSS tool status output file |
| `dc_for_nodes` | Data center configuration |
| `nodes_to_add` | List of nodes to be added |
| `region` | Cluster region |
| `cumulative` | Boolean for cumulative addition |
| `output_dir` | Directory for generated outputs |

> ⚠️ All paths must be **relative to the Docker container**, not the host.

---

### Run Example

```bash
ats manual -c ./files/data/ref/conf.yaml
```

Example output:

```
****************** Start Customer Cluster Expansion Information ******************
Customer Name - test
Customer Region - region-1
...
For this storage policy, the simulation projects a good data balance.
```

---

## 🤖 Command: `add`

The `add` command provides automation and optimization capabilities.

Example config:  
`/home/ats/docs/AddConfigExample.yaml`

```yaml
name: Customer-0
preferredNumOfNodes: 3
preferredNodeRange: 3
preferredNodeRangeStep: 1
preferredNumOfTokens: 50
preferredTokenRange: 3
preferredTokenStep: 1
preferredNodeCapacity: 150
preferredNodeCapacityRange: 40
preferredNodeCapacityStep: 10
exclude:
  - 10.105.23.14
  - 10.123.41.24
ringFile: "/home/ats/files/ref/hsstool_ring.txt"
statusFile: "/home/ats/files/ref/hsstool_status.txt"
region: region-1
datacenters:
  - name: dc-1
    rack: "rack-1"
    storagePolicies:
      - name: "3"
        chunksInDC: 2
      - name: "3+2"
        chunksInDC: 3
  - name: dc-2
    storagePolicies:
      - name: "3+2"
outputDir: /home/ats/files/add/gen
```

---
