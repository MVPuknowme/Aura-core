from app import app


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
