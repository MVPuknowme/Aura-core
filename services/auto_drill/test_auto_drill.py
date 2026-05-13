from unittest.mock import patch

from app import app
from aws_compute_bridge import build_plan, load_config


def test_health():
    client = app.test_client()
    response = client.get('/health')
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['ok'] is True
    assert payload['service'] == 'SKYGRID Auto Drill'


def test_routes_recommend():
    client = app.test_client()
    response = client.get('/routes/recommend')
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['status'] == 'pilot'
    assert len(payload['recommended']) >= 1
    assert payload['recommended'][0]['score'] >= payload['recommended'][-1]['score']
    assert payload['recommended'][0]['actionType'] == 'reference_and_validation_only'


def test_routes_recommend_supports_objectives():
    client = app.test_client()
    response = client.get('/routes/recommend?objective=grants&limit=3')
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['objective'] == 'grants'
    assert len(payload['recommended']) == 3
    assert 'adjustedScore' in payload['recommended'][0]


def test_routes_auto_switch_is_recommendation_only():
    client = app.test_client()
    response = client.get('/routes/auto-switch?objective=reliability')
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['status'] == 'pilot'
    assert payload['strategy'] == 'Auto-switch route controller, recommendation-only'
    assert payload['decision']['actionType'] == 'recommendation_only'
    assert payload['decision']['publicSafe'] is True
    assert payload['decision']['activeRoute'] is not None


def test_auto_drill_aws_batch_plan_is_compute_only():
    env = {
        'AUTO_DRILL_AWS_PROVIDER': 'batch',
        'AUTO_DRILL_BATCH_JOB_QUEUE': 'auto-drill-queue',
        'AUTO_DRILL_BATCH_JOB_DEFINITION': 'auto-drill-job:1',
        'AUTO_DRILL_AWS_DRY_RUN': 'true',
        'AUTO_DRILL_OBJECTIVE': 'reliability',
    }
    with patch.dict('os.environ', env, clear=True):
        config, errors = load_config()
        assert errors == []
        plan = build_plan(config)

    assert plan['ok'] is True
    assert plan['dryRun'] is True
    assert plan['provider'] == 'batch'
    assert plan['awsPlan']['service'] == 'aws-batch'
    assert plan['awsPlan']['jobQueue'] == 'auto-drill-queue'
    assert plan['safety']['computeOnly'] is True
    assert plan['safety']['walletActions'] is False
    assert plan['safety']['bridgeTransfers'] is False
    assert plan['safety']['swaps'] is False
    assert plan['safety']['staking'] is False


def test_auto_drill_aws_ecs_plan_is_compute_only():
    env = {
        'AUTO_DRILL_AWS_PROVIDER': 'ecs',
        'AUTO_DRILL_ECS_CLUSTER': 'auto-drill-cluster',
        'AUTO_DRILL_ECS_TASK_DEFINITION': 'auto-drill-task:1',
        'AUTO_DRILL_ECS_SUBNETS': 'subnet-123,subnet-456',
        'AUTO_DRILL_ECS_SECURITY_GROUPS': 'sg-123',
        'AUTO_DRILL_CONTAINER_NAME': 'auto-drill',
        'AUTO_DRILL_AWS_DRY_RUN': 'true',
    }
    with patch.dict('os.environ', env, clear=True):
        config, errors = load_config()
        assert errors == []
        plan = build_plan(config)

    assert plan['provider'] == 'ecs'
    assert plan['awsPlan']['service'] == 'aws-ecs'
    assert plan['awsPlan']['cluster'] == 'auto-drill-cluster'
    assert plan['awsPlan']['networkConfiguration']['awsvpcConfiguration']['assignPublicIp'] == 'DISABLED'
    assert plan['safety']['computeOnly'] is True
    assert plan['safety']['hiddenMining'] is False


def test_dc_skygrid_reserve_activates_when_local_capacity_is_low():
    env = {
        'AUTO_DRILL_AWS_PROVIDER': 'batch',
        'AUTO_DRILL_BATCH_JOB_QUEUE': 'dc-skygrid-reserve-queue',
        'AUTO_DRILL_BATCH_JOB_DEFINITION': 'dc-skygrid-validator:1',
        'AUTO_DRILL_LOCAL_VALIDATOR_COUNT': '1',
        'AUTO_DRILL_MIN_LOCAL_VALIDATORS': '3',
        'AUTO_DRILL_DC_RESERVE_ENABLED': 'true',
        'AUTO_DRILL_DC_RESERVE_LABEL': 'dc-skygrid-reserve',
        'AUTO_DRILL_VALIDATION_SCOPE': 'route-health,token-metadata,exchange-reference',
        'AUTO_DRILL_AWS_DRY_RUN': 'true',
    }
    with patch.dict('os.environ', env, clear=True):
        config, errors = load_config()
        assert errors == []
        plan = build_plan(config)

    assert plan['capacityMode'] == 'dc_reserve'
    assert plan['reserveActive'] is True
    assert plan['reserveLabel'] == 'dc-skygrid-reserve'
    assert plan['localValidatorCount'] == 1
    assert plan['minLocalValidators'] == 3
    assert plan['validationScope'] == 'route-health,token-metadata,exchange-reference'
    assert plan['awsPlan']['jobName'] == 'skygrid-auto-drill-reserve'
    assert plan['safety']['referenceValidationOnly'] is True
    assert plan['safety']['exchangeExecution'] is False
    assert plan['safety']['walletActions'] is False
    assert plan['safety']['bridgeTransfers'] is False
    assert plan['safety']['swaps'] is False


def test_dc_skygrid_reserve_holds_when_local_capacity_is_sufficient():
    env = {
        'AUTO_DRILL_AWS_PROVIDER': 'batch',
        'AUTO_DRILL_BATCH_JOB_QUEUE': 'dc-skygrid-reserve-queue',
        'AUTO_DRILL_BATCH_JOB_DEFINITION': 'dc-skygrid-validator:1',
        'AUTO_DRILL_LOCAL_VALIDATOR_COUNT': '4',
        'AUTO_DRILL_MIN_LOCAL_VALIDATORS': '3',
        'AUTO_DRILL_DC_RESERVE_ENABLED': 'true',
        'AUTO_DRILL_AWS_DRY_RUN': 'true',
    }
    with patch.dict('os.environ', env, clear=True):
        config, errors = load_config()
        assert errors == []
        plan = build_plan(config)

    assert plan['capacityMode'] == 'local_first'
    assert plan['reserveActive'] is False
    assert plan['awsPlan']['jobName'] == 'skygrid-auto-drill'


def test_validation_config_disallows_unsafe_actions():
    client = app.test_client()
    response = client.get('/validation/config')
    assert response.status_code == 200
    payload = response.get_json()
    assert 'hiddenMining' in payload['disallowedActions']
    assert 'walletTransaction' in payload['disallowedActions']
    assert 'exchangeTrade' in payload['disallowedActions']
    assert 'automaticBridgeTransfer' in payload['disallowedActions']
    assert 'automaticSwap' in payload['disallowedActions']


def test_consent_requires_acceptance():
    client = app.test_client()
    response = client.post('/validation/consent', json={'accepted': False})
    assert response.status_code == 400

    response = client.post('/validation/consent', json={'accepted': True, 'participantId': 'pilot-test'})
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['ok'] is True
    assert payload['participantId'] == 'pilot-test'
