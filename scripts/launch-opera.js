import { spawn } from 'child_process';

const operaPath = 'C:\\Users\\helli\\AppData\\Local\\Programs\\Opera GX\\opera.exe';
const userDataDir = 'C:\\Users\\helli\\AppData\\Roaming\\Opera Software\\Opera GX Stable\\Default';

const opera = spawn(operaPath, [`--user-data-dir=${userDataDir}`], {
  detached: true,
  stdio: 'ignore'
});

opera.unref();

console.log('Tentativa de iniciar o Opera GX. Verifique se o navegador abriu.');
