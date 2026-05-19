(() => {
  const statusEl = document.getElementById('device-status');
  if (!statusEl) return;

  const lastCheckedEl = document.getElementById('device-last-checked');
  const refreshButton = document.getElementById('device-status-refresh');

  function getDeviceClass() {
    const ua = navigator.userAgent || '';
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const width = window.innerWidth || document.documentElement.clientWidth || 0;

    if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua) || (coarsePointer && width >= 768 && width <= 1180)) {
      return 'tablet';
    }

    if (/Mobi|iPhone|Android.*Mobile/i.test(ua) || width < 768) {
      return 'mobile';
    }

    return 'desktop';
  }

  function canUseLocalStorage() {
    try {
      const key = 'skygrid_device_status_test';
      localStorage.setItem(key, 'ok');
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  async function pingSameOriginAsset() {
    try {
      const response = await fetch('status/health.json', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  function render({ online, assetReachable, storageReady, deviceClass, checkedAt }) {
    const connected = online && assetReachable;
    const statusText = connected ? 'Connected' : online ? 'Online, site asset unreachable' : 'Offline';

    statusEl.dataset.connected = String(connected);
    statusEl.dataset.deviceClass = deviceClass;
    statusEl.innerHTML = `
      <strong>${statusText}</strong>
      <dl class="device-status-grid" aria-label="Device connected status details">
        <div><dt>Device class</dt><dd>${deviceClass}</dd></div>
        <div><dt>Browser online</dt><dd>${online ? 'yes' : 'no'}</dd></div>
        <div><dt>Same-origin health ping</dt><dd>${assetReachable ? 'passed' : 'failed'}</dd></div>
        <div><dt>Local storage</dt><dd>${storageReady ? 'available' : 'unavailable'}</dd></div>
      </dl>
    `;

    if (lastCheckedEl) {
      lastCheckedEl.textContent = `Last checked: ${checkedAt.toLocaleString()}`;
      lastCheckedEl.dateTime = checkedAt.toISOString();
    }
  }

  async function updateDeviceStatus() {
    const checkedAt = new Date();
    const online = navigator.onLine !== false;
    const [assetReachable, storageReady] = await Promise.all([
      pingSameOriginAsset(),
      Promise.resolve(canUseLocalStorage()),
    ]);

    render({
      online,
      assetReachable,
      storageReady,
      deviceClass: getDeviceClass(),
      checkedAt,
    });
  }

  window.addEventListener('online', updateDeviceStatus);
  window.addEventListener('offline', updateDeviceStatus);
  window.addEventListener('resize', updateDeviceStatus);
  refreshButton?.addEventListener('click', updateDeviceStatus);

  updateDeviceStatus();
})();
