"""
Aura-Core Sync Framework
Links Meshtastic nodes, Bluetooth discovery, and RF validation
for Proof-of-Locality and Real-World Operations Grid.
"""

import time
import json
from dataclasses import dataclass
from meshtastic.serial_interface import SerialInterface
import bluetooth

@dataclass
class DevicePresence:
    id: str
    rssi: int
    device_type: str
    timestamp: float
    signature: str

class AuraSync:
    def __init__(self, mesh_port="/dev/ttyUSB0"):
        self.mesh = SerialInterface(mesh_port)
        self.mesh_peers = {}
        self.bt_peers = {}
        self.presence_log = []

    # -----------------------
    # MESHTASTIC SYNC LOGIC
    # -----------------------
    def scan_mesh(self):
        nodes = self.mesh.nodes
        for node_id, node_data in nodes.items():
            entry = DevicePresence(
                id=node_id,
                rssi=node_data.get('rssi', -999),
                device_type="meshtastic",
                timestamp=time.
                name: Run Aura-Core

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      - name: Run main script
        run: |
          python main.py

