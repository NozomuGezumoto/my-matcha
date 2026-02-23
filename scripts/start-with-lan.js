/**
 * 携帯で Expo に繋ぐため、PC の LAN IP を取得して
 * REACT_NATIVE_PACKAGER_HOSTNAME に設定してから expo start --lan を実行する。
 *
 * 理由: Expo は内部で lan-network で IP を取るが、失敗すると 127.0.0.1 になり、
 * QR が exp://127.0.0.1:8081 になってスマホから繋がらない。
 * このスクリプトで先に IP を決めて渡すと QR が exp://192.168.x.x:8081 になり繋がる。
 */
const os = require('os');
const { spawnSync } = require('child_process');

function getLanIp() {
  const ifaces = os.networkInterfaces();
  const prefer = ['192.168.', '10.']; // よくある LAN の先頭
  const candidates = [];
  for (const name of Object.keys(ifaces)) {
    if (/^(lo|Loopback|vEthernet|VMware|VirtualBox|vboxnet)/i.test(name)) continue;
    for (const info of ifaces[name]) {
      if (info.family !== 'IPv4' || info.internal) continue;
      candidates.push({ addr: info.address, name });
    }
  }
  for (const prefix of prefer) {
    const found = candidates.find((c) => c.addr.startsWith(prefix));
    if (found) return found.addr;
  }
  if (candidates.length) return candidates[0].addr;
  return null;
}

const ip = getLanIp();
if (ip) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = ip;
  console.log('Packager host: ' + ip + ' (QR/URL は exp://' + ip + ':8081 になります)\n');
} else {
  console.warn('LAN IP を取得できませんでした。127.0.0.1 のまま起動します。\n');
}

const r = spawnSync('npx', ['expo', 'start', '--lan'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
process.exit(r.status ?? 1);
