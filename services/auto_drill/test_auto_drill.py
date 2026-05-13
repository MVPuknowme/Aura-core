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


def test_validation_config_disallows_unsafe_actions():
    client = app.test_client()
    response = client.get('/validation/config')
    assert response.status_code == 200
    payload = response.get_json()
    assert 'hiddenMining' in payload['disallowedActions']
    assert 'walletTransaction' in payload['disallowedActions']
    assert 'exchangeTrade' in payload['disallowedActions']


def test_consent_requires_acceptance():
    client = app.test_client()
    response = client.post('/validation/consent', json={'accepted': False})
    assert response.status_code == 400

    response = client.post('/validation/consent', json={'accepted': True, 'participantId': 'pilot-test'})
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['ok'] is True
    assert payload['participantId'] == 'pilot-test'
