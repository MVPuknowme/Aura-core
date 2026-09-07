from app.bluetooth_debug import parse_bluetooth_log


def test_parser_separates_observed_from_interrogated_peripherals() -> None:
    log = """2026-08-29T09:58:10-07:00 AAAA peripheral discovered
2026-08-29T09:58:10-07:00 AAAA peripheral changed RSSI to -88
2026-08-29T09:58:11-07:00 BBBB peripheral discovered
2026-08-29T09:58:12-07:00 BBBB peripheral state changed to interrogating
2026-08-29T09:58:13-07:00 BBBB service with ID 1849 discovered
2026-08-29T09:58:14-07:00 BBBB characteristic with ID 2B93 discovered
2026-08-29T09:58:15-07:00 BBBB peripheral state changed to disconnected
"""

    report = parse_bluetooth_log(log)

    assert report["summary"] == {
        "peripherals": 2,
        "observed_only": 1,
        "interrogated": 1,
        "service_enumerated": 1,
    }
    assert report["peripherals"]["AAAA"]["classification"] == "observed_only"
    assert report["peripherals"]["AAAA"]["rssi"] == {
        "samples": 1,
        "strongest": -88,
        "weakest": -88,
        "average": -88.0,
    }
    assert report["peripherals"]["BBBB"]["classification"] == "service_enumerated"
    assert report["peripherals"]["BBBB"]["interrogations"] == 1
    assert report["peripherals"]["BBBB"]["disconnects"] == 1
    assert report["peripherals"]["BBBB"]["services"] == ["1849"]
    assert report["peripherals"]["BBBB"]["characteristics"] == ["2B93"]
